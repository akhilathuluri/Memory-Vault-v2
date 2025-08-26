import { supabase } from '../lib/supabase';
import { Notification, CreateNotificationData, NotificationHistory } from '../types/notifications';
import { TelegramBotService } from './telegramBotService';

/**
 * NotificationService - Handles scheduled notifications via Telegram
 */
export class NotificationService {
  private static instance: NotificationService;
  private telegramService: TelegramBotService;

  private constructor() {
    this.telegramService = TelegramBotService.getInstance();
  }

  static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  /**
   * Create a new scheduled notification
   */
  async createNotification(data: CreateNotificationData, userId: string): Promise<Notification | null> {
    try {
      // Get user's Telegram chat ID
      const linkedUsers = await this.telegramService.getLinkedTelegramUsers(userId);
      const telegramChatId = linkedUsers.length > 0 ? linkedUsers[0].telegram_user_id : null;

      const notificationData = {
        ...data,
        user_id: userId,
        status: 'pending' as const,
        telegram_chat_id: telegramChatId
      };

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      // Schedule the notification processing
      this.scheduleNotificationCheck();

      return notification;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  /**
   * Get notification history for a specific notification
   */
  async getNotificationHistory(notificationId: string): Promise<NotificationHistory[]> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('notification_id', notificationId)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching notification history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotificationHistory:', error);
      return [];
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }

  /**
   * Process pending notifications (called by scheduler)
   */
  async processPendingNotifications(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get pending notifications that are due
      const { data: pendingNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_time', now);

      if (error) {
        console.error('Error fetching pending notifications:', error);
        return;
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        return;
      }

      console.log(`Processing ${pendingNotifications.length} pending notifications`);

      // Process each notification
      for (const notification of pendingNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error in processPendingNotifications:', error);
    }
  }

  /**
   * Send a notification via Telegram
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      if (!notification.telegram_chat_id) {
        // Mark as failed if no Telegram chat ID
        await this.markNotificationAsFailed(
          notification.id, 
          'No Telegram account linked'
        );
        return;
      }

      const message = this.formatNotificationMessage(notification);
      
      // Send message via Telegram
      await this.sendTelegramMessage(
        parseInt(notification.telegram_chat_id), 
        message
      );

      // Mark as sent
      await this.markNotificationAsSent(notification.id);
      
      // Log to history
      await this.logNotificationHistory(
        notification.id,
        'success'
      );

      console.log(`✅ Notification sent: ${notification.title}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Mark as failed
      await this.markNotificationAsFailed(
        notification.id,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      // Log to history
      await this.logNotificationHistory(
        notification.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Format notification message for Telegram
   */
  private formatNotificationMessage(notification: Notification): string {
    return `🔔 Here is the message to remind you

📝 Title - ${notification.title}

💬 Message - ${notification.description}

Thank You
Memory Vault Team`;
  }

  /**
   * Send message via Telegram Bot API
   */
  private async sendTelegramMessage(chatId: number, text: string): Promise<void> {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || 
                     import.meta.env.VITE_WEBAPP_TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${error.description}`);
    }
  }

  /**
   * Mark notification as sent
   */
  private async markNotificationAsSent(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as sent:', error);
    }
  }

  /**
   * Mark notification as failed
   */
  private async markNotificationAsFailed(
    notificationId: string, 
    _errorMsg: string // Prefix with underscore to indicate intentionally unused
  ): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as failed:', error);
    }
  }

  /**
   * Log notification to history
   */
  private async logNotificationHistory(
    notificationId: string,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const historyData = {
        notification_id: notificationId,
        sent_at: new Date().toISOString(),
        status,
        error_message: errorMessage || null
      };

      const { error } = await supabase
        .from('notification_history')
        .insert([historyData]);

      if (error) {
        console.error('Error logging notification history:', error);
      }
    } catch (error) {
      console.error('Error in logNotificationHistory:', error);
    }
  }

  /**
   * Schedule notification checks (call this periodically)
   */
  private scheduleNotificationCheck(): void {
    // In a real implementation, this would be handled by a background service
    // For now, we'll check every minute if there are pending notifications
    setTimeout(() => {
      this.processPendingNotifications();
    }, 60000); // Check in 1 minute
  }

  /**
   * Initialize notification service (call on app startup)
   */
  async initialize(): Promise<void> {
    // Start processing pending notifications
    await this.processPendingNotifications();
    
    // Set up periodic checking
    setInterval(() => {
      this.processPendingNotifications();
    }, 60000); // Check every minute
  }

  /**
   * Check if user has Telegram linked
   */
  async isUserLinkedToTelegram(userId: string): Promise<boolean> {
    try {
      const linkedUsers = await this.telegramService.getLinkedTelegramUsers(userId);
      return linkedUsers.length > 0;
    } catch (error) {
      console.error('Error checking Telegram link:', error);
      return false;
    }
  }
}

export default NotificationService;
