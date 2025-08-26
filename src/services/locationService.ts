import { supabase } from '../lib/supabase';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
  timestamp: string;
}

export interface LocationMemory {
  id: string;
  title: string;
  content: string;
  location: LocationData;
  distance?: number;
  created_at: string;
  tags: string[];
}

export interface LocationQuery {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private currentLocation: LocationData | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Check if geolocation is supported and get permission status
   */
  async checkLocationSupport(): Promise<{ supported: boolean; permission: string; reason?: string }> {
    if (!navigator.geolocation) {
      return { supported: false, permission: 'unavailable', reason: 'Geolocation API not supported' };
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('🔍 Location permission state:', permission.state);
      
      return {
        supported: permission.state !== 'denied',
        permission: permission.state,
        reason: permission.state === 'denied' ? 'Location permission denied' : undefined
      };
    } catch (error) {
      console.log('⚠️ Permissions API not available, assuming location is supported');
      // Permissions API not available, try to detect support by attempting to get location
      return { supported: true, permission: 'unknown', reason: 'Permissions API unavailable' };
    }
  }

  /**
   * Get current location with maximum accuracy
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Try multiple methods for best accuracy
    return this.getHighAccuracyLocation();
  }

  /**
   * Get high accuracy location with multiple attempts
   */
  private async getHighAccuracyLocation(): Promise<LocationData | null> {
    const attempts = [
      // Attempt 1: Maximum accuracy, short timeout
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Force fresh location
      },
      // Attempt 2: High accuracy, longer timeout
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000 // 1 minute cache
      },
      // Attempt 3: Fallback with reasonable accuracy
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      }
    ];

    let bestLocation: LocationData | null = null;
    
    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`🎯 Location attempt ${i + 1}/${attempts.length} with options:`, attempts[i]);
        const location = await this.attemptLocationFetch(attempts[i]);
        
        if (location && this.isAccurateEnough(location)) {
          console.log(`✅ Location acquired with ${location.accuracy}m accuracy`);
          return location;
        } else if (location) {
          console.log(`⚠️ Location accuracy (${location.accuracy}m) not ideal, trying next method...`);
          // Keep track of the best location we've found so far
          if (!bestLocation || (location.accuracy && bestLocation.accuracy && location.accuracy < bestLocation.accuracy)) {
            bestLocation = location;
          }
        }
      } catch (error) {
        console.warn(`❌ Location attempt ${i + 1} failed:`, error);
        if (i === attempts.length - 1 && !bestLocation) {
          throw error; // Last attempt failed and no fallback location
        }
      }
    }

    // If we have any location, use it as fallback
    if (bestLocation) {
      console.log(`⚠️ Using best available location with ${bestLocation.accuracy}m accuracy`);
      return bestLocation;
    }

    throw new Error('Failed to get any location data');
  }

  /**
   * Single location fetch attempt
   */
  private async attemptLocationFetch(options: PositionOptions): Promise<LocationData | null> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };

          // Add additional coordinate info if available
          if (position.coords.altitude !== null) {
            (locationData as any).altitude = position.coords.altitude;
          }
          if (position.coords.altitudeAccuracy !== null) {
            (locationData as any).altitudeAccuracy = position.coords.altitudeAccuracy;
          }
          if (position.coords.heading !== null) {
            (locationData as any).heading = position.coords.heading;
          }
          if (position.coords.speed !== null) {
            (locationData as any).speed = position.coords.speed;
          }

          // Try to get address information
          try {
            const addressInfo = await this.reverseGeocode(
              locationData.latitude,
              locationData.longitude
            );
            Object.assign(locationData, addressInfo);
          } catch (error) {
            console.warn('Failed to get address information:', error);
          }

          this.currentLocation = locationData;
          resolve(locationData);
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        options
      );
    });
  }

  /**
   * Check if location accuracy is good enough
   */
  private isAccurateEnough(location: LocationData): boolean {
    if (!location.accuracy) return true; // No accuracy info, assume it's fine
    
    // Consider accuracy good if it's within:
    // - 10m for high accuracy needs
    // - 100m for general use
    // - 1000m for basic location (city-level accuracy)
    // - 10000m for very rough location (still useful for memories)
    return location.accuracy <= 10000; // 10km is acceptable for memory location context
  }

  /**
   * Start watching location changes with high accuracy
   */
  startLocationWatch(callback: (location: LocationData) => void): void {
    if (!navigator.geolocation || this.watchId !== null) {
      return;
    }

    let lastAccurateLocation: LocationData | null = null;
    let locationUpdateCount = 0;

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        locationUpdateCount++;
        
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };

        // Add additional coordinate info if available
        if (position.coords.altitude !== null) {
          (locationData as any).altitude = position.coords.altitude;
        }
        if (position.coords.altitudeAccuracy !== null) {
          (locationData as any).altitudeAccuracy = position.coords.altitudeAccuracy;
        }

        console.log(`📍 Location update #${locationUpdateCount}: ${locationData.accuracy}m accuracy`);

        // Only update if this location is more accurate than the last one
        // or if we haven't had an accurate location yet
        const shouldUpdate = !lastAccurateLocation || 
                           !locationData.accuracy || 
                           !lastAccurateLocation.accuracy ||
                           locationData.accuracy < lastAccurateLocation.accuracy ||
                           this.hasSignificantLocationChange(lastAccurateLocation, locationData);

        if (shouldUpdate) {
          try {
            const addressInfo = await this.reverseGeocode(
              locationData.latitude,
              locationData.longitude
            );
            Object.assign(locationData, addressInfo);
          } catch (error) {
            console.warn('Failed to get address information:', error);
          }

          this.currentLocation = locationData;
          lastAccurateLocation = locationData;
          callback(locationData);
          
          console.log(`✅ Location updated: ${locationData.city || 'Unknown'} (${locationData.accuracy}m)`);
        } else {
          console.log(`⏭️ Skipping less accurate location update`);
        }
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000 // 30 seconds - more frequent updates for accuracy
      }
    );
  }

  /**
   * Check if location has changed significantly
   */
  private hasSignificantLocationChange(oldLocation: LocationData, newLocation: LocationData): boolean {
    const distance = this.calculateDistance(
      oldLocation.latitude,
      oldLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );
    
    // Consider it significant if moved more than 10 meters
    return distance > 0.01; // 0.01 km = 10 meters
  }

  /**
   * Stop watching location changes
   */
  stopLocationWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Reverse geocode coordinates to address with multiple providers
   */
  private async reverseGeocode(lat: number, lng: number): Promise<Partial<LocationData>> {
    const providers = [
      // Primary: OpenStreetMap Nominatim (most detailed)
      {
        name: 'Nominatim',
        fetch: () => this.reverseGeocodeNominatim(lat, lng)
      },
      // Fallback: BigDataCloud (good accuracy, no API key)
      {
        name: 'BigDataCloud',
        fetch: () => this.reverseGeocodeBigDataCloud(lat, lng)
      }
    ];

    for (const provider of providers) {
      try {
        console.log(`🗺️ Trying reverse geocoding with ${provider.name}...`);
        const result = await provider.fetch();
        if (result.address || result.city) {
          console.log(`✅ Geocoding successful with ${provider.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`❌ ${provider.name} geocoding failed:`, error);
      }
    }

    console.warn('⚠️ All geocoding providers failed');
    return {};
  }

  /**
   * OpenStreetMap Nominatim reverse geocoding
   */
  private async reverseGeocodeNominatim(lat: number, lng: number): Promise<Partial<LocationData>> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`,
      {
        headers: {
          'User-Agent': 'MemoryVault/1.0 (Memory Management App)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error(data?.error || 'No geocoding data returned');
    }

    // Extract detailed address information
    const address = data.address || {};
    const addressParts = [];

    // Build detailed address
    if (address.house_number) addressParts.push(address.house_number);
    if (address.road) addressParts.push(address.road);
    if (address.neighbourhood) addressParts.push(address.neighbourhood);
    if (address.suburb) addressParts.push(address.suburb);
    
    const detailedAddress = addressParts.length > 0 
      ? addressParts.join(' ') 
      : data.display_name;

    return {
      address: detailedAddress,
      city: address.city || address.town || address.village || address.municipality,
      country: address.country,
      // Additional details
      ...(address.postcode && { postcode: address.postcode }),
      ...(address.state && { state: address.state }),
      ...(address.county && { county: address.county })
    };
  }

  /**
   * BigDataCloud reverse geocoding (fallback)
   */
  private async reverseGeocodeBigDataCloud(lat: number, lng: number): Promise<Partial<LocationData>> {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error(`BigDataCloud API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data) {
      throw new Error('No geocoding data returned');
    }

    return {
      address: data.locality || data.city || data.principalSubdivision,
      city: data.city || data.locality,
      country: data.countryName,
      // Additional details
      ...(data.postcode && { postcode: data.postcode }),
      ...(data.principalSubdivision && { state: data.principalSubdivision })
    };
  }

  /**
   * Save location data for a memory
   */
  async saveMemoryLocation(memoryId: string, location: LocationData): Promise<void> {
    const { error } = await supabase
      .from('memory_locations')
      .upsert({
        memory_id: memoryId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address,
        city: location.city,
        country: location.country,
        recorded_at: location.timestamp
      });

    if (error) {
      throw new Error(`Failed to save location: ${error.message}`);
    }
  }

  /**
   * Get memories near a specific location
   */
  async getMemoriesNearLocation(query: LocationQuery): Promise<LocationMemory[]> {
    const radius = query.radius || 1; // Default 1km radius
    
    let dbQuery = supabase
      .from('memories')
      .select(`
        id,
        title,
        content,
        created_at,
        tags,
        memory_locations (
          latitude,
          longitude,
          accuracy,
          address,
          city,
          country,
          recorded_at
        )
      `)
      .not('memory_locations', 'is', null);

    // Add date range filter if provided
    if (query.dateRange) {
      dbQuery = dbQuery
        .gte('created_at', query.dateRange.start.toISOString())
        .lte('created_at', query.dateRange.end.toISOString());
    }

    // Add tag filter if provided
    if (query.tags && query.tags.length > 0) {
      dbQuery = dbQuery.overlaps('tags', query.tags);
    }

    const { data, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to fetch location memories: ${error.message}`);
    }

    if (!data) return [];

    // Calculate distances and filter by radius
    const memoriesWithDistance = data
      .map(memory => {
        if (!memory.memory_locations || memory.memory_locations.length === 0) {
          return null;
        }

        const location = memory.memory_locations[0];
        const distance = this.calculateDistance(
          query.latitude,
          query.longitude,
          location.latitude,
          location.longitude
        );

        if (distance <= radius) {
          return {
            id: memory.id,
            title: memory.title,
            content: memory.content,
            created_at: memory.created_at,
            tags: memory.tags || [],
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              address: location.address,
              city: location.city,
              country: location.country,
              timestamp: location.recorded_at
            },
            distance
          } as LocationMemory;
        }

        return null;
      })
      .filter((memory): memory is LocationMemory => memory !== null)
      .sort((a, b) => a.distance! - b.distance!);

    return memoriesWithDistance;
  }

  /**
   * Get memories by city or address
   */
  async getMemoriesByPlace(place: string): Promise<LocationMemory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select(`
        id,
        title,
        content,
        created_at,
        tags,
        memory_locations (
          latitude,
          longitude,
          accuracy,
          address,
          city,
          country,
          recorded_at
        )
      `)
      .not('memory_locations', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch memories by place: ${error.message}`);
    }

    if (!data) return [];

    // Filter by place name (case-insensitive)
    const filteredMemories = data
      .filter(memory => {
        if (!memory.memory_locations || memory.memory_locations.length === 0) {
          return false;
        }

        const location = memory.memory_locations[0];
        const searchTerm = place.toLowerCase();
        
        return (
          location.city?.toLowerCase().includes(searchTerm) ||
          location.address?.toLowerCase().includes(searchTerm) ||
          location.country?.toLowerCase().includes(searchTerm)
        );
      })
      .map(memory => {
        const location = memory.memory_locations[0];
        return {
          id: memory.id,
          title: memory.title,
          content: memory.content,
          created_at: memory.created_at,
          tags: memory.tags || [],
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            address: location.address,
            city: location.city,
            country: location.country,
            timestamp: location.recorded_at
          }
        } as LocationMemory;
      });

    return filteredMemories;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get current cached location
   */
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * Get the most accurate location possible with progress feedback
   */
  async getBestLocation(onProgress?: (status: string, accuracy?: number) => void): Promise<LocationData | null> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    onProgress?.('Requesting location permission...');
    
    // Check if we have a recent accurate location
    if (this.currentLocation && this.isRecentLocation(this.currentLocation) && this.isAccurateEnough(this.currentLocation)) {
      onProgress?.('Using cached accurate location', this.currentLocation.accuracy);
      return this.currentLocation;
    }

    onProgress?.('Getting high-accuracy GPS location...');
    
    try {
      // Try to get the most accurate location
      const location = await this.getHighAccuracyLocation();
      
      if (location) {
        onProgress?.(`Location acquired with ${location.accuracy}m accuracy`, location.accuracy);
        return location;
      }
    } catch (error) {
      onProgress?.('High-accuracy location failed, trying standard location...');
      
      // Fallback to standard location
      try {
        const location = await this.attemptLocationFetch({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        });
        
        if (location) {
          onProgress?.(`Standard location acquired with ${location.accuracy}m accuracy`, location.accuracy);
          return location;
        }
      } catch (fallbackError) {
        throw new Error('Failed to get location with any method');
      }
    }

    throw new Error('Unable to determine location');
  }

  /**
   * Check if location is recent (within 5 minutes)
   */
  isRecentLocation(location: LocationData): boolean {
    const locationTime = new Date(location.timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (now - locationTime) < fiveMinutes;
  }

  /**
   * Get location accuracy description
   */
  getAccuracyDescription(accuracy?: number): string {
    if (!accuracy) return 'Unknown accuracy';
    
    if (accuracy <= 5) return 'Excellent (±' + Math.round(accuracy) + 'm)';
    if (accuracy <= 10) return 'Very Good (±' + Math.round(accuracy) + 'm)';
    if (accuracy <= 20) return 'Good (±' + Math.round(accuracy) + 'm)';
    if (accuracy <= 50) return 'Fair (±' + Math.round(accuracy) + 'm)';
    if (accuracy <= 100) return 'Poor (±' + Math.round(accuracy) + 'm)';
    return 'Very Poor (±' + Math.round(accuracy) + 'm)';
  }

  /**
   * Test location permissions and capabilities
   */
  async testLocationServices(): Promise<{
    geolocationSupported: boolean;
    permissionState: string;
    canGetLocation: boolean;
    error?: string;
  }> {
    const result = {
      geolocationSupported: !!navigator.geolocation,
      permissionState: 'unknown',
      canGetLocation: false,
      error: undefined as string | undefined
    };

    if (!navigator.geolocation) {
      result.error = 'Geolocation API not supported';
      return result;
    }

    try {
      // Check permission state
      const supportCheck = await this.checkLocationSupport();
      result.permissionState = supportCheck.permission;

      // Try to get location
      const location = await this.getCurrentLocation();
      result.canGetLocation = !!location;
      
      if (!location) {
        result.error = 'Failed to get location';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Generate location-based tags
   */
  generateLocationTags(location: LocationData): string[] {
    const tags: string[] = [];
    
    if (location.city) {
      tags.push(`location:${location.city.toLowerCase()}`);
    }
    
    if (location.country) {
      tags.push(`country:${location.country.toLowerCase()}`);
    }
    
    // Add generic location tag
    tags.push('location:gps');
    
    return tags;
  }
}

export default LocationService;