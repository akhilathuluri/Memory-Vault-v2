export interface Notification {
  id: string;
  title: string;
  description: string;
  scheduled_time: string;
  user_id: string;
  status: 'pending' | 'sent' | 'failed';
  telegram_chat_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  title: string;
  description: string;
  scheduled_time: string;
}

export interface NotificationHistory {
  id: string;
  notification_id: string;
  sent_at: string;
  status: 'success' | 'failed';
  error_message?: string;
  telegram_response?: any;
}
