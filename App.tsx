
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MapComponent from './components/MapComponent';
import GuidePanel from './components/GuidePanel';
import SearchBar from './components/SearchBar';
import TopInfoBar from './components/TopInfoBar'; 
import OnboardingScreen from './components/OnboardingScreen';
import BatterySaverOverlay from './components/BatterySaverOverlay';
import PricingModal from './components/PricingModal';
import RestrictedRegionModal from './components/RestrictedRegionModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TestReportModal from './components/TestReportModal'; 

// ApiKeySetup component removed
import { Coordinates, PlaceOfInterest, AppLanguage, TourState, TourSessionReport } from './types';
import { 
    findNearbyInterestingPlace, 
    generateTourGreeting,
    generateArrivalGreeting,
    generateFillerNarration,
    speakText,
    stopSpeaking,
    initializeTTS, 
    initializeGemini, 
    testGeminiConnection, 
    getGeminiStatus,
    prepareAudio,
    resumeAudioContext,
    setTTSMode,
    startTrackingSession, 
    stopTrackingSession,
    waitForCurrentAudioToFinish,
    trackMapCall, 
    isAudioPlaying,
    enableBackgroundMode, 
    disableBackgroundMode 
} from './services/geminiService';
import { updateDistanceStat, logEvent } from './services/analyticsService';
import { Footprints, Loader2, Hand, TestTube, LocateFixed, Globe, Check, AlertTriangle, X, RouteOff, BedDouble, Play, Pause, Mic2, AlertOctagon } from 'lucide-react';

// Fix: Declare google namespace to resolve TypeScript errors
declare const google: any;

const GOOGLE_MAP_ID = "ef9a3a3ae0dea29cba1b55cd"; 

// 🔥 API KEY SETUP
// Priority: 1. Vite Environment Variable (Vercel) -> 2. Hardcoded Fallback (Dev)
// Fix for TS error: Property 'env' does not exist on type 'ImportMeta'
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

// --- TEST LOCATIONS ---
const MADRID_LOCATION = { lat: 40.4169, lng: -3.7035 }; // Madrid Sol
const SEOUL_LOCATION = { lat: 37.5636, lng: 126.9827 }; // Seoul

// --- CONFIG ---
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes Timeout (Strict for Real App)

// 🔥 TRIGGER CONFIG
const DISTANCE_TRIGGER_METERS = 120; // Move 120m to trigger Landmark
const GENERATION_TIMEOUT_MS = 45 * 1000; // Force reset generator if stuck for 45s
const MIN_SILENCE_DURATION_MS = 30 * 1000; // 30s cooldown between narrations

// Helper to convert AppLanguage to Google Maps Language Code
const getGoogleMapLanguageCode = (lang: AppLanguage): string => {
    switch (lang) {
        case AppLanguage.KOREAN: return 'ko';
        case AppLanguage.JAPANESE: return 'ja';
        case AppLanguage.CHINESE: return 'zh-CN';
        case AppLanguage.VIETNAMESE: return 'vi';
        case AppLanguage.THAI: return 'th';
        case AppLanguage.SPANISH: return 'es';
        case AppLanguage.FRENCH: return 'fr';
        case AppLanguage.GERMAN: return 'de';
        case AppLanguage.ARABIC: return 'ar';
        default: return 'en';
    }
};

