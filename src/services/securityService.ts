import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { SecuritySettings, BiometricCapability, LockState } from '../types/security';
import CryptoJS from 'crypto-js';

class SecurityService {
  private static instance: SecurityService;
  private lockState: LockState = {
    isLocked: false,
    lockReason: null,
    lastActivity: Date.now(),
    unlockAttempts: 0,
    maxAttempts: 5
  };
  private activityTimer: NodeJS.Timeout | null = null;
  private lockTimeout: number = 15; // Default 15 minutes
  private stateChangeCallbacks: Set<() => void> = new Set();
  private lastLockTime: number = 0;
  private lockDebounceMs: number = 1000; // Prevent multiple locks within 1 second
  private isInitialized: boolean = false;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 SecurityService: Initialize called, isInitialized:', this.isInitialized);
      
      const settings = await this.getSecuritySettings();
      if (settings?.vault_lock_enabled) {
        this.lockTimeout = settings.lock_timeout || 15;
        this.startActivityMonitoring();
        
        // Only lock on startup during the first initialization
        if (!this.isInitialized) {
          console.log('🔒 SecurityService: First initialization - locking on startup');
          this.lockVault('startup');
          this.isInitialized = true;
        } else {
          console.log('🔓 SecurityService: Already initialized - skipping startup lock');
        }
      }
    } catch (error) {
      console.error('Failed to initialize security service:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Check biometric capabilities
   */
  async checkBiometricCapability(): Promise<BiometricCapability> {
    try {
      // Check if Web Authentication API is available
      if (!window.PublicKeyCredential) {
        return {
          isAvailable: false,
          biometryType: 'none',
          error: 'WebAuthn not supported'
        };
      }

      // Check if biometric authentication is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        return {
          isAvailable: false,
          biometryType: 'none',
          error: 'No biometric authenticator available'
        };
      }

      // Detect biometry type based on platform
      let biometryType: 'fingerprint' | 'face' | 'voice' | 'none' = 'fingerprint';
      
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        biometryType = 'face'; // Assume Face ID on newer iOS devices
      } else if (navigator.userAgent.includes('Android')) {
        biometryType = 'fingerprint'; // Most Android devices use fingerprint
      } else if (navigator.userAgent.includes('Windows')) {
        biometryType = 'fingerprint'; // Windows Hello typically fingerprint
      }

      return {
        isAvailable: true,
        biometryType,
      };
    } catch (error) {
      return {
        isAvailable: false,
        biometryType: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup biometric authentication
   */
  async setupBiometric(): Promise<boolean> {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'Memory Vault',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || 'user',
            displayName: user.email || 'Memory Vault User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      });

      if (credential) {
        // Store credential ID for future authentication
        await this.updateSecuritySettings({
          biometric_enabled: true,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric setup failed:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
        },
      });

      return !!credential;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Setup PIN
   */
  async setupPin(pin: string): Promise<boolean> {
    try {
      const pinHash = CryptoJS.SHA256(pin).toString();
      await this.updateSecuritySettings({
        pin_enabled: true,
        pin_hash: pinHash,
      });
      return true;
    } catch (error) {
      console.error('PIN setup failed:', error);
      return false;
    }
  }

  /**
   * Authenticate with PIN
   */
  async authenticateWithPin(pin: string): Promise<boolean> {
    try {
      const settings = await this.getSecuritySettings();
      if (!settings?.pin_hash) return false;

      const pinHash = CryptoJS.SHA256(pin).toString();
      return pinHash === settings.pin_hash;
    } catch (error) {
      console.error('PIN authentication failed:', error);
      return false;
    }
  }

  /**
   * Lock the vault
   */
  lockVault(reason: LockState['lockReason'] = 'manual'): void {
    const now = Date.now();
    
    // Prevent multiple locks in quick succession (debounce)
    if (this.lockState.isLocked || (now - this.lastLockTime) < this.lockDebounceMs) {
      console.log('🔒 SecurityService: Lock request ignored (already locked or too soon)');
      return;
    }
    
    console.log('🔒 SecurityService: Locking vault with reason:', reason);
    this.lastLockTime = now;
    
    this.lockState = {
      ...this.lockState,
      isLocked: true,
      lockReason: reason,
      unlockAttempts: 0,
    };
    
    // Clear activity timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    
    // Notify all listeners about state change
    this.notifyStateChange();
  }

  /**
   * Unlock the vault
   */
  async unlockVault(method: 'biometric' | 'pin', credential?: string): Promise<boolean> {
    try {
      let authenticated = false;

      if (method === 'biometric') {
        authenticated = await this.authenticateWithBiometric();
      } else if (method === 'pin' && credential) {
        authenticated = await this.authenticateWithPin(credential);
      }

      if (authenticated) {
        console.log('🔓 SecurityService: Unlocking vault successfully');
        this.lockState = {
          ...this.lockState,
          isLocked: false,
          lockReason: null,
          unlockAttempts: 0,
          lastActivity: Date.now(),
        };
        this.lastLockTime = 0; // Reset lock debounce
        this.startActivityMonitoring();
        this.notifyStateChange();
        return true;
      } else {
        this.lockState.unlockAttempts++;
        return false;
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      this.lockState.unlockAttempts++;
      return false;
    }
  }

  /**
   * Update user activity
   */
  updateActivity(): void {
    if (!this.lockState.isLocked) {
      this.lockState.lastActivity = Date.now();
      this.startActivityMonitoring();
      // Don't notify for activity updates as they're frequent
    }
  }

  /**
   * Start activity monitoring
   */
  private startActivityMonitoring(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = setTimeout(() => {
      console.log('⏰ SecurityService: Auto-locking due to timeout');
      this.lockVault('timeout');
    }, this.lockTimeout * 60 * 1000);
  }

  /**
   * Get current lock state
   */
  getLockState(): LockState {
    return { ...this.lockState };
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings | null> {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return null;

      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching security settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get security settings:', error);
      return null;
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(updates: Partial<SecuritySettings>): Promise<void> {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const existing = await this.getSecuritySettings();
      
      if (existing) {
        const { error } = await supabase
          .from('security_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('security_settings')
          .insert([{
            user_id: user.id,
            vault_lock_enabled: false,
            biometric_enabled: false,
            pin_enabled: false,
            lock_timeout: 15,
            auto_lock_on_minimize: true,
            ...updates,
          }])
          .select()
          .single();

        if (error) throw error;
      }

      // Update local timeout if changed
      if (updates.lock_timeout) {
        this.lockTimeout = updates.lock_timeout;
      }
    } catch (error) {
      console.error('Failed to update security settings:', error);
      throw error;
    }
  }

  /**
   * Disable vault lock
   */
  async disableVaultLock(): Promise<void> {
    await this.updateSecuritySettings({
      vault_lock_enabled: false,
      biometric_enabled: false,
      pin_enabled: false,
    });
    
    this.lockState = {
      isLocked: false,
      lockReason: null,
      lastActivity: Date.now(),
      unlockAttempts: 0,
      maxAttempts: 5,
    };
    
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    
    this.notifyStateChange();
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: () => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all listeners about state change
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }
}

export { SecurityService };