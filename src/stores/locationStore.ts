import { create } from 'zustand';
import LocationService, { LocationData, LocationMemory, LocationQuery } from '../services/locationService';

interface LocationState {
  // Location data
  currentLocation: LocationData | null;
  isLocationEnabled: boolean;
  isLocationLoading: boolean;
  locationError: string | null;
  
  // Nearby memories
  nearbyMemories: LocationMemory[];
  isLoadingNearby: boolean;
  nearbyError: string | null;
  
  // Search results
  searchResults: LocationMemory[];
  isSearching: boolean;
  searchError: string | null;
  lastSearchQuery: string | null;
  
  // Settings
  autoLocationEnabled: boolean;
  defaultRadius: number;
  
  // Actions
  initializeLocation: () => Promise<void>;
  getCurrentLocation: () => Promise<void>;
  toggleAutoLocation: () => void;
  searchNearbyMemories: (query: LocationQuery) => Promise<void>;
  searchMemoriesByPlace: (place: string) => Promise<void>;
  saveMemoryLocation: (memoryId: string, location?: LocationData) => Promise<void>;
  setDefaultRadius: (radius: number) => void;
  clearSearchResults: () => void;
  clearErrors: () => void;
}

const useLocationStore = create<LocationState>((set, get) => ({
  // Initial state
  currentLocation: null,
  isLocationEnabled: false,
  isLocationLoading: false,
  locationError: null,
  
  nearbyMemories: [],
  isLoadingNearby: false,
  nearbyError: null,
  
  searchResults: [],
  isSearching: false,
  searchError: null,
  lastSearchQuery: null,
  
  autoLocationEnabled: false,
  defaultRadius: 1, // 1km default
  
  // Actions
  initializeLocation: async () => {
    const locationService = LocationService.getInstance();
    
    try {
      set({ isLocationLoading: true, locationError: null });
      
      console.log('🚀 Initializing location services...');
      
      const supportCheck = await locationService.checkLocationSupport();
      console.log('📍 Location support check:', supportCheck);
      
      if (!supportCheck.supported) {
        set({ 
          isLocationEnabled: false, 
          isLocationLoading: false,
          locationError: supportCheck.reason || 'Location services are not supported or denied'
        });
        return;
      }
      
      // If permission is prompt or granted, try to get location
      if (supportCheck.permission === 'prompt' || supportCheck.permission === 'granted' || supportCheck.permission === 'unknown') {
        console.log('✅ Location permission available, attempting to get location...');
        
        // Try to get cached location first
        const cachedLocation = locationService.getCachedLocation();
        if (cachedLocation && locationService.isRecentLocation && locationService.isRecentLocation(cachedLocation)) {
          console.log('📍 Using cached recent location');
          set({ 
            currentLocation: cachedLocation,
            isLocationEnabled: true,
            isLocationLoading: false
          });
          return;
        }
        
        // Try to get fresh location (this will trigger permission prompt if needed)
        try {
          console.log('🎯 Getting fresh location...');
          const location = await locationService.getCurrentLocation();
          
          if (location) {
            console.log('✅ Location acquired successfully');
            set({ 
              currentLocation: location,
              isLocationEnabled: true,
              isLocationLoading: false
            });
          } else {
            throw new Error('Location service returned null');
          }
        } catch (locationError) {
          console.error('❌ Failed to get location:', locationError);
          
          // If we failed to get location but permission wasn't denied, 
          // still mark as enabled so user can try again
          const stillEnabled = supportCheck.permission !== 'denied';
          
          set({ 
            isLocationEnabled: stillEnabled,
            isLocationLoading: false,
            locationError: locationError instanceof Error ? locationError.message : 'Failed to get location'
          });
        }
      } else {
        console.log('❌ Location permission denied');
        set({ 
          isLocationEnabled: false, 
          isLocationLoading: false,
          locationError: 'Location permission denied. Please enable location services.'
        });
      }
      
    } catch (error) {
      console.error('❌ Location initialization failed:', error);
      set({ 
        isLocationEnabled: false,
        isLocationLoading: false,
        locationError: error instanceof Error ? error.message : 'Failed to initialize location services'
      });
    }
  },
  
  getCurrentLocation: async () => {
    const locationService = LocationService.getInstance();
    
    try {
      set({ isLocationLoading: true, locationError: null });
      
      // Use the enhanced location service for better accuracy
      const location = await locationService.getBestLocation((status, accuracy) => {
        console.log(`📍 Location update: ${status}${accuracy ? ` (${accuracy}m)` : ''}`);
      });
      
      set({ 
        currentLocation: location,
        isLocationEnabled: true,
        isLocationLoading: false
      });
      
      if (location) {
        console.log(`✅ Location updated: ${location.city || 'Unknown'} with ${locationService.getAccuracyDescription(location.accuracy)}`);
      }
      
    } catch (error) {
      set({ 
        isLocationLoading: false,
        locationError: error instanceof Error ? error.message : 'Failed to get location'
      });
    }
  },
  
  toggleAutoLocation: () => {
    const { autoLocationEnabled } = get();
    const locationService = LocationService.getInstance();
    
    if (autoLocationEnabled) {
      locationService.stopLocationWatch();
      set({ autoLocationEnabled: false });
    } else {
      locationService.startLocationWatch((location) => {
        set({ currentLocation: location });
      });
      set({ autoLocationEnabled: true });
    }
  },
  
  searchNearbyMemories: async (query: LocationQuery) => {
    const locationService = LocationService.getInstance();
    
    try {
      set({ isLoadingNearby: true, nearbyError: null });
      
      const memories = await locationService.getMemoriesNearLocation(query);
      set({ 
        nearbyMemories: memories,
        isLoadingNearby: false
      });
      
    } catch (error) {
      set({ 
        isLoadingNearby: false,
        nearbyError: error instanceof Error ? error.message : 'Failed to search nearby memories'
      });
    }
  },
  
  searchMemoriesByPlace: async (place: string) => {
    const locationService = LocationService.getInstance();
    
    try {
      set({ isSearching: true, searchError: null, lastSearchQuery: place });
      
      const memories = await locationService.getMemoriesByPlace(place);
      set({ 
        searchResults: memories,
        isSearching: false
      });
      
    } catch (error) {
      set({ 
        isSearching: false,
        searchError: error instanceof Error ? error.message : 'Failed to search memories by place'
      });
    }
  },
  
  saveMemoryLocation: async (memoryId: string, location?: LocationData) => {
    const locationService = LocationService.getInstance();
    const { currentLocation } = get();
    
    try {
      const locationToSave = location || currentLocation;
      if (!locationToSave) {
        throw new Error('No location available to save');
      }
      
      await locationService.saveMemoryLocation(memoryId, locationToSave);
      
    } catch (error) {
      console.error('Failed to save memory location:', error);
      throw error;
    }
  },
  
  setDefaultRadius: (radius: number) => {
    set({ defaultRadius: radius });
  },
  
  clearSearchResults: () => {
    set({ 
      searchResults: [],
      lastSearchQuery: null,
      searchError: null
    });
  },
  
  clearErrors: () => {
    set({ 
      locationError: null,
      nearbyError: null,
      searchError: null
    });
  }
}));

export default useLocationStore;