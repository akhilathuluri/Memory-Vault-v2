import { Memory, FileRecord } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

interface CacheConfig {
  memoriesTimeout: number; // milliseconds
  filesTimeout: number; // milliseconds
  maxAge: number; // maximum age before forced refresh
}

class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, CacheEntry<Memory[]>> = new Map();
  private fileCache: Map<string, CacheEntry<FileRecord[]>> = new Map();
  private lastFetchTimes: Map<string, number> = new Map();
  
  private config: CacheConfig = {
    memoriesTimeout: 5 * 60 * 1000, // 5 minutes
    filesTimeout: 10 * 60 * 1000, // 10 minutes
    maxAge: 30 * 60 * 1000, // 30 minutes max age
  };

  private constructor() {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Memory caching methods
  getCachedMemories(userId: string): Memory[] | null {
    const cacheKey = `memories_${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.expires) {
      this.memoryCache.delete(cacheKey);
      return null;
    }
    
    console.log('📋 Using cached memories for user:', userId);
    return cached.data;
  }

  setCachedMemories(userId: string, memories: Memory[]): void {
    const cacheKey = `memories_${userId}`;
    const now = Date.now();
    
    this.memoryCache.set(cacheKey, {
      data: [...memories], // Create a copy to prevent mutations
      timestamp: now,
      expires: now + this.config.memoriesTimeout,
    });
    
    this.lastFetchTimes.set(cacheKey, now);
    console.log('💾 Cached memories for user:', userId, 'Count:', memories.length);
  }

  // File caching methods
  getCachedFiles(userId: string): FileRecord[] | null {
    const cacheKey = `files_${userId}`;
    const cached = this.fileCache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.expires) {
      this.fileCache.delete(cacheKey);
      return null;
    }
    
    console.log('📁 Using cached files for user:', userId);
    return cached.data;
  }

  setCachedFiles(userId: string, files: FileRecord[]): void {
    const cacheKey = `files_${userId}`;
    const now = Date.now();
    
    this.fileCache.set(cacheKey, {
      data: [...files], // Create a copy to prevent mutations
      timestamp: now,
      expires: now + this.config.filesTimeout,
    });
    
    this.lastFetchTimes.set(cacheKey, now);
    console.log('💾 Cached files for user:', userId, 'Count:', files.length);
  }

  // Cache invalidation methods
  invalidateMemoriesCache(userId: string): void {
    const cacheKey = `memories_${userId}`;
    this.memoryCache.delete(cacheKey);
    this.lastFetchTimes.delete(cacheKey);
    console.log('🗑️ Invalidated memories cache for user:', userId);
  }

  invalidateFilesCache(userId: string): void {
    const cacheKey = `files_${userId}`;
    this.fileCache.delete(cacheKey);
    this.lastFetchTimes.delete(cacheKey);
    console.log('🗑️ Invalidated files cache for user:', userId);
  }

  // Check if we need to refresh data
  shouldRefreshMemories(userId: string): boolean {
    const cacheKey = `memories_${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    const lastFetch = this.lastFetchTimes.get(cacheKey);
    
    if (!cached || !lastFetch) return true;
    
    const now = Date.now();
    const isExpired = now > cached.expires;
    const isTooOld = now - lastFetch > this.config.maxAge;
    
    return isExpired || isTooOld;
  }

  shouldRefreshFiles(userId: string): boolean {
    const cacheKey = `files_${userId}`;
    const cached = this.fileCache.get(cacheKey);
    const lastFetch = this.lastFetchTimes.get(cacheKey);
    
    if (!cached || !lastFetch) return true;
    
    const now = Date.now();
    const isExpired = now > cached.expires;
    const isTooOld = now - lastFetch > this.config.maxAge;
    
    return isExpired || isTooOld;
  }

  // Add new memory to cache without refetching
  addMemoryToCache(userId: string, memory: Memory): void {
    const cacheKey = `memories_${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (cached) {
      // Add to the beginning of the array (newest first)
      const updatedMemories = [memory, ...cached.data];
      this.setCachedMemories(userId, updatedMemories);
      console.log('➕ Added new memory to cache for user:', userId);
    }
  }

  // Update memory in cache
  updateMemoryInCache(userId: string, memoryId: string, updates: Partial<Memory>): void {
    const cacheKey = `memories_${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (cached) {
      const updatedMemories = cached.data.map(memory => 
        memory.id === memoryId ? { ...memory, ...updates } : memory
      );
      this.setCachedMemories(userId, updatedMemories);
      console.log('✏️ Updated memory in cache for user:', userId);
    }
  }

  // Remove memory from cache
  removeMemoryFromCache(userId: string, memoryId: string): void {
    const cacheKey = `memories_${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (cached) {
      const updatedMemories = cached.data.filter(memory => memory.id !== memoryId);
      this.setCachedMemories(userId, updatedMemories);
      console.log('➖ Removed memory from cache for user:', userId);
    }
  }

  // Add new file to cache without refetching
  addFileToCache(userId: string, file: FileRecord): void {
    const cacheKey = `files_${userId}`;
    const cached = this.fileCache.get(cacheKey);
    
    if (cached) {
      // Add to the beginning of the array (newest first)
      const updatedFiles = [file, ...cached.data];
      this.setCachedFiles(userId, updatedFiles);
      console.log('➕ Added new file to cache for user:', userId);
    }
  }

  // Remove file from cache
  removeFileFromCache(userId: string, fileId: string): void {
    const cacheKey = `files_${userId}`;
    const cached = this.fileCache.get(cacheKey);
    
    if (cached) {
      const updatedFiles = cached.data.filter(file => file.id !== fileId);
      this.setCachedFiles(userId, updatedFiles);
      console.log('➖ Removed file from cache for user:', userId);
    }
  }

  // Cleanup expired cache entries
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expires) {
        this.memoryCache.delete(key);
        this.lastFetchTimes.delete(key);
        cleanedCount++;
      }
    }

    // Clean file cache
    for (const [key, entry] of this.fileCache.entries()) {
      if (now > entry.expires) {
        this.fileCache.delete(key);
        this.lastFetchTimes.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log('🧹 Cleaned up', cleanedCount, 'expired cache entries');
    }
  }

  // Get cache statistics
  getCacheStats(): {
    memoriesEntries: number;
    filesEntries: number;
    totalMemoryUsage: number;
  } {
    return {
      memoriesEntries: this.memoryCache.size,
      filesEntries: this.fileCache.size,
      totalMemoryUsage: this.memoryCache.size + this.fileCache.size,
    };
  }

  // Clear all cache (useful for logout)
  clearAllCache(): void {
    this.memoryCache.clear();
    this.fileCache.clear();
    this.lastFetchTimes.clear();
    console.log('🗑️ Cleared all cache');
  }
}

export { CacheService };
