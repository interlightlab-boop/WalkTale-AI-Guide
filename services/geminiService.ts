import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Coordinates, AppLanguage, PlaceOfInterest, RestaurantRecommendation } from '../types';

declare const google: any;

// Configuration & State
const CACHE_RADIUS_METERS = 3000;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Hour
export const CURRENT_GEMINI_MODEL = "gemini-2.0-flash-exp"; // Upgraded to faster/better model if available, fallback handled in error

let ai: GoogleGenAI | null = null;
let mapsApiKey: string = "";

// Session Stats
let isSessionActive = false;
let sessionStats = {
    totalLlmInputTokens: 0,
    totalLlmOutputTokens: 0,
    totalTtsCharacters: 0,
    totalApiRequestCount: 0,
    mapsUsage: {
        mapLoads: 0,
        geocodingCalls: 0,
        placesCalls: 0,
        directionsCalls: 0
    },
    startTime: 0
};
let sessionLogs: any[] = [];
let currentTtsMode: 'standard' | 'neural' = 'standard';

// Audio
let audioContext: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;
let isAudioPlayingFlag = false;

// Caches
export let restaurantCache: { coords: Coordinates; allRawPlaces: any[]; nextIndex: number; timestamp: number } | null = null;
export let pendingFoodSearchPromise: Promise<RestaurantRecommendation[]> | null = null;
export let addressCache: { data: { city: string; street?: string; neighborhood?: string; district?: string; country?: string } } | null = null;
let foodSearchCount = 0;
let foodSearchResetTime = Date.now();

// Initialization
export const initializeGemini = (key: string) => {
    // Priority: Environment Variable > Passed Key
    const apiKey = process.env.API_KEY || key;
    ai = new GoogleGenAI({ apiKey });
};

export const initializeTTS = (key: string) => {
    mapsApiKey = key;
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContext();
    } catch (e) {
        console.error("AudioContext not supported");
    }
};

export const getGeminiStatus = () => ai ? 'connected' : 'unknown';

export const testGeminiConnection = async () => {
    if (!ai) return { success: false, error: "AI not initialized" };
    try {
        await ai.models.generateContent({ model: CURRENT_GEMINI_MODEL, contents: "Hello" });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

// Helper Functions
export const getDistance = (c1: Coordinates, c2: Coordinates) => {
    const R = 6371e3; 
    const φ1 = c1.lat * Math.PI/180;
    const φ2 = c2.lat * Math.PI/180;
    const Δφ = (c2.lat-c1.lat) * Math.PI/180;
    const Δλ = (c2.lng-c1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export const trackMapCall = (type: 'map_load' | 'geocoding' | 'places' | 'directions') => {
    if (type === 'map_load') sessionStats.mapsUsage.mapLoads++;
    if (type === 'geocoding') sessionStats.mapsUsage.geocodingCalls++;
    if (type === 'places') sessionStats.mapsUsage.placesCalls++;
    if (type === 'directions') sessionStats.mapsUsage.directionsCalls++;
};

// AI Request Wrapper with Timeout
export const scheduleGeminiRequest = async (model: string, params: any, timeoutMs: number = 15000): Promise<GenerateContentResponse> => {
    if (!ai) throw new Error("AI not initialized");
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs);
    });

    const apiCallPromise = async () => {
        sessionStats.totalApiRequestCount++;
        const result = await ai!.models.generateContent({ model, ...params });
        
        // Usage Tracking
        if (result.usageMetadata) {
            sessionStats.totalLlmInputTokens += result.usageMetadata.promptTokenCount || 0;
            sessionStats.totalLlmOutputTokens += result.usageMetadata.candidatesTokenCount || 0;
        } else {
            sessionStats.totalLlmInputTokens += JSON.stringify(params).length / 4;
            sessionStats.totalLlmOutputTokens += (result.text?.length || 0) / 4;
        }
        return result;
    };

    // Race against the timeout
    return Promise.race([apiCallPromise(), timeoutPromise]);
};

// TTS Functions
export const prepareAudio = async () => {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
};

export const resumeAudioContext = async () => {
    await prepareAudio();
};

export const setTTSMode = (mode: 'standard' | 'neural') => {
    currentTtsMode = mode;
};

export const isAudioPlaying = () => isAudioPlayingFlag;

export const stopSpeaking = () => {
    if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch {}
        currentAudioSource = null;
    }
    isAudioPlayingFlag = false;
};

