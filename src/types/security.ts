export interface SecuritySettings {
  id: string;
  user_id: string;
  vault_lock_enabled: boolean;
  biometric_enabled: boolean;
  pin_enabled: boolean;
  pin_hash?: string;
  lock_timeout: number; // minutes of inactivity before lock
  auto_lock_on_minimize: boolean;
  created_at: string;
  updated_at: string;
}

export interface BiometricCapability {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'face' | 'voice' | 'none';
  error?: string;
}

export interface LockState {
  isLocked: boolean;
  lockReason: 'timeout' | 'manual' | 'minimize' | 'startup' | null;
  lastActivity: number;
  unlockAttempts: number;
  maxAttempts: number;
}

export interface UnlockMethod {
  type: 'biometric' | 'pin';
  available: boolean;
  enabled: boolean;
}