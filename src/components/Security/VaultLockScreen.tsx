import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Fingerprint, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Smartphone,
  Laptop
} from 'lucide-react';
import { useSecurityStore } from '../../stores/securityStore';

interface VaultLockScreenProps {
  onUnlock: () => void;
}

const VaultLockScreen: React.FC<VaultLockScreenProps> = ({ onUnlock }) => {
  const {
    lockState,
    availableUnlockMethods,
    biometricCapability,
    unlockVault,
    refreshLockState
  } = useSecurityStore();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'biometric' | 'pin'>('pin');

  // Auto-select best available method
  useEffect(() => {
    const biometricMethod = availableUnlockMethods.find(m => m.type === 'biometric' && m.enabled);
    const pinMethod = availableUnlockMethods.find(m => m.type === 'pin' && m.enabled);
    
    if (biometricMethod) {
      setSelectedMethod('biometric');
    } else if (pinMethod) {
      setSelectedMethod('pin');
    }
  }, [availableUnlockMethods]);

  // Refresh lock state periodically
  useEffect(() => {
    const interval = setInterval(refreshLockState, 1000);
    return () => clearInterval(interval);
  }, [refreshLockState]);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    
    setIsUnlocking(true);
    
    try {
      let success = false;
      
      console.log('🔓 VaultLockScreen: Attempting unlock with method:', selectedMethod);
      
      if (selectedMethod === 'biometric') {
        success = await unlockVault('biometric');
      } else if (selectedMethod === 'pin' && pin) {
        success = await unlockVault('pin', pin);
      }
      
      console.log('🔓 VaultLockScreen: Unlock result:', success);
      
      if (success) {
        // Wait a moment for the state to propagate, then call onUnlock
        setTimeout(() => {
          console.log('🔓 VaultLockScreen: Calling onUnlock callback');
          onUnlock();
        }, 100);
      } else {
        setPin('');
      }
    } catch (error) {
      console.error('Unlock error:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handlePinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handleUnlock();
    }
  };

  const getLockReasonMessage = () => {
    switch (lockState.lockReason) {
      case 'timeout':
        return 'Vault locked due to inactivity';
      case 'manual':
        return 'Vault manually locked';
      case 'minimize':
        return 'Vault locked when minimized';
      case 'startup':
        return 'Vault locked on startup';
      default:
        return 'Vault is locked';
    }
  };

  const getBiometricIcon = () => {
    switch (biometricCapability?.biometryType) {
      case 'face':
        return <Eye className="w-8 h-8" />;
      case 'fingerprint':
        return <Fingerprint className="w-8 h-8" />;
      default:
        return <Fingerprint className="w-8 h-8" />;
    }
  };

  const getDeviceIcon = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />;
  };

  const biometricMethod = availableUnlockMethods.find(m => m.type === 'biometric' && m.enabled);
  const pinMethod = availableUnlockMethods.find(m => m.type === 'pin' && m.enabled);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative glass-card-strong rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-2xl heading-display gradient-text mb-2">
            Memory Vault Locked
          </h1>
          
          <div className="flex items-center justify-center space-x-2 text-slate-600">
            {getDeviceIcon()}
            <p className="text-body-medium">{getLockReasonMessage()}</p>
          </div>
        </div>

        {/* Unlock Methods */}
        <div className="space-y-4 mb-6">
          {/* Method Selection */}
          {biometricMethod && pinMethod && (
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setSelectedMethod('biometric')}
                className={`flex-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedMethod === 'biometric'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {getBiometricIcon()}
                  <span className="text-sm font-medium">
                    {biometricCapability?.biometryType === 'face' ? 'Face ID' : 'Biometric'}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedMethod('pin')}
                className={`flex-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedMethod === 'pin'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="w-6 h-6" />
                  <span className="text-sm font-medium">PIN</span>
                </div>
              </button>
            </div>
          )}

          {/* Biometric Unlock */}
          <AnimatePresence>
            {selectedMethod === 'biometric' && biometricMethod && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-center"
              >
                <motion.button
                  onClick={handleUnlock}
                  disabled={isUnlocking}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isUnlocking ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                  ) : (
                    getBiometricIcon()
                  )}
                </motion.button>
                
                <p className="text-slate-600 text-sm">
                  {biometricCapability?.biometryType === 'face' 
                    ? 'Look at your device to unlock' 
                    : 'Touch the sensor to unlock'
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PIN Unlock */}
          <AnimatePresence>
            {selectedMethod === 'pin' && pinMethod && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyPress={handlePinKeyPress}
                    placeholder="Enter your PIN"
                    className="w-full p-4 pr-12 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-center text-lg tracking-widest bg-white/80 backdrop-blur-sm"
                    maxLength={8}
                    autoFocus
                  />
                  
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                <motion.button
                  onClick={handleUnlock}
                  disabled={pin.length < 4 || isUnlocking}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200"
                >
                  {isUnlocking ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Unlocking...</span>
                    </div>
                  ) : (
                    'Unlock Vault'
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Failed Attempts Warning */}
        {lockState.unlockAttempts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {lockState.unlockAttempts} failed attempt{lockState.unlockAttempts > 1 ? 's' : ''}. 
              {lockState.maxAttempts - lockState.unlockAttempts} remaining.
            </span>
          </motion.div>
        )}

        {/* No Methods Available */}
        {availableUnlockMethods.filter(m => m.enabled).length === 0 && (
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm mb-3">
              No unlock methods configured. 
            </p>
            <p className="text-xs text-yellow-600">
              This usually happens when vault lock is enabled but no authentication methods are set up.
              Please disable vault lock in Settings or contact support.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VaultLockScreen;