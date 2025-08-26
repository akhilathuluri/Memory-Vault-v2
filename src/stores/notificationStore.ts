import { create } from 'zustand';
import { Notification, CreateNotificationData, NotificationHistory } from '../types/notifications';
import { NotificationService } from '../services/notificationService';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  creating: boolean;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  createNotification: (data: CreateNotificationData) => Promise<boolean>;
  deleteNotification: (id: string) => Promise<void>;
  getNotificationHistory: (notificationId: string) => Promise<NotificationHistory[]>;
  isUserLinkedToTelegram: () => Promise<boolean>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  loading: false,
  creating: false,

  fetchNotifications: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('⚠️ No user authenticated, skipping notification fetch');
      return;
    }

    set({ loading: true });
    try {
      const notificationService = NotificationService.getInstance();
      const notifications = await notificationService.getUserNotifications(user.id);
      
      set({ notifications });
      console.log('✅ Fetched', notifications.length, 'notifications');
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      set({ loading: false });
    }
  },

  createNotification: async (data: CreateNotificationData): Promise<boolean> => {
    const { user } = useAuthStore.getState();
    if (!user) {
      toast.error('User not authenticated');
      return false;
    }

    set({ creating: true });
    try {
      const notificationService = NotificationService.getInstance();
      
      // Check if user has Telegram linked
      const isLinked = await notificationService.isUserLinkedToTelegram(user.id);
      if (!isLinked) {
        toast.error('Please link your Telegram account in Settings first');
        return false;
      }

      const notification = await notificationService.createNotification(data, user.id);
      
      if (notification) {
        // Add to store
        set((state) => ({
          notifications: [notification, ...state.notifications]
        }));
        
        toast.success('Notification scheduled successfully!');
        return true;
      } else {
        toast.error('Failed to create notification');
        return false;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to create notification');
      return false;
    } finally {
      set({ creating: false });
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const notificationService = NotificationService.getInstance();
      const success = await notificationService.deleteNotification(id);
      
      if (success) {
        // Remove from store
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
        
        toast.success('Notification deleted successfully');
      } else {
        toast.error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  },

  getNotificationHistory: async (notificationId: string): Promise<NotificationHistory[]> => {
    try {
      const notificationService = NotificationService.getInstance();
      return await notificationService.getNotificationHistory(notificationId);
    } catch (error) {
      console.error('Error fetching notification history:', error);
      toast.error('Failed to fetch notification history');
      return [];
    }
  },

  isUserLinkedToTelegram: async (): Promise<boolean> => {
    const { user } = useAuthStore.getState();
    if (!user) return false;

    try {
      const notificationService = NotificationService.getInstance();
      return await notificationService.isUserLinkedToTelegram(user.id);
    } catch (error) {
      console.error('Error checking Telegram link:', error);
      return false;
    }
  }
}));
