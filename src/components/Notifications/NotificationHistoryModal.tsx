import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Clock, CheckCircle, AlertCircle, Trash2, History } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { Notification, NotificationHistory } from '../../types/notifications';
import { format } from 'date-fns';

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationHistoryModal: React.FC<NotificationHistoryModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { notifications, loading, fetchNotifications, deleteNotification, getNotificationHistory } = useNotificationStore();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleViewHistory = async (notification: Notification) => {
    setSelectedNotification(notification);
    const history = await getNotificationHistory(notification.id);
    setNotificationHistory(history);
  };

  const handleDeleteNotification = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      await deleteNotification(id);
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
        setNotificationHistory([]);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
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
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Notification History
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">View and manage your scheduled reminders</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100/50 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-12rem)] overflow-hidden">
              {/* Notifications List */}
              <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Your Notifications</h3>
                  <span className="text-sm text-slate-500">{notifications.length} total</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      className={`glass-card rounded-xl p-4 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                        selectedNotification?.id === notification.id 
                          ? 'ring-2 ring-indigo-500 bg-indigo-50/50' 
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => handleViewHistory(notification)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 mb-1 line-clamp-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                            {notification.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(notification.status)}
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(notification.status)}`}>
                            {getStatusText(notification.status)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(notification.scheduled_time), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Notification Details */}
              <div className="glass-card rounded-xl p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {selectedNotification ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Notification Details</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Title</label>
                          <p className="text-slate-800 font-medium">{selectedNotification.title}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Message</label>
                          <p className="text-slate-700 leading-relaxed">{selectedNotification.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Scheduled Time</label>
                            <p className="text-slate-700 text-sm">
                              {format(new Date(selectedNotification.scheduled_time), 'MMMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(selectedNotification.status)}
                              <span className={`text-sm px-2 py-1 rounded-full border ${getStatusColor(selectedNotification.status)}`}>
                                {getStatusText(selectedNotification.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Telegram Message Preview</h4>
                      <div className="text-sm text-slate-600 leading-relaxed bg-white/60 rounded-lg p-3 border">
                        <p className="font-medium">🔔 Here is the message to remind you</p>
                        <p className="mt-2"><strong>📝 Title -</strong> {selectedNotification.title}</p>
                        <p className="mt-1"><strong>💬 Message -</strong> {selectedNotification.description}</p>
                        <p className="mt-2 italic">Thank You<br />Memory Vault Team</p>
                      </div>
                    </div>

                    {/* Delivery History */}
                    {notificationHistory.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Delivery History</h4>
                        <div className="space-y-2">
                          {notificationHistory.map((history) => (
                            <div key={history.id} className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg border">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(history.status)}
                                <span className="text-sm text-slate-700">
                                  {history.status === 'success' ? 'Successfully sent' : 'Failed to send'}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {format(new Date(history.sent_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Select a notification to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
