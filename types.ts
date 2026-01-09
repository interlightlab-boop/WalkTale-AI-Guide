
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlaceOfInterest {
  name: string;
  description: string;
  category: 'landmark' | 'restaurant' | 'history' | 'other' | 'photo'; // Added 'photo'
  location: Coordinates;
  imageUrl?: string;
  googleMapsUrl?: string;
  wikipediaUrl?: string; // New field for deep dive
}

export interface RestaurantRecommendation {
  name: string;
  cuisine: string;
  reason: string; // e.g. "4.8 Stars • 2000+ Reviews" (AI estimated)
  searchQuery: string;
  rating?: number; // Google Maps Rating
  distance?: string; // Distance from user
}

export interface SimulationState {
  isActive: boolean;
  destination: Coordinates | null;
  speed: number; // roughly meters per step
}

// Ordered by Global Outbound Tourism Volume (Approximate)
// Changed from enum to const object for better browser compatibility
export const AppLanguage = {
  ENGLISH: 'English', // USA, UK, Global Standard
  CHINESE: '中文 (Chinese)', // China (Huge Volume)
  GERMAN: 'Deutsch (German)', // Germany (Travel Champions)
  KOREAN: '한국어 (Korean)', // South Korea
  JAPANESE: '日本語 (Japanese)', // Japan
  ARABIC: 'العربية (Arabic)', // Middle East (High Spend)
  SPANISH: 'Español (Spanish)', // Spain, Latin America
  FRENCH: 'Français (French)', // France
  THAI: 'ไทย (Thai)',
  VIETNAMESE: 'Tiếng Việt (Vietnamese)',
} as const;

export type AppLanguage = typeof AppLanguage[keyof typeof AppLanguage];

export interface TourState {
    isWalking: boolean;
    previousPoiNames: string[];
    previousFillerTopics: string[]; // To avoid repeating cultural facts
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

// 🔥 ANALYTICS TYPES (DATA MONOPOLY)
export interface AnalyticsEvent {
    id: string;
    type: 'POI_VIEW' | 'POI_LIKE' | 'POI_DISLIKE' | 'TOUR_START' | 'TOUR_END';
    targetName?: string;
    category?: string;
    timestamp: number;
    location?: Coordinates;
}

export interface UserStats {
    totalDistanceMeters: number;
    placesVisited: number;
    likedPlaces: string[];
    totalListeningTimeSeconds: number; // Simulated
    topCategories: Record<string, number>;
}

// 🔥 NEW: Session Report Types
export interface NarrationLog {
    timestamp: number;
    title: string;
    text: string;
    category: 'landmark' | 'story' | 'greeting' | 'chat';
}

export interface TourSessionReport {
    stats: {
        totalLlmInputTokens: number;
        totalLlmOutputTokens: number;
        totalTtsCharacters: number;
        totalApiRequestCount: number;
        mapsUsage: {
            mapLoads: number;
            geocodingCalls: number;
            // 🔥 SPLIT METRICS
            placesFoodCalls: number; 
            placesLandmarkCalls: number;
            directionsCalls: number;
        }
    };
    startTime: number;
    endTime: number;
    durationSeconds: number;
    totalDistanceMeters: number;
    narrations: NarrationLog[];
    ttsMode: string;
}
