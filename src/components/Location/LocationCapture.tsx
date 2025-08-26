import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Check, X, Settings } from 'lucide-react';
import useLocationStore from '../../stores/locationStore';
import LocationService from '../../services/locationService';

interface LocationCaptureProps {
  onLocationCaptured?: (location: any) => void;
  onLocationRemoved?: () => void;
  className?: string;
  disabled?: boolean;
}

const LocationCapture: React.FC<LocationCaptureProps> = ({
  onLocationCaptured,
  onLocationRemoved,
  className = '',
  disabled = false
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<any>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    currentLocation,
    isLocationEnabled,
    isLocationLoading,
    locationError,
    autoLocationEnabled,
    initializeLocation,
    getCurrentLocation,
    toggleAutoLocation
  } = useLocationStore();

  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  // Auto-capture location if enabled and available
  useEffect(() => {
    if (autoLocationEnabled && isLocationEnabled && currentLocation && !capturedLocation && !disabled) {
      handleCaptureLocation();
    }
  }, [autoLocationEnabled, isLocationEnabled, currentLocation, capturedLocation, disabled]);

  const handleCaptureLocation = async () => {
    if (disabled) return;

    setIsCapturing(true);
    setCaptureError(null);

    try {
      const locationService = LocationService.getInstance();
      
      // Use the enhanced location service for better accuracy
      const freshLocation = await locationService.getBestLocation((status, accuracy) => {
        console.log(`📍 Location status: ${status}${accuracy ? ` (${accuracy}m)` : ''}`);
      });
      
      if (!freshLocation) {
        throw new Error('Failed to get current location');
      }

      // Generate location tags
      const locationTags = locationService.generateLocationTags(freshLocation);
      
      const locationData = {
        ...freshLocation,
        tags: locationTags,
        accuracyDescription: locationService.getAccuracyDescription(freshLocation.accuracy)
      };

      setCapturedLocation(locationData);
      onLocationCaptured?.(locationData);
      
      console.log(`✅ Location captured: ${locationData.city || 'Unknown'} with ${locationService.getAccuracyDescription(freshLocation.accuracy)}`);
      
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : 'Failed to capture location');
      setTimeout(() => setCaptureError(null), 3000);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemoveLocation = () => {
    setCapturedLocation(null);
    setCaptureError(null);
    onLocationRemoved?.();
  };

  if (!isLocationEnabled) {
    return (
      <div className={`bg-slate-50 rounded-xl p-4 border border-slate-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <MapPin className="w-4 h-4" />
            <span>Location services disabled</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-600 mb-2">
              Enable location services in your browser to add location data to memories.
            </p>
            <button
              onClick={initializeLocation}
              className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Try enabling location
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-slate-700">
            {capturedLocation ? 'Location captured' : 'Add location'}
          </span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600">Auto-capture location</span>
            <button
              onClick={toggleAutoLocation}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                autoLocationEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  autoLocationEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Automatically capture your location when creating memories
          </p>
        </div>
      )}

      {/* Current Location Display */}
      {currentLocation && !capturedLocation && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <MapPin className="w-3 h-3" />
            <span className="truncate">
              Current: {currentLocation.address || 
                `${currentLocation.city || 'Unknown'}, ${currentLocation.country || ''}`}
            </span>
          </div>
        </div>
      )}

      {/* Captured Location Display */}
      {capturedLocation && (
        <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
                <Check className="w-3 h-3" />
                <span className="font-medium">Location saved</span>
              </div>
              <p className="text-xs text-green-600 truncate">
                {capturedLocation.address || 
                 `${capturedLocation.city || 'Unknown location'}, ${capturedLocation.country || ''}`}
              </p>
              {capturedLocation.accuracyDescription && (
                <p className="text-xs text-green-500 mt-1">
                  📍 {capturedLocation.accuracyDescription}
                </p>
              )}
              {capturedLocation.tags && capturedLocation.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {capturedLocation.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleRemoveLocation}
              disabled={disabled}
              className="ml-2 p-1 text-green-600 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {captureError && (
        <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-xs text-red-700">
            <X className="w-3 h-3" />
            <span>{captureError}</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!capturedLocation && (
        <button
          onClick={handleCaptureLocation}
          disabled={disabled || isCapturing || isLocationLoading}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
            disabled || isCapturing || isLocationLoading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          {isCapturing || isLocationLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Capturing location...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              <span>Capture current location</span>
            </>
          )}
        </button>
      )}

      {/* Location Status */}
      {locationError && (
        <div className="mt-2 text-xs text-red-600">
          {locationError}
        </div>
      )}
    </div>
  );
};

export default LocationCapture;