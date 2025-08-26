import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Memory } from '../types';
import { MemoryExpirationService } from '../services/memoryExpirationService';

interface MemoryExpirationModalProps {
  memory: Memory;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (memoryId: string, updates: Partial<Memory>) => void;
}

export const MemoryExpirationModal: React.FC<MemoryExpirationModalProps> = ({
  memory,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [selectedHours, setSelectedHours] = useState<number | null>(null);
  const [customHours, setCustomHours] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const expirationService = MemoryExpirationService.getInstance();
  const presets = expirationService.getExpirationPresets();
  const currentStatus = expirationService.getExpirationStatus(memory);

  const handleSetExpiration = async () => {
    setLoading(true);
    try {
      let hours: number | null = null;

      if (isCustom) {
        const customValue = parseInt(customHours);
        if (isNaN(customValue) || customValue <= 0) {
          alert('Please enter a valid number of hours');
          return;
        }
        hours = customValue;
      } else if (selectedHours !== null) {
        hours = selectedHours;
      }

      const success = await expirationService.setMemoryExpiration(memory.id, hours);

      if (success) {
        // Update the memory in the store
        const updates: Partial<Memory> = {
          auto_delete_enabled: hours !== null,
          expires_at: hours ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : undefined
        };
        onUpdate(memory.id, updates);
        onClose();
      }
    } catch (error) {
      console.error('Error setting expiration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableExpiration = async () => {
    setLoading(true);
    try {
      const success = await expirationService.setMemoryExpiration(memory.id, null);

      if (success) {
        const updates: Partial<Memory> = {
          auto_delete_enabled: false,
          expires_at: undefined
        };
        onUpdate(memory.id, updates);
        onClose();
      }
    } catch (error) {
      console.error('Error disabling expiration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md border border-white/50 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-2xl -z-10"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Self-Destruct Timer
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">Auto-delete after specified time</p>
                </div>
              </div>
              {!loading && (
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100/50 rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Current Status */}
            {currentStatus.isExpiring && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {currentStatus.isExpired ? 'Expired' : `Expires in ${currentStatus.timeRemaining}`}
                  </span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  {currentStatus.expirationDate}
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Auto-delete after:
                </label>

                {/* Preset Options */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {presets.map((preset) => (
                    <button
                      key={preset.hours}
                      onClick={() => {
                        setSelectedHours(preset.hours);
                        setIsCustom(false);
                      }}
                      className={`p-3 text-sm rounded-xl border-2 transition-all duration-200 font-medium ${selectedHours === preset.hours && !isCustom
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 text-indigo-700 shadow-sm'
                        : 'bg-white/50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Option */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsCustom(true);
                      setSelectedHours(null);
                    }}
                    className={`px-4 py-3 text-sm rounded-xl border-2 transition-all duration-200 font-medium ${isCustom
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white/50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    Custom
                  </button>
                  {isCustom && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        placeholder="24"
                        min="1"
                        className="w-20 px-3 py-2 text-sm border-2 border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200"
                      />
                      <span className="text-sm text-slate-600 font-medium">hours</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-semibold">Warning: This action cannot be undone</p>
                    <p className="text-xs mt-1 text-red-600">
                      The memory will be permanently deleted when the timer expires.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSetExpiration}
                  disabled={loading || (!selectedHours && !isCustom) || (isCustom && !customHours)}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Setting...' : 'Set Timer'}
                </button>

                {currentStatus.isExpiring && (
                  <button
                    onClick={handleDisableExpiration}
                    disabled={loading}
                    className="flex-1 bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Disabling...' : 'Disable Timer'}
                  </button>
                )}

                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100/50 rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};