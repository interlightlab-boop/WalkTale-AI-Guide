import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, AlertCircle } from 'lucide-react';
import { Coordinates, AppLanguage } from '../types';

interface SearchBarProps {
  onLocationSelect: (coords: Coordinates, name: string) => void;
  language: AppLanguage;
  currentLocation: Coordinates;
}

declare const google: any;

const PLACEHOLDERS = {
  [AppLanguage.KOREAN]: "장소 검색 (예: 암사역)",
  [AppLanguage.ENGLISH]: "Search places...",
  [AppLanguage.JAPANESE]: "場所を検索 (例: 新宿)",
  [AppLanguage.CHINESE]: "搜索地点",
  [AppLanguage.VIETNAMESE]: "Tìm kiếm địa điểm",
  [AppLanguage.THAI]: "ค้นหาสถานที่",
  [AppLanguage.SPANISH]: "Buscar lugares...",
  [AppLanguage.FRENCH]: "Rechercher des lieux...",
  [AppLanguage.GERMAN]: "Orte suchen...",
  [AppLanguage.ARABIC]: "البحث عن الأماكن..."
};

const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelect, language, currentLocation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Google Services Refs
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const sessionToken = useRef<any>(null);
  
  // Helper for dummy element to init PlacesService
  const placesServiceDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        try {
            autocompleteService.current = new google.maps.places.AutocompleteService();
            if (placesServiceDiv.current) {
                placesService.current = new google.maps.places.PlacesService(placesServiceDiv.current);
            }
            sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        } catch (e) {
            console.error("Google Maps Places init failed", e);
        }
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setErrorMsg(null);
      return;
    }

    if (!autocompleteService.current) {
        // Retry init if not ready
        if ((window as any).google?.maps?.places) {
            autocompleteService.current = new google.maps.places.AutocompleteService();
        } else {
            return;
        }
    }

    setIsLoading(true);
    setIsOpen(true);
    setErrorMsg(null);

    const timer = setTimeout(() => {
        const request = {
            input: query,
            sessionToken: sessionToken.current,
            locationBias: {
                radius: 5000, 
                center: { lat: currentLocation.lat, lng: currentLocation.lng }
            },
            // We keep API language somewhat generic (en) to find global names, 
            // but Korean mode uses 'ko' for better local results in Korea.
            language: language === AppLanguage.KOREAN ? 'ko' : 'en',
        };

        autocompleteService.current.getPlacePredictions(request, (predictions: any[], status: any) => {
            setIsLoading(false);
            
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                setResults(predictions);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setResults([]);
            } else if (status === 'REQUEST_DENIED') {
                setResults([]);
                setErrorMsg("요청 거부됨: API 키 설정의 'API 제한' 목록에 'Places API'가 빠져있거나, 도메인 제한 설정이 맞지 않습니다.");
            } else {
                setResults([]);
                console.warn("Places API Status:", status);
            }
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [query, language, currentLocation]);

  const handleSelect = (prediction: any) => {
    if (!placesService.current) return;

    const request = {
        placeId: prediction.place_id,
        fields: ['name', 'geometry'], 
        sessionToken: sessionToken.current
    };

    placesService.current.getDetails(request, (place: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry && place.geometry.location) {
            const coords: Coordinates = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            
            onLocationSelect(coords, place.name || prediction.description);
            setQuery(place.name || prediction.description);
            setResults([]);
            setIsOpen(false);
            
            sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        }
    });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col items-center font-sans w-full">
      <div ref={placesServiceDiv} style={{ display: 'none' }}></div>
      <div className="relative w-full">
        <div 
            className="w-full bg-white rounded-[24px] shadow-md flex items-center px-4 h-12 border border-transparent focus-within:border-blue-500 focus-within:shadow-lg transition-all"
        >
            <div className="mr-3 text-gray-500">
                {isLoading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Search size={20} />}
            </div>
            <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[language] || "Search places..."}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-base min-w-0"
            />
            {query && (
                <button type="button" onClick={clearSearch} className="p-2 text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            )}
        </div>

        {/* Results Dropdown */}
        {isOpen && (results.length > 0 || errorMsg) && (
            <div className="absolute top-14 left-0 right-0 bg-white rounded-xl shadow-xl overflow-hidden py-2 max-h-[60vh] overflow-y-auto z-[2000]">
            
            {errorMsg && (
                <div className="px-4 py-3 text-red-600 bg-red-50 text-sm flex items-start gap-3">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <div className="leading-snug">
                        <strong>Places API 오류</strong>
                        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                    </div>
                </div>
            )}

            {results.map((prediction) => (
                <button
                key={prediction.place_id}
                onClick={() => handleSelect(prediction)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0"
                >
                <div className="mt-1 bg-gray-100 p-1.5 rounded-full flex-shrink-0">
                    <MapPin className="text-gray-500" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-[15px] truncate">
                    {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    <div className="text-xs text-gray-500 truncate line-clamp-1">
                    {prediction.structured_formatting?.secondary_text}
                    </div>
                </div>
                </button>
            ))}
            </div>
        )}
        
        {/* Powered by Google Footer */}
        {isOpen && results.length > 0 && !errorMsg && (
            <div className="absolute top-full right-2 mt-1">
                <img src="https://developers.google.com/maps/documentation/images/powered_by_google_on_white.png" alt="Powered by Google" className="h-4 opacity-80" />
            </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;