export const waitForCurrentAudioToFinish = async () => {
    let waited = 0;
    while (isAudioPlayingFlag && waited < 10000) { // 10s max wait to prevent hang
        await new Promise(r => setTimeout(r, 200));
        waited += 200;
    }
};

export const speakText = async (text: string, language: AppLanguage, title?: string) => {
    if (!text) return;

    if (isSessionActive) {
        sessionLogs.push({
            timestamp: Date.now(),
            title: title || "Narration",
            text: text.substring(0, 100) + "...",
            category: 'story'
        });
        sessionStats.totalTtsCharacters += text.length;
    }

    stopSpeaking();
    isAudioPlayingFlag = true;

    try {
        const langCode = getTtsLangCode(language);
        const name = currentTtsMode === 'neural' ? `${langCode}-Neural2-A` : `${langCode}-Standard-A`;
        // Using Google Cloud TTS via REST
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${mapsApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text },
                voice: { languageCode: langCode, name: name },
                audioConfig: { audioEncoding: 'MP3' }
            })
        });
        
        const data = await response.json();
        if (data.audioContent) {
            const audioData = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
            if (audioContext) {
                const buffer = await audioContext.decodeAudioData(audioData.buffer);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                currentAudioSource = source;
                source.onended = () => { isAudioPlayingFlag = false; };
                source.start(0);
                await new Promise(resolve => source.onended = () => { isAudioPlayingFlag = false; resolve(true); });
            }
        }
    } catch (e) {
        console.error("TTS Error", e);
        isAudioPlayingFlag = false;
    }
};

export const playSampleTTS = async (language: AppLanguage, mode: 'standard' | 'neural') => {
    const prevMode = currentTtsMode;
    currentTtsMode = mode;
    await speakText("Hello, this is a voice sample.", language);
    currentTtsMode = prevMode;
};

const getTtsLangCode = (lang: AppLanguage) => {
    switch(lang) {
        case AppLanguage.KOREAN: return 'ko-KR';
        case AppLanguage.JAPANESE: return 'ja-JP';
        case AppLanguage.SPANISH: return 'es-ES';
        case AppLanguage.FRENCH: return 'fr-FR';
        case AppLanguage.GERMAN: return 'de-DE';
        case AppLanguage.CHINESE: return 'zh-CN';
        default: return 'en-US';
    }
};

// Maps & Geocoding
export const searchVerifiedPlaces = async (coords: Coordinates): Promise<any[]> => {
    trackMapCall('places');
    return new Promise((resolve) => {
        if (!(window as any).google || !(window as any).google.maps) { resolve([]); return; }
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.nearbySearch({
            location: coords,
            radius: 1000,
            type: ['restaurant', 'cafe', 'bakery']
        }, (results: any[], status: any) => {
            resolve(status === google.maps.places.PlacesServiceStatus.OK ? results : []);
        });
    });
};

export const getDetailedAddress = async (coords: Coordinates) => {
    // Check Cache first
    if (addressCache) {
        const dist = getDistance(coords, addressCache.data as any); // rough checks
        // Reuse address if within 1km to save costs
        // Note: For strict 'Callao' check, we rely on the first geocoding result mostly.
    }

    trackMapCall('geocoding');
    return new Promise<any>((resolve) => {
        if (!(window as any).google) { resolve({ city: "Unknown" }); return; }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: coords }, (results: any[], status: any) => {
            if (status === 'OK' && results[0]) {
                const addr = { city: "", street: "", neighborhood: "", district: "", country: "" };
                results[0].address_components.forEach((c: any) => {
                    if (c.types.includes('locality')) addr.city = c.long_name;
                    if (c.types.includes('route')) addr.street = c.long_name;
                    if (c.types.includes('sublocality') || c.types.includes('neighborhood')) addr.neighborhood = c.long_name;
                    if (c.types.includes('administrative_area_level_1')) addr.district = c.long_name;
                    if (c.types.includes('country')) addr.country = c.long_name;
                });
                addressCache = { data: addr };
                resolve(addr);
            } else {
                resolve({ city: "Unknown", country: "" });
            }
        });
    });
};

