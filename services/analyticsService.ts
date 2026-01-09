
import { AnalyticsEvent, Coordinates, UserStats } from "../types";

// 🔥 FIX: Renamed storage keys to 'walktale_...'
const STORAGE_KEY_EVENTS = "walktale_analytics_events";
const STORAGE_KEY_STATS = "walktale_user_stats";

// Mock Data for "Demo" purposes if empty
const MOCK_STATS: UserStats = {
    totalDistanceMeters: 1250,
    placesVisited: 12,
    likedPlaces: ["Kyungbokgung Palace", "Blue Bottle Coffee", "Insadong Street"],
    totalListeningTimeSeconds: 480,
    topCategories: {
        'history': 5,
        'landmark': 4,
        'restaurant': 3
    }
};

export const logEvent = (
    type: AnalyticsEvent['type'], 
    data: { targetName?: string; category?: string; location?: Coordinates }
) => {
    const event: AnalyticsEvent = {
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        type,
        timestamp: Date.now(),
        ...data
    };

    // 1. Save Event Log
    const events = getEvents();
    events.push(event);
    // Keep last 100 events to save local storage
    if (events.length > 100) events.shift();
    
    try {
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) { console.warn("Analytics storage failed (Quota/Security)", e); }

    // 2. Update Aggregated Stats
    const stats = getUserStats();
    
    if (type === 'POI_VIEW') {
        stats.placesVisited += 1;
        if (data.category) {
            stats.topCategories[data.category] = (stats.topCategories[data.category] || 0) + 1;
        }
        // Simulate listening time (average 30s per POI for demo)
        stats.totalListeningTimeSeconds += 30;
    }
    
    if (type === 'POI_LIKE' && data.targetName) {
        if (!stats.likedPlaces.includes(data.targetName)) {
            stats.likedPlaces.push(data.targetName);
        }
    }
    
    // For distance, we usually update it separately, but let's just save the updated object
    try {
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch (e) { console.warn("Stats storage failed", e); }
};

export const updateDistanceStat = (meters: number) => {
    const stats = getUserStats();
    stats.totalDistanceMeters += meters;
    try {
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch (e) { console.warn("Stats storage failed", e); }
};

export const getEvents = (): AnalyticsEvent[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const getUserStats = (): UserStats => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_STATS);
        if (!stored) {
            // Return empty stats initialized
            return {
                totalDistanceMeters: 0,
                placesVisited: 0,
                likedPlaces: [],
                totalListeningTimeSeconds: 0,
                topCategories: {}
            };
        }
        return JSON.parse(stored);
    } catch { 
        return {
             totalDistanceMeters: 0,
             placesVisited: 0,
             likedPlaces: [],
             totalListeningTimeSeconds: 0,
             topCategories: {}
        };
    }
};

export const getDashboardData = () => {
    const stats = getUserStats();
    // If stats are basically empty (new user), return MOCK data for the "Investor Demo" look
    if (stats.placesVisited === 0 && stats.totalDistanceMeters === 0) {
        return MOCK_STATS;
    }
    return stats;
};
