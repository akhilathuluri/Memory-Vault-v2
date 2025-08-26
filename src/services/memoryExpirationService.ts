import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export class MemoryExpirationService {
  private static instance: MemoryExpirationService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): MemoryExpirationService {
    if (!MemoryExpirationService.instance) {
      MemoryExpirationService.instance = new MemoryExpirationService();
    }
    return MemoryExpirationService.instance;
  }

  /**
   * Set expiration for a memory
   */
  async setMemoryExpiration(memoryId: string, hours: number | null): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('set_memory_expiration', {
        memory_id: memoryId,
        expiration_hours: hours
      });

      if (error) throw error;

      if (hours === null) {
        toast.success('Auto-delete disabled for memory');
      } else {
        const expirationDate = new Date(Date.now() + hours * 60 * 60 * 1000);
        toast.success(`Memory will auto-delete on ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}`);
      }

      return true;
    } catch (error) {
      console.error('Error setting memory expiration:', error);
      toast.error('Failed to set memory expiration');
      return false;
    }
  }

  /**
   * Get common expiration presets
   */
  getExpirationPresets() {
    return [
      { label: '1 Hour', hours: 1 },
      { label: '6 Hours', hours: 6 },
      { label: '1 Day', hours: 24 },
      { label: '3 Days', hours: 72 },
      { label: '1 Week', hours: 168 },
      { label: '1 Month', hours: 720 },
      { label: '3 Months', hours: 2160 },
      { label: '6 Months', hours: 4320 },
      { label: '1 Year', hours: 8760 }
    ];
  }

  /**
   * Check if a memory is expired
   */
  isMemoryExpired(memory: { expires_at?: string; auto_delete_enabled?: boolean }): boolean {
    if (!memory.auto_delete_enabled || !memory.expires_at) {
      return false;
    }
    return new Date(memory.expires_at) <= new Date();
  }

  /**
   * Get time remaining until expiration
   */
  getTimeUntilExpiration(memory: { expires_at?: string; auto_delete_enabled?: boolean }): string | null {
    if (!memory.auto_delete_enabled || !memory.expires_at) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(memory.expires_at);
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Start automatic cleanup of expired memories
   */
  startAutomaticCleanup(): void {
    // Clean up every 30 seconds for testing (change to 5 minutes in production)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMemories();
    }, 30 * 1000); // 30 seconds for testing

    // Run initial cleanup
    this.cleanupExpiredMemories();
    console.log('🚀 Memory expiration cleanup service started (runs every 30 seconds)');
  }

  /**
   * Stop automatic cleanup
   */
  stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Manually trigger cleanup of expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      console.log('🧹 Running memory cleanup...');
      const { data, error } = await supabase.rpc('cleanup_expired_memories');

      if (error) {
        console.error('❌ Cleanup function error:', error);
        
        // If the RPC function fails, try direct deletion as fallback
        console.log('🔄 Attempting fallback cleanup...');
        return await this.fallbackCleanup();
      }

      const deletedCount = data || 0;
      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} expired memories`);
        toast.success(`Cleaned up ${deletedCount} expired memories`);
        
        // Trigger a memory refresh to update the UI
        this.onMemoriesDeleted?.(deletedCount);
      } else {
        console.log('✅ No expired memories to clean up');
      }

      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired memories:', error);
      
      // Try fallback cleanup
      try {
        return await this.fallbackCleanup();
      } catch (fallbackError) {
        console.error('❌ Fallback cleanup also failed:', fallbackError);
        return 0;
      }
    }
  }

  /**
   * Fallback cleanup method using direct Supabase queries
   */
  private async fallbackCleanup(): Promise<number> {
    try {
      // Get expired memories first
      const { data: expiredMemories, error: selectError } = await supabase
        .from('memories')
        .select('id, title')
        .eq('auto_delete_enabled', true)
        .not('expires_at', 'is', null)
        .lte('expires_at', new Date().toISOString());

      if (selectError) throw selectError;

      if (!expiredMemories || expiredMemories.length === 0) {
        console.log('✅ No expired memories found in fallback cleanup');
        return 0;
      }

      console.log(`🔄 Fallback: Found ${expiredMemories.length} expired memories to delete`);

      // Delete expired memories
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('auto_delete_enabled', true)
        .not('expires_at', 'is', null)
        .lte('expires_at', new Date().toISOString());

      if (deleteError) throw deleteError;

      const deletedCount = expiredMemories.length;
      console.log(`🗑️ Fallback cleanup: Deleted ${deletedCount} expired memories`);
      toast.success(`Cleaned up ${deletedCount} expired memories`);
      
      // Trigger a memory refresh to update the UI
      this.onMemoriesDeleted?.(deletedCount);

      return deletedCount;
    } catch (error) {
      console.error('❌ Fallback cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Set callback for when memories are deleted
   */
  onMemoriesDeleted?: (count: number) => void;

  /**
   * Set the callback for memory deletion events
   */
  setOnMemoriesDeletedCallback(callback: (count: number) => void): void {
    this.onMemoriesDeleted = callback;
  }

  /**
   * Debug method to test cleanup manually
   */
  async testCleanup(): Promise<void> {
    console.log('🧪 Testing memory cleanup manually...');
    const deletedCount = await this.cleanupExpiredMemories();
    console.log(`🧪 Test cleanup completed: ${deletedCount} memories deleted`);
  }

  /**
   * Get expiration status for display
   */
  getExpirationStatus(memory: { expires_at?: string; auto_delete_enabled?: boolean }): {
    isExpiring: boolean;
    timeRemaining: string | null;
    isExpired: boolean;
    expirationDate: string | null;
  } {
    const isExpiring = !!(memory.auto_delete_enabled && memory.expires_at);
    const timeRemaining = this.getTimeUntilExpiration(memory);
    const isExpired = this.isMemoryExpired(memory);
    const expirationDate = memory.expires_at ? new Date(memory.expires_at).toLocaleString() : null;

    return {
      isExpiring,
      timeRemaining,
      isExpired,
      expirationDate
    };
  }
}