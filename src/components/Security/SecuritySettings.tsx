import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Fingerprint, 
  Lock, 
  Clock, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  Smartphone,
  Monitor,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useSecurityStore } from '../../stores/securityStore';
import LockTestButton from './LockTestButton';

const SecuritySettings: React.FC = () => {
  const {
    settings,
    biometricCapability,
    availableUnlockMethods,
    loading,
    initialize,
    setupBiometric,
    setupPin,
    updateSettings,
    disableVaultLock,
    lockVault
  } = useSecurityStore();

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleEnableVaultLock = async () => {
    try {
      await updateSettings({
        vault_lock_enabled: true,
        lock_timeout: 15,
        auto_lock_on_minimize: true,
      });
    } catch (error) {
      console.error('Failed to enable vault lock:', error);
    }
  };

  const handleDisableVaultLock = async () => {
    try {
      await disableVaultLock();
    } catch (error) {
      console.error('Failed to disable vault lock:', error);
    }
  };

  const handleSetupBiometric = async () => {
    setIsSettingUp(true);
    try {
      await setupBiometric();
    } catch (error) {
      console.error('Biometric setup failed:', error);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSetupPin = async () => {
    if (pin.length < 4) {
      return;
    }
    
    if (pin !== confirmPin) {
      return;
    }

    setIsSettingUp(true);
    try {
      const success = await setupPin(pin);
      if (success) {
        setShowPinSetup(false);
        setPin('');
        setConfirmPin('');
      }
    } catch (error) {
      console.error('PIN setup failed:', error);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleLockTimeoutChange = async (timeout: number) => {
    try {
      await updateSettings({ lock_timeout: timeout });
    } catch (error) {
      console.error('Failed to update lock timeout:', error);
    }
  };

  const handleAutoLockToggle = async () => {
    try {
      await updateSettings({ 
        auto_lock_on_minimize: !settings?.auto_lock_on_minimize 
      });
    } catch (error) {
      console.error('Failed to update auto lock setting:', error);
    }
  };

  const biometricMethod = availableUnlockMethods.find(m => m.type === 'biometric');
  const pinMethod = availableUnlockMethods.find(m => m.type === 'pin');

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Test Component */}
      <LockTestButton />
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl heading-lg gradient-text">Vault Security</h2>
            <p className="text-body-medium text-slate-600">
              Protect your memories with biometric and PIN authentication
            </p>
          </div>
        </div>

        {/* Device Info */}
        <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-600">
            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
            <span className="text-sm">
              {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile Device' : 'Desktop Device'}
            </span>
          </div>
          
          {biometricCapability?.isAvailable && (
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm">
                {biometricCapability.biometryType === 'face' ? 'Face ID Available' : 'Biometric Available'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Vault Lock Toggle */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Vault Lock</h3>
            <p className="text-sm text-slate-600">
              Enable security protection for your Memory Vault
            </p>
          </div>
          
          <motion.button
            onClick={settings?.vault_lock_enabled ? handleDisableVaultLock : handleEnableVaultLock}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
              settings?.vault_lock_enabled ? 'bg-blue-500' : 'bg-slate-300'
            }`}
          >
            <motion.div
              animate={{
                x: settings?.vault_lock_enabled ? 24 : 2,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
            />
          </motion.button>
        </div>

        {settings?.vault_lock_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 border-t border-slate-200"
          >
            {/* Test Lock Button */}
            <button
              onClick={() => {
                console.log('🔒 Test Lock button clicked');
                lockVault('manual');
              }}
              className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
            >
              Test Lock Now
            </button>
          </motion.div>
        )}
      </div>

      {/* Authentication Methods */}
      {settings?.vault_lock_enabled && (
        <div className="space-y-4">
          {/* Biometric Authentication */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                  <Fingerprint className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {biometricCapability?.biometryType === 'face' ? 'Face ID' : 'Biometric Authentication'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {biometricCapability?.isAvailable 
                      ? `Use your device's ${biometricCapability.biometryType} sensor`
                      : 'Not available on this device'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {biometricMethod?.enabled && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Enabled</span>
                  </div>
                )}
                
                {biometricCapability?.isAvailable && !biometricMethod?.enabled && (
                  <button
                    onClick={handleSetupBiometric}
                    disabled={isSettingUp}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isSettingUp ? 'Setting up...' : 'Enable'}
                  </button>
                )}
                
                {!biometricCapability?.isAvailable && (
                  <div className="flex items-center space-x-1 text-slate-400">
                    <X className="w-4 h-4" />
                    <span className="text-sm">Not Available</span>
                  </div>
                )}
              </div>
            </div>
            
            {biometricCapability?.error && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{biometricCapability.error}</span>
              </div>
            )}
          </div>

          {/* PIN Authentication */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">PIN Authentication</h3>
                  <p className="text-sm text-slate-600">
                    Use a numeric PIN to unlock your vault
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {pinMethod?.enabled && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Enabled</span>
                  </div>
                )}
                
                <button
                  onClick={() => setShowPinSetup(!showPinSetup)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  {pinMethod?.enabled ? 'Change PIN' : 'Setup PIN'}
                </button>
              </div>
            </div>

            {/* PIN Setup Form */}
            {showPinSetup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-slate-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Enter PIN (4-8 digits)"
                      className="w-full p-3 pr-10 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-center tracking-widest"
                      maxLength={8}
                    />
                    <button
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Confirm PIN"
                      className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-center tracking-widest"
                      maxLength={8}
                    />
                  </div>
                </div>
                
                {pin && confirmPin && pin !== confirmPin && (
                  <div className="text-red-600 text-sm">PINs do not match</div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleSetupPin}
                    disabled={pin.length < 4 || pin !== confirmPin || isSettingUp}
                    className="flex-1 p-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    {isSettingUp ? 'Setting up...' : 'Save PIN'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowPinSetup(false);
                      setPin('');
                      setConfirmPin('');
                    }}
                    className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-medium hover:border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Lock Settings */}
      {settings?.vault_lock_enabled && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Lock Settings</h3>
              <p className="text-sm text-slate-600">Configure when your vault locks</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Auto Lock Timeout */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-slate-600" />
                <label className="text-sm font-medium text-slate-700">
                  Auto-lock after inactivity
                </label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[5, 15, 30, 60].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => handleLockTimeoutChange(minutes)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      settings?.lock_timeout === minutes
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Lock on Minimize */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Lock when app is minimized
                </label>
                <p className="text-xs text-slate-500">
                  Automatically lock when switching to other apps
                </p>
              </div>
              
              <motion.button
                onClick={handleAutoLockToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  settings?.auto_lock_on_minimize ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  animate={{
                    x: settings?.auto_lock_on_minimize ? 24 : 2,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                />
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;