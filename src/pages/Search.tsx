import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Sparkles, AlertCircle, Settings, MapPin, Navigation } from 'lucide-react';
import { useMemoryStore } from '../stores/memoryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useChatbotStore } from '../stores/chatbotStore';
import useLocationStore from '../stores/locationStore';
import SearchResults from '../components/Search/SearchResults';
import SearchModeToggle from '../components/Search/SearchModeToggle';
import ChatbotInterface from '../components/Search/ChatbotInterface';
import { useNavigate } from 'react-router-dom';

const Search = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'normal' | 'chatbot'>('normal');
  const [locationSearchMode, setLocationSearchMode] = useState<'nearby' | 'place' | 'off'>('off');
  const [locationRadius, setLocationRadius] = useState(1); // 1km default
  const { enhancedSearchResults, enhancedSearch } = useMemoryStore();
  const { settings } = useSettingsStore();
  const { loadConversations } = useChatbotStore();
  const {
    currentLocation,
    isLocationEnabled,
    initializeLocation,
    getCurrentLocation,
    searchNearbyMemories,
    searchMemoriesByPlace,
    nearbyMemories,
    searchResults: locationSearchResults,
    isLoadingNearby,
    isSearching: isLocationSearching,
    nearbyError,
    searchError
  } = useLocationStore();
  const navigate = useNavigate();

  // Handle nearby search automatically when mode changes
  const handleNearbySearch = async () => {
    if (!currentLocation) {
      setError('Location not available. Please enable location services.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log('Auto-searching nearby memories with:', {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: locationRadius
      });

      const result = await searchNearbyMemories({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: locationRadius
      });

      console.log('Nearby search completed, result:', result);
      console.log('Nearby memories in store:', nearbyMemories);

    } catch (err) {
      console.error('Nearby search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search nearby memories.');
    } finally {
      setLoading(false);
    }
  };

  // Load chatbot conversations and initialize location on mount
  useEffect(() => {
    loadConversations();
    initializeLocation();
  }, [loadConversations, initializeLocation]);

  // Auto-trigger nearby search when mode changes to nearby and location is available
  useEffect(() => {
    if (locationSearchMode === 'nearby' && currentLocation && isLocationEnabled) {
      handleNearbySearch();
    }
  }, [locationSearchMode, currentLocation, isLocationEnabled, locationRadius]);

  // Check if AI is properly configured
  const isAIConfigured = () => {
    if (!settings) return false;

    const webappKeys = useSettingsStore.getState().canUseWebappKeys();

    if (settings.api_key_mode === 'webapp') {
      return webappKeys.github || webappKeys.openrouter;
    } else {
      return !!(settings.github_api_key || settings.openrouter_api_key);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // For nearby search, we don't need a query
    if (locationSearchMode === 'nearby') {
      if (!currentLocation) {
        setError('Location not available. Please enable location services.');
        return;
      }
    } else if (!query.trim()) {
      return; // For other searches, we need a query
    }

    // Clear previous error
    setError(null);

    setLoading(true);
    try {
      // Handle location-based search
      if (locationSearchMode === 'nearby' && currentLocation) {
        console.log('Searching nearby memories with:', {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: locationRadius
        });
        await searchNearbyMemories({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: locationRadius
        });
      } else if (locationSearchMode === 'place' && query.trim()) {
        console.log('Searching memories by place:', query);
        await searchMemoriesByPlace(query);
      } else {
        // Regular AI-powered or basic search
        console.log('Regular search:', query);
        await enhancedSearch(query);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-20 h-20 glass-card-strong rounded-3xl mb-6 shadow-xl relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </motion.div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-white rounded-full"
            ></motion.div>
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-bold gradient-text mb-4"
        >
          {searchMode === 'normal' ? 'AI-Powered Search' : 'AI Chatbot'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-600 text-xl"
        >
          {searchMode === 'normal'
            ? 'Ask questions about your memories and get intelligent answers'
            : 'Have a conversation with AI about your memories'
          }
        </motion.p>
      </div>

      {/* Search Mode Toggle */}
      <SearchModeToggle mode={searchMode} onModeChange={setSearchMode} />

      {/* Location Search Controls - Only show for normal search mode */}
      {searchMode === 'normal' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-card rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-slate-800">Location Search</h3>
              </div>
              {isLocationEnabled && currentLocation && (
                <div className="text-sm text-slate-600">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {currentLocation.city || 'Location available'}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setLocationSearchMode('off')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${locationSearchMode === 'off'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/50 text-slate-600 hover:bg-white/70'
                  }`}
              >
                <SearchIcon className="w-4 h-4 inline mr-2" />
                Regular Search
              </button>
              <button
                onClick={() => {
                  setLocationSearchMode('nearby');
                  // Clear any existing query since nearby search doesn't need it
                  setQuery('');
                }}
                disabled={!isLocationEnabled || !currentLocation}
                className={`px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${locationSearchMode === 'nearby'
                  ? 'bg-green-600 text-white'
                  : 'bg-white/50 text-slate-600 hover:bg-white/70'
                  }`}
              >
                <Navigation className="w-4 h-4 inline mr-2" />
                Nearby Memories
              </button>
              <button
                onClick={() => setLocationSearchMode('place')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${locationSearchMode === 'place'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/50 text-slate-600 hover:bg-white/70'
                  }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Search by Place
              </button>
            </div>

            {/* Location Search Settings */}
            {locationSearchMode === 'nearby' && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <label className="text-sm font-medium text-green-800">Search radius:</label>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={locationRadius}
                    onChange={(e) => setLocationRadius(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-green-700 font-medium">{locationRadius}km</span>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleNearbySearch}
                    disabled={!currentLocation || loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Searching...' : 'Search Nearby Memories'}
                  </button>
                </div>
              </div>
            )}

            {/* Location Status */}
            {!isLocationEnabled && locationSearchMode !== 'off' && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Location services are disabled. Enable location to use proximity search.
                  </span>
                </div>
              </div>
            )}


          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {searchMode === 'normal' ? (
          <motion.div
            key="normal-search"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            {/* AI Configuration Warning */}
            {!isAIConfigured() && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 glass-card rounded-2xl p-4 border-l-4 border-l-blue-500"
              >
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-500 mr-3" />
                  <div className="flex-1">
                    <p className="text-blue-800 font-medium">Basic Search Mode</p>
                    <p className="text-blue-700 text-sm">
                      For AI-powered answers and enhanced search, please configure your API keys in Settings. Text search is still available.
                    </p>
                  </div>
                  <motion.button
                    onClick={() => navigate('/settings')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="glass-button-secondary px-4 py-2 text-sm rounded-lg flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Error Display */}
            {(error || nearbyError || searchError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 glass-card rounded-2xl p-4 border-l-4 border-l-red-500"
              >
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <div className="flex-1">
                    <p className="text-red-800 font-medium">Search Error</p>
                    <p className="text-red-700 text-sm">{error || nearbyError || searchError}</p>
                  </div>
                  <motion.button
                    onClick={() => {
                      setError(null);
                      // Also clear location errors if they exist
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    ×
                  </motion.button>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSearch} className="relative">
              <div className="glass-card-strong rounded-2xl p-2 shadow-xl hover-glow-strong">
                <div className="flex items-center relative">
                  <SearchIcon className="absolute left-6 text-indigo-500 w-6 h-6" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      locationSearchMode === 'nearby'
                        ? "Search memories near your current location..."
                        : locationSearchMode === 'place'
                          ? "Enter a place name (e.g., 'Central Park', 'coffee shop', 'downtown')..."
                          : "Ask about your memories... (e.g., 'When is Roshitha's birthday?', 'What's my KYC number?')"
                    }
                    className="flex-1 pl-16 pr-32 py-6 bg-transparent text-lg text-slate-800 placeholder-slate-500 focus:outline-none disabled:opacity-50 font-medium"
                    disabled={loading}
                  />
                  <motion.button
                    type="submit"
                    disabled={loading || !query.trim()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute right-3 glass-button px-8 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Searching...</span>
                      </div>
                    ) : (
                      'Search'
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="chatbot"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto h-[600px]"
          >
            <ChatbotInterface />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal Search Results */}
      {searchMode === 'normal' && (
        <>
          {/* Loading State */}
          {(loading || isLoadingNearby || isLocationSearching) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="glass-card-strong rounded-2xl p-8 flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent absolute top-0"></div>
                </div>
                <div className="text-indigo-600 font-semibold text-lg">
                  {locationSearchMode === 'nearby'
                    ? 'Searching nearby memories...'
                    : locationSearchMode === 'place'
                      ? 'Searching memories by location...'
                      : 'Analyzing your memories with AI...'
                  }
                </div>
                <div className="loading-shimmer w-48 h-2 bg-indigo-100 rounded-full"></div>
              </div>
            </motion.div>
          )}

          {/* Enhanced Search Results */}
          {query && !loading && enhancedSearchResults && locationSearchMode === 'off' && (
            <SearchResults results={enhancedSearchResults} />
          )}

          {/* Location Search Results */}
          {locationSearchMode !== 'off' && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              {(locationSearchMode === 'nearby' ? nearbyMemories : locationSearchResults).length > 0 ? (
                <div className="glass-card rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center mb-4">
                    <MapPin className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-slate-800">
                      {locationSearchMode === 'nearby'
                        ? `Found ${nearbyMemories.length} nearby memories`
                        : `Found ${locationSearchResults.length} memories for "${query}"`
                      }
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {(locationSearchMode === 'nearby' ? nearbyMemories : locationSearchResults).map((memory) => (
                      <div
                        key={memory.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{memory.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-3 h-3 text-green-500" />
                              <span className="text-sm text-gray-600">
                                {memory.location?.address ||
                                  `${memory.location?.city || 'Unknown location'}, ${memory.location?.country || ''}`}
                              </span>
                              {memory.distance !== undefined && (
                                <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full ml-2">
                                  {memory.distance < 1
                                    ? `${Math.round(memory.distance * 1000)}m away`
                                    : `${memory.distance.toFixed(1)}km away`
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{memory.content}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {memory.tags?.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="bg-green-100 text-green-700 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No location-based memories found</h3>
                  <p className="text-gray-600 mb-4">
                    {locationSearchMode === 'nearby'
                      ? 'No memories found in this area. Try increasing the search radius.'
                      : 'No memories found for this location. Try a different place name.'
                    }
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Tip</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      To use location search, you need memories with location data.
                      Create new memories and use the "Capture current location" feature,
                      or add location to existing memories.
                    </p>
                    <button
                      onClick={() => navigate('/memories')}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Create Memory with Location
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Search Tips - Only for Normal Search */}
      {searchMode === 'normal' && !query && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card hover-glow rounded-2xl p-8"
        >
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center mr-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold gradient-text">Search Tips</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              className="space-y-4"
              whileHover={{ x: 5 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">?</span>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">Ask Natural Questions</h4>
              </div>
              <div className="glass-card-strong rounded-xl p-4 space-y-2">
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>"When is [person's] birthday?"</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>"What's my bank account number?"</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>"Tell me about my vacation"</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>"Show me memories about work"</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>"What did I do at Central Park?"</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="space-y-4"
              whileHover={{ x: 5 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">★</span>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">Search Features</h4>
              </div>
              <div className="glass-card-strong rounded-xl p-4 space-y-2">
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>AI generates intelligent answers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Searches memory content and titles</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Finds files by name</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Works with partial information</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>Search by location and proximity</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Search;