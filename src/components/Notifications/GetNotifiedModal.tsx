import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Clock, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { format } from 'date-fns';

interface GetNotifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GetNotifiedModal: React.FC<GetNotifiedModalProps> = ({ isOpen, onClose }) => {
  const { createNotification, creating } = useNotificationStore();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.scheduledDate || !formData.scheduledTime) {
      return;
    }

    // Combine date and time
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    
    // Check if scheduled time is in the future
    if (scheduledDateTime <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    const success = await createNotification({
      title: formData.title,
      description: formData.description,
      scheduled_time: scheduledDateTime.toISOString()
    });

    if (success) {
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        scheduledDate: '',
        scheduledTime: ''
      });
      onClose();
    }
  };

  const handleClose = () => {
    if (!creating) {
      setFormData({
        title: '',
        description: '',
        scheduledDate: '',
        scheduledTime: ''
      });
      onClose();
    }
  };

  // Get minimum date (today)
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = format(new Date(), 'HH:mm');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-start justify-center p-4 z-50 overflow-y-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md border border-white/50 shadow-2xl my-8 mx-auto max-h-[90vh] overflow-y-auto"
          >
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-2xl -z-10"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Get Notified
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">Schedule a reminder via Telegram</p>
                </div>
              </div>
              {!creating && (
                <button
                  onClick={handleClose}
                  className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100/50 rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Title <span className="text-indigo-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={creating}
                  className="w-full px-3 py-2.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 placeholder-slate-500 transition-all duration-200 shadow-sm disabled:opacity-50 text-sm"
                  placeholder="Enter reminder title..."
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Message <span className="text-indigo-600">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={creating}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 placeholder-slate-500 transition-all duration-200 resize-none shadow-sm disabled:opacity-50 text-sm"
                  placeholder="Enter your reminder message..."
                  maxLength={500}
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Date <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    disabled={creating}
                    min={today}
                    className="w-full px-3 py-2.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 transition-all duration-200 shadow-sm disabled:opacity-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Time <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    disabled={creating}
                    min={formData.scheduledDate === today ? now : undefined}
                    className="w-full px-3 py-2.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 transition-all duration-200 shadow-sm disabled:opacity-50 text-sm"
                  />
                </div>
              </div>

              {/* Preview */}
              {formData.title && formData.description && (
                <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200/50">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Message Preview
                  </h4>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <p className="font-medium">🔔 Here is the message to remind you</p>
                    <p className="mt-1"><strong>📝 Title -</strong> {formData.title}</p>
                    <p className="mt-1"><strong>💬 Message -</strong> {formData.description}</p>
                    <p className="mt-1 italic text-xs">Thank You<br />Memory Vault Team</p>
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              {formData.scheduledDate && formData.scheduledTime && (
                <div className="bg-indigo-50/80 backdrop-blur-sm rounded-xl p-3 border border-indigo-200/50">
                  <div className="flex items-center text-xs text-indigo-700">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>
                      Scheduled for {format(new Date(`${formData.scheduledDate}T${formData.scheduledTime}`), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2 sticky bottom-0 bg-white/95 backdrop-blur-sm -mx-6 px-6 py-4 rounded-b-3xl">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-white/80 hover:bg-white/90 text-slate-700 border border-slate-300 rounded-xl font-medium transition-all duration-200 shadow-sm disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !formData.title.trim() || !formData.description.trim() || !formData.scheduledDate || !formData.scheduledTime}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Schedule Reminder</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
