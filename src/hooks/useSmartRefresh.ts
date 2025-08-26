import { useEffect, useRef } from 'react';
import { CacheService } from '../services/cacheService';

interface UseSmartRefreshOptions {
  fetchFunction: () => Promise<void>;
  userId: string | null;
  dataType: 'memories' | 'files';
  dependencies?: any[];
  manualRefresh?: boolean;
}

/**
 * Hook to manage smart data refreshing with caching
 * Only fetches data when necessary based on cache state
 */
export const useSmartRefresh = ({
  fetchFunction,
  userId,
  dataType,
  dependencies = [],
  manualRefresh = false
}: UseSmartRefreshOptions) => {
  const mountedRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    // Skip if no user or no fetch function
    if (!userId || !fetchFunction) return;

    const cacheService = CacheService.getInstance();
    const shouldRefresh = dataType === 'memories' 
      ? cacheService.shouldRefreshMemories(userId)
      : cacheService.shouldRefreshFiles(userId);

    // Always fetch on first mount or when manual refresh is requested
    const shouldFetchNow = !mountedRef.current || manualRefresh || shouldRefresh;

    if (shouldFetchNow) {
      const now = Date.now();
      
      // Prevent rapid successive calls (debounce by 1 second)
      if (now - lastFetchRef.current > 1000) {
        console.log(`🔄 Smart refresh: Fetching ${dataType} for user ${userId}`);
        fetchFunction();
        lastFetchRef.current = now;
        mountedRef.current = true;
      }
    } else {
      console.log(`⚡ Smart refresh: Using cached ${dataType} for user ${userId}`);
      mountedRef.current = true;
    }
  }, [userId, fetchFunction, dataType, manualRefresh, ...dependencies]);

  // Return a manual refresh function
  const forceRefresh = () => {
    if (userId && fetchFunction) {
      console.log(`🔄 Force refresh: Fetching ${dataType} for user ${userId}`);
      
      // Clear cache to force fresh data
      const cacheService = CacheService.getInstance();
      if (dataType === 'memories') {
        cacheService.invalidateMemoriesCache(userId);
      } else {
        cacheService.invalidateFilesCache(userId);
      }
      
      fetchFunction();
      lastFetchRef.current = Date.now();
    }
  };

  return {
    forceRefresh,
    isInitialized: mountedRef.current
  };
};