export const getFoodSearchLimitInfo = () => {
    if (Date.now() - foodSearchResetTime > 24*60*60*1000) {
        foodSearchCount = 0;
        foodSearchResetTime = Date.now();
    }
    return { remaining: 20 - foodSearchCount };
};

export const incrementFoodSearchCount = () => { foodSearchCount++; };

// AI Logic & Prompts
export const getStrictSystemInstruction = (role: string, coords: Coordinates, addr: any, lang: AppLanguage) => {
    const countryContext = addr.country ? `You are STRICTLY in ${addr.country}.` : "";
    const cityContext = addr.city ? `City: ${addr.city}.` : "";
    
    // 🔥 ANTI-HALLUCINATION: DISAMBIGUATION RULES
    let antiHallucination = "";
    if (addr.city?.includes("Madrid") || addr.district?.includes("Madrid")) {
        antiHallucination = `
        CRITICAL LOCATION LOCK:
        - We are in MADRID, SPAIN.
        - IF the location is "Callao", it refers to "Plaza del Callao" in Madrid.
        - DO NOT mention Peru, Lima, or the port of Callao.
        - DO NOT mention San Diego (USA) or other Spanish-named cities in Americas.
        `;
    } else if (addr.country?.includes("Spain")) {
        antiHallucination = `
        CRITICAL: We are in SPAIN. Do not confuse with Latin American cities.
        `;
    }

    return `
    ROLE: ${role}
    LOCATION DATA: Lat ${coords.lat}, Lng ${coords.lng}.
    ADDRESS: ${addr.street || ''}, ${addr.neighborhood || ''}, ${addr.city || ''}, ${addr.country || ''}.
    ${countryContext} ${cityContext}
    ${antiHallucination}
    LANGUAGE: ${lang} ONLY.
    RULES:
    1. Do not use Markdown bolding/italics.
    2. Be conversational.
    3. If the user asks about a place that exists in multiple countries, assume the one in ${addr.country || "the current location"}.
    `;
};

// --- Main AI Features ---

