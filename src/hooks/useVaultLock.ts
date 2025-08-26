import { useEffect, useCallback } from 'react';
import { useSecurityStore } from '../stores/securityStore';
import { LockState } from '../types/security';

export const useVaultLock = () => {
  const { 
    lockState, 
    settings, 
    updateActivity, 
    lockVault, 
    initialize,
    refreshLockState 
  } = useSecurityStore();

  // Initialize security on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Activity tracking
  const trackActivity = useCallback(() => {
    if (settings?.vault_lock_enabled && !lockState.isLocked) {
      updateActivity();
    }
  }, [settings?.vault_lock_enabled, lockState.isLocked, updateActivity]);

  // Set up activity listeners
  useEffect(() => {
    if (!settings?.vault_lock_enabled) return;

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const throttledTrackActivity = throttle(trackActivity, 1000);

    events.forEach(event => {
      document.addEventListener(event, throttledTrackActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledTrackActivity, true);
      });
    };
  }, [settings?.vault_lock_enabled, trackActivity]);

  // Handle visibility change (minimize/focus)
  useEffect(() => {
    if (!settings?.vault_lock_enabled || !settings?.auto_lock_on_minimize) return;

    const handleVisibilityChange = () => {
      console.log('🔍 Visibility change:', document.hidden ? 'hidden' : 'visible', 'current lock state:', lockState.isLocked);
      if (document.hidden && !lockState.isLocked) {
        console.log('🔒 Scheduling lock due to visibility change');
        // Add delay to prevent locking during unlock process
        setTimeout(() => {
          const { lockState: currentState } = useSecurityStore.getState();
          console.log('🔍 Checking lock state after visibility delay:', currentState.isLocked);
          if (!currentState.isLocked) {
            lockVault('minimize');
          }
        }, 300);
      }
    };

    // Remove pagehide and beforeunload as they conflict with visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings?.vault_lock_enabled, settings?.auto_lock_on_minimize, lockState.isLocked, lockVault]);

  // Handle window blur (for desktop apps)
  useEffect(() => {
    if (!settings?.vault_lock_enabled || !settings?.auto_lock_on_minimize) return;

    const handleWindowBlur = () => {
      console.log('🔍 Window blur event, current lock state:', lockState.isLocked);
      if (!lockState.isLocked) {
        console.log('🔒 Scheduling lock due to window blur');
        // Add a longer delay to prevent accidental locks during unlock process
        setTimeout(() => {
          refreshLockState();
          const { lockState: currentState } = useSecurityStore.getState();
          console.log('🔍 Checking lock state after blur delay:', currentState.isLocked);
          if (!currentState.isLocked) {
            lockVault('minimize');
          }
        }, 500); // Increased delay
      }
    };

    const handleWindowFocus = () => {
      console.log('🔍 Window focus event');
      // Refresh lock state when window regains focus
      refreshLockState();
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [settings?.vault_lock_enabled, settings?.auto_lock_on_minimize, lockState.isLocked, lockVault, refreshLockState]);

  // Periodic lock state refresh
  useEffect(() => {
    if (!settings?.vault_lock_enabled) return;

    const interval = setInterval(refreshLockState, 5000);
    return () => clearInterval(interval);
  }, [settings?.vault_lock_enabled, refreshLockState]);

  return {
    isLocked: lockState.isLocked,
    lockReason: lockState.lockReason,
    isEnabled: settings?.vault_lock_enabled || false,
    trackActivity,
    lockVault: useCallback((reason?: LockState['lockReason']) => {
      console.log('🔒 Manual lock triggered:', reason);
      lockVault(reason);
    }, [lockVault]),
  };
};

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}