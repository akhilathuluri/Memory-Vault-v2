import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { CacheService } from '../services/cacheService';

/**
 * Hook to manage cache lifecycle based on authentication state
 * Automatically clears cache when user logs out
 */
export const useCacheLifecycle = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    // Clear cache when user logs out
    if (!user) {
      const cacheService = CacheService.getInstance();
      cacheService.clearAllCache();
      console.log('🔓 User logged out, cleared all cache');
    }
  }, [user]);

  return {
    clearCache: () => {
      const cacheService = CacheService.getInstance();
      cacheService.clearAllCache();
    },
    getCacheStats: () => {
      const cacheService = CacheService.getInstance();
      return cacheService.getCacheStats();
    }
  };
};