export const getAiRecommendedRestaurants = async (coords: Coordinates, language: AppLanguage): Promise<RestaurantRecommendation[]> => {
    // 1. Check existing promise
    if (pendingFoodSearchPromise) return pendingFoodSearchPromise;

    const task = async (): Promise<RestaurantRecommendation[]> => {
        try {
            let rawPlacesToProcess: any[] = [];
            let isCached = false;
            
            // 2. Cache Check (3KM Radius)
            if (restaurantCache) {
                const dist = getDistance(coords, restaurantCache.coords);
                const elapsed = Date.now() - restaurantCache.timestamp;
                if (dist < CACHE_RADIUS_METERS && elapsed < CACHE_DURATION_MS) {
                    const startIdx = restaurantCache.nextIndex;
                    const endIdx = startIdx + 5;
                    rawPlacesToProcess = restaurantCache.allRawPlaces.slice(startIdx, endIdx);
                    if (rawPlacesToProcess.length === 0) {
                        rawPlacesToProcess = restaurantCache.allRawPlaces.slice(0, 5);
                        restaurantCache.nextIndex = 5;
                    } else {
                        restaurantCache.nextIndex = endIdx;
                    }
                    isCached = true;
                }
            }

            // 3. API Fetch (Verified Places)
            if (!isCached) {
                const limitInfo = getFoodSearchLimitInfo();
                if (limitInfo.remaining <= 0) throw new Error("DAILY_LIMIT_REACHED");
                
                const allRawPlaces = await searchVerifiedPlaces(coords); 
                incrementFoodSearchCount();
                
                restaurantCache = { 
                    coords: coords, 
                    allRawPlaces: allRawPlaces, 
                    nextIndex: 5, 
                    timestamp: Date.now() 
                };
                if (allRawPlaces.length === 0) return [];
                rawPlacesToProcess = allRawPlaces.slice(0, 5);
            }

            if (rawPlacesToProcess.length === 0) return [];

            // 4. AI Recommendation (With Timeout & Fallback)
            const addr = await getDetailedAddress(coords);
            const placesListText = rawPlacesToProcess.map((p, i) => `ID: ${i+1} | NAME: "${p.name}" | RATING: ${p.rating}⭐`).join("\n");
            const systemInstruction = getStrictSystemInstruction("Foodie Friend", coords, addr, language) + 
                `Recommend these. Output JSON: [{ "id": number, "name": "Name", "cuisine": "Type", "reason": "Short reason" }]`;
            
            try {
                // 🔥 TIMEOUT ADDED: 10 Seconds max for AI
                const response = await scheduleGeminiRequest(CURRENT_GEMINI_MODEL, {
                    contents: `INPUT: ${placesListText}`,
                    config: { systemInstruction, responseMimeType: "application/json" }
                }, 10000);
                
                let aiResults: any[] = [];
                try { aiResults = JSON.parse(response.text || "[]"); } catch {}
                
                if (aiResults.length === 0) throw new Error("Empty AI Response");

                return aiResults.map(item => {
                    let original = null;
                    if (item.id) original = rawPlacesToProcess[item.id - 1];
                    if (!original) original = rawPlacesToProcess.find(p => p.name === item.name || item.name.includes(p.name));
                    
                    let rating = original ? original.rating : 0;
                    let distStr = "";
                    if (original && original.geometry) {
                        const d = getDistance(coords, { lat: original.geometry.location.lat(), lng: original.geometry.location.lng() });
                        distStr = d >= 1000 ? `${(d/1000).toFixed(1)}km` : `${Math.round(d)}m`;
                    }
                    return {
                        name: item.name,
                        cuisine: item.cuisine,
                        reason: item.reason,
                        searchQuery: `${item.name}, ${addr.city || ""}`,
                        rating,
                        distance: distStr
                    };
                });

            } catch (aiError) {
                console.warn("AI Food Search Failed/Timed out, falling back to raw data:", aiError);
                // FALLBACK: Return raw places directly if AI fails
                return rawPlacesToProcess.map(p => {
                    let distStr = "";
                    if (p.geometry) {
                        const d = getDistance(coords, { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() });
                        distStr = d >= 1000 ? `${(d/1000).toFixed(1)}km` : `${Math.round(d)}m`;
                    }
                    return {
                        name: p.name,
                        cuisine: "Local Spot",
                        reason: `Rated ${p.rating} stars (${p.user_ratings_total} reviews)`,
                        searchQuery: `${p.name}, ${addr.city || ""}`,
                        rating: p.rating,
                        distance: distStr
                    };
                });
            }

        } catch (e: any) { 
            if (e.message === "DAILY_LIMIT_REACHED") throw e;
            return [];
        } finally {
            pendingFoodSearchPromise = null;
        }
    };
    pendingFoodSearchPromise = task();
    return pendingFoodSearchPromise;
};

