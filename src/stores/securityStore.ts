import { create } from 'zustand';
import { SecurityService } from '../services/securityService';
import { SecuritySettings, BiometricCapability, LockState, UnlockMethod } from '../types/security';
import toast from 'react-hot-toast';

interface SecurityStore {
  // State
  settings: SecuritySettings | null;
  lockState: LockState;
  biometricCapability: BiometricCapability | null;
  availableUnlockMethods: UnlockMethod[];
  loading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  checkBiometricCapability: () => Promise<void>;
  setupBiometric: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<boolean>;
  unlockVault: (method: 'biometric' | 'pin', credential?: string) => Promise<boolean>;
  lockVault: (reason?: LockState['lockReason']) => void;
  updateActivity: () => void;
  updateSettings: (updates: Partial<SecuritySettings>) => Promise<void>;
  disableVaultLock: () => Promise<void>;
  refreshLockState: () => void;
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  // Initial state
  settings: null,
  lockState: {
    isLocked: false,
    lockReason: null,
    lastActivity: Date.now(),
    unlockAttempts: 0,
    maxAttempts: 5,
  },
  biometricCapability: null,
  availableUnlockMethods: [],
  loading: false,
  isInitialized: false,

  // Initialize security store
  initialize: async () => {
    const { isInitialized } = get();
    if (isInitialized) {
      console.log('🔧 SecurityStore: Already initialized, skipping');
      return;
    }
    
    try {
      console.log('🔧 SecurityStore: Starting initialization');
      set({ loading: true });
      const securityService = SecurityService.getInstance();
      
      // Subscribe to state changes from the service (only once)
      if (!(window as any).__securityUnsubscribe) {
        const unsubscribe = securityService.onStateChange(() => {
          const lockState = securityService.getLockState();
          console.log('🔄 SecurityStore: State change detected, updating lock state:', lockState);
          set({ lockState });
        });
        
        // Store the unsubscribe function for cleanup
        (window as any).__securityUnsubscribe = unsubscribe;
        console.log('🔧 SecurityStore: State change callback registered');
      }
      
      // Check biometric capability first (doesn't require settings)
      const biometricCapability = await securityService.checkBiometricCapability();
      
      // Load settings (may be null for new users)
      const settings = await securityService.getSecuritySettings();
      
      // Initialize service only if settings exist and vault lock is enabled
      if (settings?.vault_lock_enabled) {
        await securityService.initialize();
      }
      
      // Get current lock state
      const lockState = securityService.getLockState();
      
      // Determine available unlock methods
      const availableUnlockMethods: UnlockMethod[] = [];
      
      if (biometricCapability.isAvailable) {
        availableUnlockMethods.push({
          type: 'biometric',
          available: true,
          enabled: settings?.biometric_enabled || false,
        });
      }
      
      availableUnlockMethods.push({
        type: 'pin',
        available: true,
        enabled: settings?.pin_enabled || false,
      });
      
      set({
        settings,
        lockState,
        biometricCapability,
        availableUnlockMethods,
        loading: false,
        isInitialized: true,
      });
      
    } catch (error) {
      console.error('Failed to initialize security store:', error);
      // Set default state on error
      set({ 
        settings: null,
        lockState: {
          isLocked: false,
          lockReason: null,
          lastActivity: Date.now(),
          unlockAttempts: 0,
          maxAttempts: 5,
        },
        biometricCapability: {
          isAvailable: false,
          biometryType: 'none',
          error: 'Initialization failed'
        },
        availableUnlockMethods: [{
          type: 'pin',
          available: true,
          enabled: false,
        }],
        loading: false,
        isInitialized: true,
      });
    }
  },