const App: React.FC = () => {
  // ... (State initialization remains same) ...
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  // Test Mode State
  const [isTestMode, setIsTestMode] = useState(true); 
  const [isAutoPilot, setIsAutoPilot] = useState(false); 
  
  // Battery Saver State
  const [isBatterySaverMode, setIsBatterySaverMode] = useState(false);
  
  // Pricing State
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Analytics State
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Idle / Sleep Mode State
  const [showIdleModal, setShowIdleModal] = useState(false);
  
  // 🔥 NEW: Test Report State
  const [showReportModal, setShowReportModal] = useState(false);
  const [lastSessionReport, setLastSessionReport] = useState<TourSessionReport | null>(null);
  
  // 🔥 NEW: System Status Modal (for API debugging)
  const [showSystemStatusModal, setShowSystemStatusModal] = useState(false);
  const [connectionErrorMsg, setConnectionErrorMsg] = useState("");

  const sessionStartCoordsRef = useRef<Coordinates | null>(null);
  const sessionDistanceRef = useRef<number>(0);

  // Restricted Region State
  const [isInRestrictedArea, setIsInRestrictedArea] = useState(false);
  const [showRestrictedWarning, setShowRestrictedWarning] = useState(false);
  const [hasSeenRestrictedWarning, setHasSeenRestrictedWarning] = useState(false);
  const [pendingPricingAction, setPendingPricingAction] = useState(false); 

  const [currentLocation, setCurrentLocation] = useState<Coordinates>(MADRID_LOCATION);
  const [userLocationAccuracy, setUserLocationAccuracy] = useState<number>(0);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null); 
  // NEW: Movement Heading (Derived from GPS) for filtering POIs behind the user
  const [movementHeading, setMovementHeading] = useState<number | null>(null);
  
  const [mapCenter, setMapCenter] = useState<Coordinates>(MADRID_LOCATION);
  // NEW: Map Type State ('roadmap' or 'hybrid')
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationName, setDestinationName] = useState<string>("");
  const [isWalking, setIsWalking] = useState(false);
  const [isInitializingTour, setIsInitializingTour] = useState(false);
  const [pois, setPois] = useState<PlaceOfInterest[]>([]);
  const [activePoi, setActivePoi] = useState<PlaceOfInterest | null>(null);
  
  const [language, setLanguage] = useState<AppLanguage>(() => {
      // 🔥 FIX: Updated storage key to 'walktale_lang'
      const saved = localStorage.getItem('walktale_lang');
      const validLangs = Object.values(AppLanguage);
      if (saved && validLangs.includes(saved as any)) {
          return saved as AppLanguage;
      }
      return AppLanguage.ENGLISH;
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<AppLanguage | null>(null);

  // Routes State
  const [routePath, setRoutePath] = useState<Coordinates[]>([]);
  const [directionsResult, setDirectionsResult] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routeSource, setRouteSource] = useState<'GOOGLE' | 'OSRM' | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);

  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(false);
  const [forceMapCenter, setForceMapCenter] = useState(0); 

  // Refs
  const isWalkingRef = useRef(false);
  const lastPoiCheckRef = useRef<Coordinates>(MADRID_LOCATION); 
  const isGeneratingRef = useRef(false); 
  const lastApiCallTimeRef = useRef<number>(0);
  
  // 🔥 NEW: HARD BLOCK TIMESTAMP
  // We will NOT generate anything until Date.now() > cooldownUntilRef.current
  const cooldownUntilRef = useRef<number>(0);
  const lastGenerationTimeRef = useRef<number>(0);
  
  const lastContentSourceRef = useRef<'landmark' | 'story' | null>(null);
  const lastSignificantMoveTimeRef = useRef<number>(Date.now());
  const knownPoiNamesRef = useRef<string[]>([]);
  const knownFillerTopicsRef = useRef<string[]>([]);
  const fillerStepRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastCoordsRef = useRef<Coordinates | null>(null);
  const movementHeadingRef = useRef<number | null>(null); 
  const isArrivalHandledRef = useRef(false); 

  const [testTtsMode, setTestTtsMode] = useState<'standard' | 'neural'>('standard');

  useEffect(() => {
      // Validate Key
      if (!GOOGLE_MAPS_API_KEY) {
          alert("⚠️ API KEY MISSING! Please check Vercel Environment Variables (VITE_GOOGLE_MAPS_API_KEY).");
          return;
      }

      initializeTTS(GOOGLE_MAPS_API_KEY);
      initializeGemini(GOOGLE_MAPS_API_KEY);
      
      // 🔥 COST TRACKING: Map Load
      trackMapCall('map_load');

      setTimeout(async () => {
          const result = await testGeminiConnection();
          if (!result.success && result.error) {
              setConnectionErrorMsg(result.error);
              setShowSystemStatusModal(true);
          }
      }, 1000); 
  }, []);

  // 1. Load Google Maps Script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    const loadMapsScript = () => {
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
        if (existingScript) {
            if((window as any).google && (window as any).google.maps) {
                setIsGoogleMapsLoaded(true);
            }
            return;
        }

        const langCode = getGoogleMapLanguageCode(language); 
        console.log(`Loading Google Maps... Language: ${langCode}`);

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&language=${langCode}`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            setIsGoogleMapsLoaded(true);
        };
        
        script.onerror = () => {
            console.error("Failed to load Google Maps.");
            alert("Google Maps 로드 실패. 인터넷 연결을 확인하세요.");
        };

        (window as any).gm_authFailure = () => {
             console.error("Google Maps Auth Failure");
             alert("⚠️ 지도 API 인증 실패! API 키 설정을 확인하세요.");
        };

        document.head.appendChild(script);
    };

    loadMapsScript();
  }, []);

  // ... (Rest of the component remains exactly the same) ...
  // 2. Initial Location Logic
  useEffect(() => {
    if (isTestMode) {
        const loc = MADRID_LOCATION;
        setCurrentLocation(loc);
        setMapCenter(loc);
        setUserLocationAccuracy(10);
        lastPoiCheckRef.current = loc;
        lastCoordsRef.current = loc;
        lastSignificantMoveTimeRef.current = Date.now();
        
        // Initial Check for Restricted Region in Test Mode
        checkRestrictedRegion(loc);

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCurrentLocation(coords);
              setMapCenter(coords);
              setUserLocationAccuracy(pos.coords.accuracy);
              lastPoiCheckRef.current = coords;
              lastCoordsRef.current = coords;
              lastSignificantMoveTimeRef.current = Date.now();
              
              // Initial Check
              checkRestrictedRegion(coords);
            },
            (err) => {
                console.log("GPS Error, defaulting to Seoul");
                setCurrentLocation(SEOUL_LOCATION);
                setMapCenter(SEOUL_LOCATION);
                checkRestrictedRegion(SEOUL_LOCATION);
            },
            { enableHighAccuracy: true }
          );
        }
    }
  }, [isTestMode]);

  // Show gesture hint
  useEffect(() => {
    if (onboardingComplete) {
        setShowGestureHint(true);
        const timer = setTimeout(() => setShowGestureHint(false), 5000);
        return () => clearTimeout(timer);
    }
  }, [onboardingComplete]);

  // 🛡️ COST SAVING: IDLE WATCHDOG
  useEffect(() => {
    if (!isWalking) return;
    if (isAutoPilot) return;

    // 🔥 MODIFIED: Disable Idle Timeout in Test Mode (User Request)
    if (isTestMode) {
        return;
    }

    // In Real Mode, STRICT 15 min timeout to save money
    const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceMove = now - lastSignificantMoveTimeRef.current;

        if (timeSinceMove > IDLE_TIMEOUT_MS) {
            console.log("⚠️ IDLE DETECTED (15 min). Pausing Tour to save costs.");
            stopTour(); 
            setShowIdleModal(true);
        }
    }, 60000); 

    return () => clearInterval(interval);
  }, [isWalking, isAutoPilot, isTestMode]); 

  // Compass
  useEffect(() => {
      if (isTestMode) return;
      const handleOrientation = (event: DeviceOrientationEvent) => {
          let heading: number | null = null;
          if ((event as any).webkitCompassHeading) {
              heading = (event as any).webkitCompassHeading;
          } else if (event.alpha !== null) {
              heading = 360 - event.alpha;
          }
          if (heading !== null) {
              setDeviceHeading(heading);
              if (movementHeadingRef.current === null) {
                  movementHeadingRef.current = heading;
                  setMovementHeading(heading);
              }
          }
      };
      window.addEventListener('deviceorientation', handleOrientation, true);
      return () => {
          window.removeEventListener('deviceorientation', handleOrientation, true);
      };
  }, [isTestMode]);

  const requestWakeLock = async () => { try { if ('wakeLock' in navigator) { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); setWakeLockEnabled(true); wakeLockRef.current.addEventListener('release', () => { setWakeLockEnabled(false); }); } } catch (err) { console.error(`${err} - Wake Lock request failed`); } };
  const releaseWakeLock = async () => { if (wakeLockRef.current) { try { await wakeLockRef.current.release(); wakeLockRef.current = null; setWakeLockEnabled(false); } catch (err) { console.error(`${err} - Wake Lock release failed`); } } };

  // 🔥 POWERFUL RESUME LOGIC (APP SWITCH / PHONE CALL RECOVERY)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("🚀 App returned to foreground. Resuming Audio & Systems.");
        await resumeAudioContext();
        if (isWalkingRef.current) {
           enableBackgroundMode();
           await requestWakeLock();
           setTimeout(() => {
               console.log("🔄 Background return check: Triggering processNextContent...");
               processNextContent(); 
           }, 1000);
        }
      }
    };
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isWalking]);

  // 3. Real-time GPS Tracking
  useEffect(() => {
    if (isTestMode) return; 

    if (isWalking && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading, speed } = pos.coords;
          if (accuracy > 100 && lastCoordsRef.current) return; 
          const newCoords = { lat: latitude, lng: longitude };
          
          checkRestrictedRegion(newCoords);

          if (lastCoordsRef.current) {
              const dist = getDistance(lastCoordsRef.current, newCoords);
              if (dist > 5) { 
                  updateDistanceStat(dist);
                  lastSignificantMoveTimeRef.current = Date.now();
                  if (isWalking) {
                      sessionDistanceRef.current += dist;
                  }
              }
          }

          let currentHeading = heading;
          if ((!currentHeading || Number.isNaN(currentHeading)) && lastCoordsRef.current) {
               const dist = getDistance(lastCoordsRef.current, newCoords);
               if (dist > 5) { 
                   const y = Math.sin((newCoords.lng - lastCoordsRef.current.lng) * Math.PI / 180) * Math.cos(newCoords.lat * Math.PI / 180);
                   const x = Math.cos(lastCoordsRef.current.lat * Math.PI / 180) * Math.sin(newCoords.lat * Math.PI / 180) -
                             Math.sin(lastCoordsRef.current.lat * Math.PI / 180) * Math.cos(newCoords.lat * Math.PI / 180) * Math.cos((newCoords.lng - lastCoordsRef.current.lng) * Math.PI / 180);
                   let brng = Math.atan2(y, x) * 180 / Math.PI;
                   currentHeading = (brng + 360) % 360;
               }
          }
          if (currentHeading !== null && currentHeading !== undefined && !Number.isNaN(currentHeading)) {
              movementHeadingRef.current = currentHeading;
              setMovementHeading(currentHeading);
          }

          setCurrentLocation(newCoords);
          setUserLocationAccuracy(accuracy);
          lastCoordsRef.current = newCoords;
          setMapCenter(newCoords);

          // NOTE: We do NOT call processNextContent here anymore to avoid double-firing.
          // We rely on the Heartbeat Interval to pick up the new location.

          if (destination) {
              const distToDest = getDistance(newCoords, destination);
              if (distToDest < 50) {
                  handleArrival();
              } else {
                  checkRouteDeviation(newCoords);
                  updateRouteProgress(newCoords); 
              }
          }
        },
        (err) => console.error("GPS Tracking Error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      requestWakeLock();
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      releaseWakeLock();
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      releaseWakeLock();
    };
  }, [isWalking, destination, isTestMode]);

  // 🔥 NEW: HEARTBEAT SYSTEM (The Pulse of the App)
  // Replaces random setTimeout loops and ensures we check conditions regularly
  useEffect(() => {
      if (!isWalking) return;

      console.log("💓 Tour Heartbeat Started");
      const interval = setInterval(() => {
          processNextContent();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
  }, [isWalking]);

  const getDistance = (c1: Coordinates, c2: Coordinates) => {
    const R = 6371e3; 
    const φ1 = c1.lat * Math.PI/180;
    const φ2 = c2.lat * Math.PI/180;
    const Δφ = (c2.lat-c1.lat) * Math.PI/180;
    const Δλ = (c2.lng-c1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const shouldForceOSRM = (coords: Coordinates) => {
      const isKorea = (coords.lat >= 33 && coords.lat <= 39 && coords.lng >= 124 && coords.lng <= 132);
      const isChinaMainland = (coords.lat >= 18 && coords.lat <= 54 && coords.lng >= 73 && coords.lng <= 123);
      const isChinaNortheast = (coords.lat >= 40 && coords.lat <= 54 && coords.lng >= 123 && coords.lng <= 135);
      return isKorea || isChinaMainland || isChinaNortheast;
  };

  const checkRestrictedRegion = (coords: Coordinates) => {
      const isRestricted = shouldForceOSRM(coords);
      setIsInRestrictedArea(isRestricted);
      if (isRestricted && !hasSeenRestrictedWarning) {
          setShowRestrictedWarning(true);
          setHasSeenRestrictedWarning(true);
      }
  };

  const fetchRoute = (start: Coordinates, end: Coordinates) => {
      if (shouldForceOSRM(start)) {
          console.log("Restricted Region Detected (Korea/China): Using OSRM.");
          fetchRouteOSRM(start, end);
          return;
      }

      setIsRerouting(true);
      if ((window as any).google && (window as any).google.maps) {
          
          // 🔥 COST TRACKING: Directions API
          trackMapCall('directions');

          const directionsService = new google.maps.DirectionsService();
          directionsService.route({
              origin: start,
              destination: end,
              travelMode: google.maps.TravelMode.WALKING,
              avoidHighways: true,
              avoidTolls: true,
              avoidFerries: true,
          }, (result: any, status: any) => {
              setIsRerouting(false);
              if (status === google.maps.DirectionsStatus.OK && result.routes.length > 0) {
                  const leg = result.routes[0].legs[0];
                  setDirectionsResult(result);
                  const decodedPath = result.routes[0].overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
                  setRoutePath(decodedPath); 
                  setRouteSource('GOOGLE');
                  setRouteInfo({
                      distance: leg.distance.value,
                      duration: leg.duration.value
                  });
              } else {
                  console.warn("Google Route Failed, falling back to OSRM", status);
                  fetchRouteOSRM(start, end);
              }
          });
      } else {
          fetchRouteOSRM(start, end);
      }
  };

  // ... (fetchRouteOSRM, updateRouteProgress, checkRouteDeviation, getDistanceToSegment, handleLocationSelect - No Changes) ...
  const fetchRouteOSRM = async (start: Coordinates, end: Coordinates) => {
      setIsRerouting(true);
      try {
          const url = `https://router.project-osrm.org/route/v1/walking/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          setIsRerouting(false);
          if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coordinates = route.geometry.coordinates;
              const decodedPath: Coordinates[] = coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
              decodedPath.push(end);
              setRoutePath(decodedPath);
              setDirectionsResult(null);
              setRouteSource('OSRM');
              setRouteInfo({ distance: route.distance, duration: route.duration });
          } else {
              setRoutePath([start, end]);
              const dist = getDistance(start, end);
              setRouteInfo({ distance: dist, duration: dist / 1.4 });
              setRouteSource(null);
          }
      } catch (e) {
          console.error("Failed to fetch OSRM route", e);
          setIsRerouting(false);
          setRoutePath([start, end]);
          setRouteSource(null);
      }
  };

  const updateRouteProgress = (pos: Coordinates) => {
      if (!destination) return;
      let remainingDistance = 0;
      let pathToCheck = routePath;
      if (pathToCheck.length === 0 && directionsResult?.routes[0]?.overview_path) {
           pathToCheck = directionsResult.routes[0].overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
      }
      if (pathToCheck.length > 1) {
          let closestDist = Infinity;
          let closestIndex = 0;
          for(let i=0; i<pathToCheck.length-1; i++) {
              const d = getDistanceToSegment(pos, pathToCheck[i], pathToCheck[i+1]);
              if(d < closestDist) {
                  closestDist = d;
                  closestIndex = i;
              }
          }
          remainingDistance += getDistance(pos, pathToCheck[closestIndex+1]);
          for(let i=closestIndex+1; i<pathToCheck.length-1; i++) {
              remainingDistance += getDistance(pathToCheck[i], pathToCheck[i+1]);
          }
      } else {
          remainingDistance = getDistance(pos, destination);
      }
      setRouteInfo(prev => ({
          distance: remainingDistance,
          duration: remainingDistance / 1.3 
      }));
  };

  const checkRouteDeviation = (currentPos: Coordinates) => {
      if (!destination) return;
      if (isRerouting) return;
      let minDistance = Infinity;
      let pathToCheck: Coordinates[] = [];
      if (directionsResult && directionsResult.routes[0]) {
          const route = directionsResult.routes[0];
          if (route.overview_path) {
              pathToCheck = route.overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
          }
      } else if (routePath.length > 0) {
          pathToCheck = routePath;
      }
      if (pathToCheck.length === 0) return;
      for (let i = 0; i < pathToCheck.length - 1; i++) {
          const dist = getDistanceToSegment(currentPos, pathToCheck[i], pathToCheck[i+1]);
          if (dist < minDistance) minDistance = dist;
      }
      if (minDistance > 50) {
          console.log(`[Deviation Detected] ${Math.round(minDistance)}m off track. Rerouting...`);
          fetchRoute(currentPos, destination);
      }
  };

  const getDistanceToSegment = (p: Coordinates, v: Coordinates, w: Coordinates) => {
      const l2 = (v.lat - w.lat) ** 2 + (v.lng - w.lng) ** 2;
      if (l2 === 0) return getDistance(p, v);
      let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projection = {
          lat: v.lat + t * (w.lat - v.lat),
          lng: v.lng + t * (w.lng - v.lng)
      };
      return getDistance(p, projection);
  };

  const handleLocationSelect = (coords: Coordinates, name: string) => {
      setDestination(coords);
      setDestinationName(name);
      setRouteInfo(null);
      fetchRoute(currentLocation, coords);
  };

  // ... (getBearing, processNextContent, startTour, resumeTour - No Changes) ...
  const getBearing = (start: Coordinates, end: Coordinates): number => {
      const startLat = start.lat * Math.PI/180; const startLng = start.lng * Math.PI/180;
      const destLat = end.lat * Math.PI/180; const destLng = end.lng * Math.PI/180;
      const y = Math.sin(destLng - startLng) * Math.cos(destLat);
      const x = Math.cos(startLat)*Math.sin(destLat) - Math.sin(startLat)*Math.cos(destLat)*Math.cos(destLng - startLng);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const processNextContent = async () => {
      // 🛡️ Safety check
      if (!isWalkingRef.current) return;
      
      // 🛡️ Safety Unlock (Zombie Generator)
      if (isGeneratingRef.current) {
          if (Date.now() - lastApiCallTimeRef.current > GENERATION_TIMEOUT_MS) {
             console.warn("⚠️ Resetting stuck generator flag (Timeout)");
             isGeneratingRef.current = false;
          } else {
             return; // Still validly generating
          }
      }

      // 🔥 STRICT OVERLAP PREVENTION (Audio Playing)
      if (isAudioPlaying()) return;

      // 🔥 NEW: ABSOLUTE COOLDOWN BLOCK
      if (Date.now() < cooldownUntilRef.current) return;

      // 🔥 FIX: HARD LOCK for 15s after any successful generation
      if (Date.now() - lastGenerationTimeRef.current < 15000) return;

      const currentPos = lastCoordsRef.current || currentLocation;
      const distFromLastExplanation = getDistance(currentPos, lastPoiCheckRef.current);
      // const timeSinceLastExplanation = Date.now() - lastGenerationTimeRef.current; // UNUSED VARIABLE REMOVED
      
      // 🔥 ABSOLUTE DISTANCE RULE: 120 METERS
      // Except for the very first run (start of tour)
      const isFirstRun = knownPoiNamesRef.current.length === 0 && knownFillerTopicsRef.current.length === 0;
      
      // 🔥 SINGLE TRIGGER LOGIC (Requested by User):
      // 1. Moved > 120m (Landmark Priority)
      let shouldTrigger = false;
      let preferredMode: 'LANDMARK' | 'STORY' = 'LANDMARK';

      if (isFirstRun) {
          shouldTrigger = true;
          preferredMode = 'LANDMARK';
      } else if (distFromLastExplanation >= DISTANCE_TRIGGER_METERS) {
          shouldTrigger = true;
          preferredMode = 'LANDMARK';
          console.log(`🚀 TRIGGER: Distance (${Math.round(distFromLastExplanation)}m)`);
      }

      if (!shouldTrigger) return;

      // If we are here, we have a go.
      isGeneratingRef.current = true;
      lastApiCallTimeRef.current = Date.now();
      
      try {
          const allPreviousTopics = [...knownPoiNamesRef.current, ...knownFillerTopicsRef.current];
          let effectiveHeading = movementHeadingRef.current;
          if (effectiveHeading === null && destination) {
              effectiveHeading = getBearing(currentPos, destination);
          }
          
          let searchMode: 'LANDMARK' | 'STORY' = preferredMode;
          // Alternate if not strictly time-based
          if (preferredMode === 'LANDMARK') {
              if (lastContentSourceRef.current === 'landmark') searchMode = 'STORY';
              else searchMode = 'LANDMARK';
          }
          
          if (searchMode === 'LANDMARK') {
             const previousLocations = pois.map(p => p.location);
             let poi = await findNearbyInterestingPlace(currentPos, language, allPreviousTopics, effectiveHeading, 500, previousLocations);
              if (!poi) {
                  poi = await findNearbyInterestingPlace(currentPos, language, allPreviousTopics, effectiveHeading, 1000, previousLocations);
              }
              if (poi) {
                  if (!isWalkingRef.current) return;

                  lastPoiCheckRef.current = currentPos; 
                  setPois(prev => [...prev, poi!]); 
                  setActivePoi(poi);
                  knownPoiNamesRef.current.push(poi.name);
                  lastContentSourceRef.current = 'landmark'; 
                  await speakText(poi.description, language, poi.name);
                  
                  cooldownUntilRef.current = Date.now() + MIN_SILENCE_DURATION_MS;
                  lastGenerationTimeRef.current = Date.now(); 
              } else {
                  // Fallback to story if no landmark
                  const filler = await generateFillerNarration(currentPos, language, allPreviousTopics, fillerStepRef.current, effectiveHeading);
                  if (filler) {
                      if (!isWalkingRef.current) return;

                      lastPoiCheckRef.current = currentPos; 
                      knownFillerTopicsRef.current.push(filler.topic);
                      const fillerPoi: PlaceOfInterest = {
                          name: filler.topic, description: filler.text, category: 'history', location: currentPos, imageUrl: undefined, wikipediaUrl: filler.wikiUrl 
                      };
                      setActivePoi(fillerPoi);
                      lastContentSourceRef.current = 'story'; 
                      await speakText(filler.text, language, filler.topic);
                      
                      cooldownUntilRef.current = Date.now() + MIN_SILENCE_DURATION_MS;
                      lastGenerationTimeRef.current = Date.now(); 
                      fillerStepRef.current = (fillerStepRef.current + 1);
                  }
              }
          }
          else if (searchMode === 'STORY') {
              const filler = await generateFillerNarration(currentPos, language, allPreviousTopics, fillerStepRef.current, effectiveHeading);
              if (filler) {
                  if (!isWalkingRef.current) return;

                  lastPoiCheckRef.current = currentPos; 
                  knownFillerTopicsRef.current.push(filler.topic);
                  const fillerPoi: PlaceOfInterest = {
                      name: filler.topic, description: filler.text, category: 'history', location: currentPos, imageUrl: undefined, wikipediaUrl: filler.wikiUrl 
                      };
                  setActivePoi(fillerPoi);
                  lastContentSourceRef.current = 'story'; 
                  await speakText(filler.text, language, filler.topic);
                  
                  cooldownUntilRef.current = Date.now() + MIN_SILENCE_DURATION_MS;
                  lastGenerationTimeRef.current = Date.now(); 
                  fillerStepRef.current = (fillerStepRef.current + 1);
              } else {
                  // If story fails, maybe try landmark? or just wait.
                  lastContentSourceRef.current = 'story'; 
                  // Reset timer so we try again sooner than 3 mins if failed? No, keep it calm.
              }
          }
      } catch (e) {
          console.error("Error in tour loop", e);
          cooldownUntilRef.current = Date.now() + 10000;
      } finally {
          isGeneratingRef.current = false;
      }
  };

  const startTour = async () => {
    if (!destination) return;
    await prepareAudio();
    enableBackgroundMode(); // 🔥 Start Silent Loop
    setIsInitializingTour(true);
    setIsWalking(true);
    isWalkingRef.current = true; 
    isArrivalHandledRef.current = false; 
    lastPoiCheckRef.current = currentLocation; 
    lastSignificantMoveTimeRef.current = Date.now(); 
    fillerStepRef.current = 0; 
    lastApiCallTimeRef.current = Date.now(); 
    
    // Reset Cooldown
    cooldownUntilRef.current = 0;
    
    lastContentSourceRef.current = null; 
    startTrackingSession();
    sessionStartCoordsRef.current = currentLocation;
    sessionDistanceRef.current = 0;
    logEvent('TOUR_START', { location: currentLocation });
    try {
        const greeting = await generateTourGreeting(destinationName, language);
        setIsInitializingTour(false);
        await speakText(greeting, language, "Let's Go");
        
        // 🔥 Set initial cooldown after greeting
        cooldownUntilRef.current = Date.now() + MIN_SILENCE_DURATION_MS;
        lastGenerationTimeRef.current = Date.now();
        
        // Kickstart check immediately after greeting finishes (handled by loop)
    } catch (error) {
        setIsInitializingTour(false);
    }
  };

  const resumeTour = () => {
      setShowIdleModal(false);
      startTour();
  };

  const handleArrival = async () => {
      if (!destination || isArrivalHandledRef.current) return;
      isArrivalHandledRef.current = true; 
      
      console.log("📍 ARRIVED at destination!");
      setIsWalking(false);
      isWalkingRef.current = false; // 🔥 Stop new content generation immediately
      setIsAutoPilot(false); 
      disableBackgroundMode(); // 🔥 Stop Silent Loop
      
      if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }

      const destName = destinationName;
      const destCoords = destination;
      const lang = language;
      
      const arrivalGreetingPromise = generateArrivalGreeting(destName, destCoords, lang);
      await waitForCurrentAudioToFinish();
      
      try {
          const text = await arrivalGreetingPromise;
          await speakText(text, lang, "You have arrived");
          setActivePoi({ name: destName, description: text, category: 'other', location: destCoords, imageUrl: undefined });
      } catch (e) { }
      
      const aiSessionData = stopTrackingSession();
      const report: TourSessionReport = {
          stats: {
              totalLlmInputTokens: aiSessionData.stats.totalLlmInputTokens,
              totalLlmOutputTokens: aiSessionData.stats.totalLlmOutputTokens,
              totalTtsCharacters: aiSessionData.stats.totalTtsCharacters,
              totalApiRequestCount: aiSessionData.stats.totalApiRequestCount,
              mapsUsage: aiSessionData.stats.mapsUsage // 🔥 Include Maps Stats
          },
          ttsMode: aiSessionData.ttsMode,
          narrations: aiSessionData.logs,
          totalDistanceMeters: sessionDistanceRef.current,
          startTime: aiSessionData.stats.startTime,
          endTime: Date.now(),
          durationSeconds: (Date.now() - aiSessionData.stats.startTime) / 1000
      };
      setLastSessionReport(report);
      setShowReportModal(true);
      logEvent('TOUR_END', { location: destination });
      setRoutePath([]);
      setDirectionsResult(null);
  };

  const stopTour = () => {
    stopSpeaking();
    disableBackgroundMode(); // 🔥 Stop Silent Loop
    if (isWalking) {
        const aiSessionData = stopTrackingSession();
        setLastSessionReport({
            stats: {
                totalLlmInputTokens: aiSessionData.stats.totalLlmInputTokens,
                totalLlmOutputTokens: aiSessionData.stats.totalLlmOutputTokens,
                totalTtsCharacters: aiSessionData.stats.totalTtsCharacters,
                totalApiRequestCount: aiSessionData.stats.totalApiRequestCount,
                mapsUsage: aiSessionData.stats.mapsUsage // 🔥 Include Maps Stats
            },
            ttsMode: aiSessionData.ttsMode,
            narrations: aiSessionData.logs,
            totalDistanceMeters: sessionDistanceRef.current,
            startTime: aiSessionData.stats.startTime,
            endTime: Date.now(),
            durationSeconds: (Date.now() - aiSessionData.stats.startTime) / 1000
        });
        setShowReportModal(true);
    }
    setIsWalking(false);
    isWalkingRef.current = false; 
    setIsInitializingTour(false);
    setDestination(null);
    setDestinationName("");
    setRoutePath([]);
    setDirectionsResult(null);
    setRouteInfo(null);
    setRouteSource(null);
    setPois([]);
    setActivePoi(null);
    knownPoiNamesRef.current = [];
    knownFillerTopicsRef.current = [];
    setMapCenter(currentLocation);
    setIsBatterySaverMode(false); 
    lastContentSourceRef.current = null;
    setIsAutoPilot(false); 
    logEvent('TOUR_END', { location: currentLocation });
  };

  // ... (manualStep, auto-walk effect, updateLocation, calculateNextPositionOnPath, handleMapClick, confirmLanguageChange, handleOpenPricing, RestrictedRegion handlers - No Changes) ...
  const manualStep = (mode: 'ROUTE' | 'DEVIATE', distanceOverride?: number) => {
      const STEP_METERS = distanceOverride || 140; 
      
      if (mode === 'ROUTE') {
        let path: Coordinates[] = [];
        if (directionsResult && directionsResult.routes && directionsResult.routes[0]) {
            const rawPath = directionsResult.routes[0].overview_path;
            path = rawPath.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
        } else if (routePath.length > 0) {
            path = routePath;
        }
        if (path.length === 0 || !destination) {
            if (destination) {
               const target = destination;
               const STEP_SIZE_DEG = (STEP_METERS / 111000); 
               const angle = Math.atan2(target.lat - currentLocation.lat, target.lng - currentLocation.lng);
               const newPos = { lat: currentLocation.lat + Math.sin(angle) * STEP_SIZE_DEG, lng: currentLocation.lng + Math.cos(angle) * STEP_SIZE_DEG };
               updateLocation(newPos);
            } else {
               const deviation = (STEP_METERS / 111000);
               const newPos = { lat: currentLocation.lat + deviation, lng: currentLocation.lng + deviation };
               updateLocation(newPos);
            }
            return;
        }
        const nextPos = calculateNextPositionOnPath(currentLocation, path, STEP_METERS);
        updateLocation(nextPos);
      } else {
          const deviation = (STEP_METERS / 111000); 
          const newPos = { lat: currentLocation.lat + deviation, lng: currentLocation.lng + deviation };
          updateLocation(newPos);
      }
      if (!distanceOverride) {
          setForceMapCenter(prev => prev + 1);
      }
  };

  const updateLocation = (newPos: Coordinates) => {
      if (lastCoordsRef.current) {
           const y = Math.sin((newPos.lng - lastCoordsRef.current.lng) * Math.PI / 180) * Math.cos(newPos.lat * Math.PI / 180);
           const x = Math.cos(lastCoordsRef.current.lat * Math.PI / 180) * Math.sin(newPos.lat * Math.PI / 180) -
                     Math.sin(lastCoordsRef.current.lat * Math.PI / 180) * Math.cos(newPos.lat * Math.PI / 180) * Math.cos((newPos.lng - lastCoordsRef.current.lng) * Math.PI / 180);
           let brng = Math.atan2(y, x) * 180 / Math.PI;
           const heading = (brng + 360) % 360;
           setMovementHeading(heading);
           movementHeadingRef.current = heading;
           const dist = getDistance(lastCoordsRef.current, newPos);
           updateDistanceStat(dist);
           if (dist > 0.5) lastSignificantMoveTimeRef.current = Date.now();
            if (isWalking) {
                sessionDistanceRef.current += dist;
            }
      }
      checkRestrictedRegion(newPos);
      setCurrentLocation(newPos);
      setMapCenter(newPos);
      lastCoordsRef.current = newPos; 
      if (destination) {
          const distToDest = getDistance(newPos, destination);
          if (distToDest < 50) { 
              handleArrival();
          } else {
              checkRouteDeviation(newPos);
              updateRouteProgress(newPos); 
          }
      }
  };
  
  // 🔥🔥🔥 BACKGROUND AUTO-PILOT LOGIC (WEB WORKER) 🔥🔥🔥
  // Creates a separate thread that isn't throttled by the browser tab when backgrounded.
  
  // Ref to always hold the latest manualStep function (to avoid stale state in Worker callback)
  const manualStepRef = useRef(manualStep);
  useEffect(() => {
    manualStepRef.current = manualStep;
  });

  useEffect(() => {
    // Only run if Test Mode + Auto Pilot + Destination is set
    if (!isTestMode || !isAutoPilot || !destination) return;

    // 1. Create a Blob for the Worker Code
    const workerCode = `
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          // This interval runs in a separate thread, safe from main-thread throttling
          interval = setInterval(() => {
            self.postMessage('tick');
          }, 1000); // 1-second ticks
        } else if (e.data === 'stop') {
          if (interval) clearInterval(interval);
          interval = null;
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    // 2. Handle 'tick' message from Worker
    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        const WALK_SPEED_METERS_PER_SEC = 1.4;
        // Call the latest manualStep function via ref
        manualStepRef.current('ROUTE', WALK_SPEED_METERS_PER_SEC);
      }
    };

    // 3. Start the Worker
    worker.postMessage('start');

    // 4. Cleanup
    return () => {
      worker.postMessage('stop');
      worker.terminate();
    };
  }, [isTestMode, isAutoPilot, destination]); // Re-initialize only if these main switches change

  const calculateNextPositionOnPath = (current: Coordinates, path: Coordinates[], moveMeters: number): Coordinates => {
      if (!path || path.length < 2) return current;
      let bestIdx = 0; let bestT = 0; let minDistSq = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
          const start = path[i]; const end = path[i+1];
          const x = current.lng, y = current.lat;
          const x1 = start.lng, y1 = start.lat;
          const x2 = end.lng, y2 = end.lat;
          const dx = x2 - x1; const dy = y2 - y1;
          const lenSq = dx * dx + dy * dy; let t = 0;
          if (lenSq > 0) t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t * dx; const projY = y1 + t * dy;
          const distSq = (x - projX) ** 2 + (y - projY) ** 2;
          if (distSq < minDistSq) { minDistSq = distSq; bestIdx = i; bestT = t; }
      }
      let remainingMeters = moveMeters;
      let currentIdx = bestIdx;
      let startPoint = {
          lat: path[currentIdx].lat + (path[currentIdx+1].lat - path[currentIdx].lat) * bestT,
          lng: path[currentIdx].lng + (path[currentIdx+1].lng - path[currentIdx].lng) * bestT
      };
      while (remainingMeters > 0 && currentIdx < path.length - 1) {
          const nextPoint = path[currentIdx + 1];
          const distToNext = getDistance(startPoint, nextPoint);
          if (remainingMeters <= distToNext) {
              const ratio = remainingMeters / distToNext; 
              return { lat: startPoint.lat + (nextPoint.lat - startPoint.lat) * ratio, lng: startPoint.lng + (nextPoint.lng - startPoint.lng) * ratio };
          } else {
              remainingMeters -= distToNext;
              currentIdx++;
              startPoint = path[currentIdx];
          }
      }
      return path[path.length - 1]; 
  };

  const handleMapClick = (coords: Coordinates) => { if (isTestMode) updateLocation(coords); };
  // 🔥 FIX: Updated storage key to 'walktale_lang'
  const confirmLanguageChange = () => { if (pendingLanguage) { localStorage.setItem('walktale_lang', pendingLanguage); window.location.reload(); } };
  const handleOpenPricing = () => { if (isInRestrictedArea) { setPendingPricingAction(true); setShowRestrictedWarning(true); } else { setShowPricingModal(true); } };
  const handleRestrictedContinue = () => { setShowRestrictedWarning(false); if (pendingPricingAction) { setShowPricingModal(true); setPendingPricingAction(false); } };
  const handleRestrictedCancel = () => { setShowRestrictedWarning(false); setPendingPricingAction(false); };

  if (!onboardingComplete) {
    return <OnboardingScreen onComplete={(lang) => { setLanguage(lang); setOnboardingComplete(true); }} />;
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50 text-gray-900 font-sans">
        
        {/* Full Screen Map Container */}
        <div className="absolute inset-0 z-0">
             {isGoogleMapsLoaded && (
                 <MapComponent 
                    key={language} 
                    mapId={GOOGLE_MAP_ID} 
                    currentLocation={currentLocation}
                    userLocationAccuracy={userLocationAccuracy}
                    deviceHeading={deviceHeading} 
                    mapCenter={mapCenter}
                    destination={destination}
                    routePath={routePath}
                    directionsResult={directionsResult} 
                    pois={pois}
                    activePoi={activePoi}
                    onMapClick={handleMapClick}
                    routeInfo={routeInfo} 
                    bottomOffset={destination ? 200 : 0} 
                    forceRecenter={forceMapCenter} 
                    mapType={mapType}
                 />
             )}
        </div>

        {/* ... (Rest of UI Components - No Changes) ... */}
        <TopInfoBar 
            destinationName={destinationName}
            distance={routeInfo?.distance}
            duration={routeInfo?.duration}
            isWalking={isWalking}
        />

        {isBatterySaverMode && (
          <BatterySaverOverlay 
            onUnlock={() => setIsBatterySaverMode(false)}
            statusText={activePoi ? `Now playing: ${activePoi.name}` : (isWalking ? "Tracking location..." : "Paused")}
          />
        )}

        {/* ... (Test Buttons & Other Modals) ... */}
        {/* ... (Copy-Paste of existing JSX structure below TopInfoBar) ... */}
        <div className="absolute top-24 right-4 z-[900] flex flex-col items-end gap-3 pointer-events-none">
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
                <button onClick={() => setIsTestMode(!isTestMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md text-xs font-bold transition-all ${isTestMode ? 'bg-orange-500 text-white border-2 border-orange-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                    {isTestMode ? <><TestTube size={14} className="animate-pulse" /> Test: Madrid</> : <><LocateFixed size={14} /> Real GPS</>}
                </button>
                {isTestMode && (
                    <>
                    <div className="bg-orange-50 text-orange-800 text-[10px] px-2 py-1 rounded border border-orange-100 shadow-sm whitespace-nowrap">Click map to teleport</div>
                    <button onClick={() => { const newMode = testTtsMode === 'standard' ? 'neural' : 'standard'; setTestTtsMode(newMode); setTTSMode(newMode); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md text-xs font-bold transition-all mt-1 ${testTtsMode === 'neural' ? 'bg-violet-600 text-white border border-violet-400' : 'bg-white text-gray-600 border border-gray-200'}`}>
                         <Mic2 size={12} /> {testTtsMode === 'neural' ? 'Neural2 (Premium)' : 'Standard (Basic)'}
                    </button>
                    </>
                )}
            </div>
             {isTestMode && (
                 <div className="flex flex-col gap-3 pointer-events-auto mt-2 items-end">
                     {destination && (
                         <button onClick={() => { if(!isWalking) startTour(); setIsAutoPilot(!isAutoPilot); }} className={`w-14 h-14 rounded-full shadow-2xl border-2 border-white flex items-center justify-center text-white transition-all relative group ${isAutoPilot ? 'bg-indigo-600 hover:bg-indigo-700 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'}`} title={isAutoPilot ? "Pause Auto-Walk" : "Start Auto-Walk"}>
                             {isAutoPilot ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                             <span className="absolute right-16 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{isAutoPilot ? "Pause Auto Walk" : "Auto Walk (1.4m/s)"}</span>
                         </button>
                     )}
                     <button onClick={() => manualStep('ROUTE')} className="w-14 h-14 bg-green-600 rounded-full shadow-2xl border-2 border-white flex items-center justify-center text-white hover:bg-green-700 active:scale-90 transition-all relative group" title="Step 140m ON Route">
                         <Footprints size={28} />
                         <span className="absolute right-16 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Step 140m (Route)</span>
                     </button>
                     <button onClick={() => manualStep('DEVIATE')} className="w-14 h-14 bg-red-500 rounded-full shadow-2xl border-2 border-white flex items-center justify-center text-white hover:bg-red-600 active:scale-90 transition-all relative group" title="Step 140m OFF Route">
                         <RouteOff size={28} />
                         <span className="absolute right-16 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Deviate 140m</span>
                     </button>
                 </div>
             )}
        </div>

        {isRerouting && (
            <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-[950] bg-black/70 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-bold">Rerouting...</span>
            </div>
        )}
        
        {showGestureHint && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20">
                <div className="bg-black/80 text-white px-6 py-3 rounded-full flex items-center gap-3 animate-pulse">
                    <Hand size={24} />
                    <span className="font-medium">Use two fingers to rotate & tilt</span>
                </div>
            </div>
        )}

        {!isWalking && !destination && (
            <>
                <div className="absolute top-4 left-4 right-4 z-[1000]">
                    <SearchBar onLocationSelect={handleLocationSelect} language={language} currentLocation={currentLocation} />
                </div>
            </>
        )}

        <GuidePanel 
            isWalking={isWalking} 
            currentPoi={activePoi} 
            onStartWalking={startTour} 
            onStopWalking={stopTour} 
            hasDestination={!!destination} 
            language={language} 
            currentLocation={currentLocation} 
            onOpenLangSettings={() => { setPendingLanguage(null); setShowLanguageModal(true); }} 
            onOpenApiSettings={() => {}} 
            onToggleBatterySaver={() => setIsBatterySaverMode(true)} 
            onOpenPricing={handleOpenPricing} 
            mapType={mapType} 
            onToggleMapType={() => setMapType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')} 
            onOpenAnalytics={() => setShowAnalytics(true)} 
            routeInfo={routeInfo}
            onAddPois={(newPois) => setPois(prev => [...prev, ...newPois])}
        />

        {showSystemStatusModal && (
            <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                    <button onClick={() => setShowSystemStatusModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><AlertOctagon size={32} className="text-red-600" /></div>
                        <h2 className="text-xl font-bold text-gray-900">AI Connection Failed</h2>
                        <p className="text-sm text-gray-500 mt-1">Raw Error Message:</p>
                        <div className="mt-3 p-3 bg-gray-100 rounded-lg text-xs font-mono text-red-700 w-full break-all border border-gray-200">{connectionErrorMsg || "Unknown connection error"}</div>
                    </div>
                    <div className="space-y-4 text-sm text-gray-700 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2"><Check size={16} /> Solution Checklist:</h3>
                        <ul className="space-y-2 list-disc pl-4">
                            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-600 underline font-bold">Google Cloud Console</a>.</li>
                            <li>Find API Key: <span className="font-mono bg-white px-1 rounded border">AIzaSy...Zqwg</span></li>
                            <li>Click the key and check the <strong>"API Restrictions"</strong> tab.</li>
                            <li>Ensure <strong>"Generative Language API"</strong> is checked/added to the list.</li>
                            <li>If "Application restrictions" is set to "HTTP referrers", ensure your current URL is listed.</li>
                        </ul>
                    </div>
                    <button onClick={() => { setShowSystemStatusModal(false); testGeminiConnection().then(res => { if(res.success) alert("Fixed! AI is connected."); else setConnectionErrorMsg(res.error || "Still failing..."); }); }} className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">Retry Connection</button>
                </div>
            </div>
        )}

        {showIdleModal && (
            <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><BedDouble size={32} className="text-blue-500" /></div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{language === AppLanguage.KOREAN ? "투어가 일시정지 되었습니다" : "Tour Paused"}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">{language === AppLanguage.KOREAN ? "15분 동안 이동이 감지되지 않아 배터리 및 데이터 절약을 위해 투어를 멈췄습니다." : "No movement detected for 15 mins. Tour paused to save battery and data."}</p>
                    <button onClick={() => { setShowIdleModal(false); startTour(); }} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"><Play size={18} fill="currentColor" />{language === AppLanguage.KOREAN ? "다시 시작하기" : "Resume Tour"}</button>
                    <button onClick={() => { setShowIdleModal(false); stopTour(); }} className="mt-3 text-sm text-gray-400 font-medium hover:text-gray-600">{language === AppLanguage.KOREAN ? "투어 종료" : "End Tour"}</button>
                </div>
            </div>
        )}

        {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
        
        {showReportModal && lastSessionReport && <TestReportModal report={lastSessionReport} onClose={() => setShowReportModal(false)} />}

        {showRestrictedWarning && <RestrictedRegionModal language={language} isPricingAction={pendingPricingAction} onContinue={handleRestrictedContinue} onCancel={handleRestrictedCancel} />}

        {showPricingModal && <PricingModal language={language} onClose={() => setShowPricingModal(false)} onSelectPlan={(plan) => { const isNeural = plan.includes('neural'); setTTSMode(isNeural ? 'neural' : 'standard'); alert(`${plan} Selected! Activating ${isNeural ? 'Premium Neural' : 'Standard'} Voice.`); setShowPricingModal(false); }} />}

        {showLanguageModal && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10 zoom-in-95 duration-200 overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Globe size={18} className="text-blue-600" /> 언어 설정 (Language)</h3>
                        <button onClick={() => setShowLanguageModal(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {!pendingLanguage ? (
                            <div className="space-y-1">
                                {Object.values(AppLanguage).map((lang) => (
                                    <button key={lang} onClick={() => { if (lang === language) { setShowLanguageModal(false); } else { setPendingLanguage(lang); } }} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${language === lang ? 'bg-blue-600 border border-blue-200 text-blue-700' : 'bg-white border border-transparent text-gray-700 hover:bg-gray-50 active:bg-gray-100'}`}>
                                        <span className="font-medium ml-2">{lang}</span>{language === lang && <Check size={18} className="mr-2" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center">
                                <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={28} className="text-yellow-500" /></div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">언어를 변경하시겠습니까?</h4>
                                <p className="text-sm text-gray-600 mb-6 leading-relaxed">언어 설정을 <strong>{pendingLanguage}</strong>(으)로 변경하려면<br/>앱을 <strong>재시작</strong>해야 합니다.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setPendingLanguage(null)} className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50">취소</button>
                                    <button onClick={confirmLanguageChange} className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">재시작</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default App;