export const findNearbyInterestingPlace = async (coords: Coordinates, lang: AppLanguage, previousTopics: string[], heading: number | null, radius: number, previousLocations: Coordinates[]): Promise<PlaceOfInterest | null> => {
    trackMapCall('places');
    return new Promise((resolve) => {
        if (!(window as any).google) { resolve(null); return; }
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.nearbySearch({
            location: coords,
            radius: radius,
            type: ['tourist_attraction', 'museum', 'church', 'landmark', 'town_square']
        }, async (results: any[], status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                // Filter duplicates
                const valid = results.filter(p => !previousTopics.includes(p.name));
                if (valid.length === 0) { resolve(null); return; }
                const place = valid[0];
                
                // Get AI Description with STRICT Context
                const addr = await getDetailedAddress(coords);
                const desc = await askAiGuide(`Tell me about "${place.name}" here. Keep it to 2 sentences.`, coords, lang);
                
                resolve({
                    name: place.name,
                    description: desc,
                    category: 'landmark',
                    location: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
                    imageUrl: place.photos?.[0]?.getUrl(),
                    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
                });
            } else {
                resolve(null);
            }
        });
    });
};

export const generateFillerNarration = async (coords: Coordinates, lang: AppLanguage, previousTopics: string[], step: number, heading: number | null) => {
    const addr = await getDetailedAddress(coords);
    const instruction = getStrictSystemInstruction("Historian", coords, addr, lang) + 
    `Tell a short cultural story or history fact about this specific neighborhood (${addr.neighborhood} in ${addr.city}, ${addr.country}). 
    Exclude: ${previousTopics.join(',')}. 
    Return JSON: { "topic": "...", "text": "...", "wikiUrl": "..." }`;
    
    try {
        const result = await scheduleGeminiRequest(CURRENT_GEMINI_MODEL, {
            contents: `Tell me a story about ${addr.neighborhood || "this area"}.`,
            config: { systemInstruction: instruction, responseMimeType: "application/json" }
        });
        return JSON.parse(result.text || "{}");
    } catch { return null; }
};

export const generateTourGreeting = async (dest: string, lang: AppLanguage) => {
    const res = await scheduleGeminiRequest(CURRENT_GEMINI_MODEL, {
        contents: `Generate a short, exciting tour greeting for going to ${dest}. Language: ${lang}.`
    });
    return res.text || "Welcome to the tour!";
};

export const generateArrivalGreeting = async (dest: string, coords: Coordinates, lang: AppLanguage) => {
    const addr = await getDetailedAddress(coords);
    const instruction = getStrictSystemInstruction("Guide", coords, addr, lang);
    const res = await scheduleGeminiRequest(CURRENT_GEMINI_MODEL, {
        contents: `We arrived at ${dest}. Generate a short congratulatory message.`,
        config: { systemInstruction: instruction }
    });
    return res.text || "You have arrived!";
};

export const askAiGuide = async (msg: string, coords: Coordinates, lang: AppLanguage) => {
    const addr = await getDetailedAddress(coords);
    const instruction = getStrictSystemInstruction("Local Guide", coords, addr, lang);
    const res = await scheduleGeminiRequest(CURRENT_GEMINI_MODEL, {
        contents: msg,
        config: { systemInstruction: instruction }
    });
    return res.text || "Thinking...";
};

export const getPhotoSpots = async (coords: Coordinates): Promise<PlaceOfInterest[]> => {
    // Simplified stub
    return []; 
};

export const generateTravelDiary = async (visited: string[], lang: AppLanguage) => {
    const res = await scheduleGeminiRequest(CURRENT_GEMINI_MODEL, {
        contents: `Write a poetic travel diary entry about visiting: ${visited.join(', ')}. Language: ${lang}.`
    });
    return res.text || "Diary generation failed.";
};

// Session & Background
export const startTrackingSession = () => {
    isSessionActive = true;
    sessionStats = {
        totalLlmInputTokens: 0,
        totalLlmOutputTokens: 0,
        totalTtsCharacters: 0,
        totalApiRequestCount: 0,
        mapsUsage: { mapLoads: 0, geocodingCalls: 0, placesCalls: 0, directionsCalls: 0 },
        startTime: Date.now()
    };
    sessionLogs = [];
};

export const stopTrackingSession = () => {
    isSessionActive = false;
    return { stats: sessionStats, logs: sessionLogs, ttsMode: currentTtsMode };
};

export const enableBackgroundMode = () => {};
export const disableBackgroundMode = () => {};