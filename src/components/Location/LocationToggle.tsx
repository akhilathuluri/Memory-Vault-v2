import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Check, X } from 'lucide-react';
import useLocationStore from '../../stores/locationStore';
import LocationService from '../../services/locationService';
import { supabase } from '../../lib/supabase';

interface LocationToggleProps {
  memoryId?: string;
  onLocationSaved?: (location: any) => void;
  className?: string;
}

const LocationToggle: React.FC<LocationToggleProps> = ({
  memoryId,
  onLocationSaved,
  className = ''
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [memoryLocation, setMemoryLocation] = useState<any>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const {
    currentLocation,
    isLocationEnabled,
    getCurrentLocation,
    saveMemoryLocation
  } = useLocationStore();

  // Fetch memory location data when component mounts
  useEffect(() => {
    const fetchMemoryLocation = async () => {
      if (!memoryId) return;

      setIsLoadingLocation(true);
      try {
        // First try direct query
        let { data, error } = await supabase
          .from('memory_locations')
          .select('*')
          .eq('memory_id', memoryId)
          .single();

        // If direct query fails due to RLS, try using the function
        if (error && (error.message.includes('406') || error.message.includes('Not Acceptable'))) {
          console.log('Direct query failed due to RLS, trying function approach...');
          const { data: functionData, error: functionError } = await supabase
            .rpc('get_memory_location', { memory_uuid: memoryId });
          
          if (functionError) {
            console.error('Function query also failed:', functionError);
          } else if (functionData && functionData.length > 0) {
            data = functionData[0];
            error = null;
          }
        }

        if (error) {
          if (error.code === 'PGRST116') {
            // No location data found - this is normal
            console.log('No location data found for memory:', memoryId);
          } else if (error.message.includes('relation "memory_locations" does not exist')) {
            // Table doesn't exist - migration not applied
            console.warn('memory_locations table does not exist. Please apply the database migration.');
          } else {
            console.error('Error fetching memory location:', error);
          }
        } else if (data) {
          setMemoryLocation(data);
        }
      } catch (error) {
        console.error('Error fetching memory location:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchMemoryLocation();
  }, [memoryId]);

  const handleCaptureLocation = async () => {
    if (!memoryId) return;

    setIsCapturing(true);
    setCaptureError(null);
    setCaptureSuccess(false);

    try {
      // Get fresh location
      await getCurrentLocation();

      // Use the fresh location from store
      const locationService = LocationService.getInstance();
      const freshLocation = locationService.getCachedLocation();

      if (!freshLocation) {
        throw new Error('Failed to get current location');
      }

      // Save location for memory
      await saveMemoryLocation(memoryId, freshLocation);

      // Update local state with the new location
      setMemoryLocation({
        memory_id: memoryId,
        latitude: freshLocation.latitude,
        longitude: freshLocation.longitude,
        address: freshLocation.address,
        city: freshLocation.city,
        country: freshLocation.country,
        recorded_at: new Date().toISOString()
      });

      setCaptureSuccess(true);
      onLocationSaved?.(freshLocation);

      // Reset success state after 2 seconds
      setTimeout(() => setCaptureSuccess(false), 2000);

    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : 'Failed to capture location');
      setTimeout(() => setCaptureError(null), 3000);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isLocationEnabled) {
    return (
      <div className={`flex items-center gap-2 text-slate-500 text-sm ${className}`}>
        <MapPin className="w-4 h-4" />
        <span>Location disabled</span>
      </div>
    );
  }

  if (isLoadingLocation) {
    return (
      <div className={`flex items-center gap-2 text-slate-500 text-sm ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading location...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {memoryId ? (
        // If memory has location data, show it; otherwise show "Add Location" button
        memoryLocation ? (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-green-500" />
            <div className="flex flex-col">
              <span className="text-slate-700 font-medium">
                {memoryLocation.address ||
                  `${memoryLocation.city || 'Unknown'}, ${memoryLocation.country || ''}`}
              </span>
              {memoryLocation.recorded_at && (
                <span className="text-xs text-slate-500">
                  Recorded {new Date(memoryLocation.recorded_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={handleCaptureLocation}
              disabled={isCapturing}
              className="ml-2 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
              title="Update location"
            >
              Update
            </button>
          </div>
        ) : (
          <button
            onClick={handleCaptureLocation}
            disabled={isCapturing}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${captureSuccess
                ? 'bg-green-50 text-green-700 border border-green-200'
                : captureError
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-white/80 text-slate-700 border border-slate-300 hover:bg-white/90'
              }`}
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : captureSuccess ? (
              <Check className="w-4 h-4" />
            ) : captureError ? (
              <X className="w-4 h-4" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}

            <span>
              {isCapturing
                ? 'Capturing...'
                : captureSuccess
                  ? 'Location saved!'
                  : captureError
                    ? 'Failed to save'
                    : 'Add Location'
              }
            </span>
          </button>
        )
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-green-500" />
          {currentLocation ? (
            <span className="truncate max-w-48">
              {currentLocation.address ||
                `${currentLocation.city || 'Unknown'}, ${currentLocation.country || ''}`}
            </span>
          ) : (
            <span>Location available</span>
          )}
        </div>
      )}

      {captureError && (
        <div className="text-xs text-red-600 mt-1">
          {captureError}
        </div>
      )}
    </div>
  );
};

export default LocationToggle;