  // Check biometric capability
  checkBiometricCapability: async () => {
    try {
      const securityService = SecurityService.getInstance();
      const biometricCapability = await securityService.checkBiometricCapability();
      
      set({ biometricCapability });
      
      // Update available methods
      const { settings } = get();
      const availableUnlockMethods: UnlockMethod[] = [];
      
      if (biometricCapability.isAvailable) {
        availableUnlockMethods.push({
          type: 'biometric',
          available: true,
          enabled: settings?.biometric_enabled || false,
        });
      }
      
      availableUnlockMethods.push({
        type: 'pin',
        available: true,
        enabled: settings?.pin_enabled || false,
      });
      
      set({ availableUnlockMethods });
      
    } catch (error) {
      console.error('Failed to check biometric capability:', error);
    }
  },

  // Setup biometric authentication
  setupBiometric: async () => {
    try {
      const securityService = SecurityService.getInstance();
      const success = await securityService.setupBiometric();
      
      if (success) {
        toast.success('Biometric authentication enabled successfully!');
        
        // Refresh settings
        const settings = await securityService.getSecuritySettings();
        set({ settings });
        
        // Update available methods
        get().checkBiometricCapability();
        
        return true;
      } else {
        toast.error('Failed to setup biometric authentication');
        return false;
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
      toast.error('Biometric setup failed');
      return false;
    }
  },

  // Setup PIN
  setupPin: async (pin: string) => {
    try {
      if (pin.length < 4) {
        toast.error('PIN must be at least 4 digits');
        return false;
      }
      
      const securityService = SecurityService.getInstance();
      const success = await securityService.setupPin(pin);
      
      if (success) {
        toast.success('PIN setup successfully!');
        
        // Refresh settings
        const settings = await securityService.getSecuritySettings();
        set({ settings });
        
        // Update available methods
        get().checkBiometricCapability();
        
        return true;
      } else {
        toast.error('Failed to setup PIN');
        return false;
      }
    } catch (error) {
      console.error('PIN setup failed:', error);
      toast.error('PIN setup failed');
      return false;
    }
  },

  // Unlock vault
  unlockVault: async (method: 'biometric' | 'pin', credential?: string) => {
    try {
      const securityService = SecurityService.getInstance();
      const success = await securityService.unlockVault(method, credential);
      
      if (success) {
        const lockState = securityService.getLockState();
        set({ lockState });
        toast.success('Vault unlocked successfully!');
        return true;
      } else {
        const lockState = securityService.getLockState();
        set({ lockState });
        
        if (lockState.unlockAttempts >= lockState.maxAttempts) {
          toast.error('Too many failed attempts. Please try again later.');
        } else {
          toast.error(`Unlock failed. ${lockState.maxAttempts - lockState.unlockAttempts} attempts remaining.`);
        }
        return false;
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      toast.error('Unlock failed');
      return false;
    }
  },

  // Lock vault
  lockVault: (reason = 'manual') => {
    console.log('🔒 SecurityStore: Lock vault called with reason:', reason);
    const securityService = SecurityService.getInstance();
    securityService.lockVault(reason);
    
    // The state change callback will handle updating the store
    if (reason === 'manual') {
      toast.success('Vault locked');
    }
  },

  // Update activity
  updateActivity: () => {
    const securityService = SecurityService.getInstance();
    securityService.updateActivity();
    
    const lockState = securityService.getLockState();
    set({ lockState });
  },

  // Update settings
  updateSettings: async (updates: Partial<SecuritySettings>) => {
    try {
      const securityService = SecurityService.getInstance();
      await securityService.updateSecuritySettings(updates);
      
      const settings = await securityService.getSecuritySettings();
      set({ settings });
      
      toast.success('Security settings updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update security settings');
    }
  },

  // Disable vault lock
  disableVaultLock: async () => {
    try {
      const securityService = SecurityService.getInstance();
      await securityService.disableVaultLock();
      
      const settings = await securityService.getSecuritySettings();
      const lockState = securityService.getLockState();
      
      set({ settings, lockState });
      
      toast.success('Vault lock disabled');
    } catch (error) {
      console.error('Failed to disable vault lock:', error);
      toast.error('Failed to disable vault lock');
    }
  },

  // Refresh lock state
  refreshLockState: () => {
    const securityService = SecurityService.getInstance();
    const lockState = securityService.getLockState();
    set({ lockState });
    return lockState.isLocked;
  },
}));