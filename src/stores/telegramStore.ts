import { create } from 'zustand';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

// Import the TelegramUser type
export interface TelegramUser {
  id: string;
  telegram_user_id: string;
  telegram_username?: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TelegramState {
  linkedUsers: TelegramUser[];
  loading: boolean;
  botInfo: any;
  isConfigured: boolean;

  // Actions
  fetchLinkedUsers: () => Promise<void>;
  unlinkTelegramUser: (telegramUserId: string) => Promise<boolean>;
  fetchBotInfo: () => Promise<void>;
  checkConfiguration: () => boolean;
  setupWebhook: (webhookUrl: string) => Promise<boolean>;
}

export const useTelegramStore = create<TelegramState>((set, get) => ({
  linkedUsers: [],
  loading: false,
  botInfo: null,
  isConfigured: false,

  fetchLinkedUsers: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ loading: true });
    try {
      const { getLinkedTelegramUsers } = await import('../api/telegram/generate-code');
      const result = await getLinkedTelegramUsers();

      if (result.error) {
        console.error('Error fetching linked users:', result.error);
        toast.error('Failed to fetch Telegram connections');
      } else {
        set({ linkedUsers: result.users });
      }
    } catch (error) {
      console.error('Error fetching linked Telegram users:', error);
      toast.error('Failed to fetch Telegram connections');
    } finally {
      set({ loading: false });
    }
  },



  unlinkTelegramUser: async (telegramUserId: string) => {
    set({ loading: true });
    try {
      const { unlinkTelegramUser: unlinkUser } = await import('../api/telegram/generate-code');
      const result = await unlinkUser(telegramUserId);

      if (result.success) {
        // Refresh linked users
        await get().fetchLinkedUsers();
        toast.success('Telegram account unlinked successfully!');
        return true;
      } else {
        console.error('Error unlinking user:', result.error);
        toast.error('Failed to unlink Telegram account');
        return false;
      }
    } catch (error) {
      console.error('Error unlinking Telegram user:', error);
      toast.error('Failed to unlink Telegram account');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  fetchBotInfo: async () => {
    try {
      // Check if bot token is configured
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (!botToken || botToken === 'PASTE_YOUR_BOT_TOKEN_HERE') {
        set({ botInfo: null, isConfigured: false });
        return;
      }

      // Test bot by calling Telegram API
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();

      if (result.ok) {
        set({ botInfo: result.result, isConfigured: true });
      } else {
        set({ botInfo: null, isConfigured: false });
      }
    } catch (error) {
      console.error('Error fetching bot info:', error);
      set({ botInfo: null, isConfigured: false });
    }
  },

  checkConfiguration: () => {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const webhookUrl = import.meta.env.VITE_TELEGRAM_WEBHOOK_URL;
    const isConfigured = !!(botToken && webhookUrl);
    set({ isConfigured });
    return isConfigured;
  },

  setupWebhook: async (webhookUrl: string) => {
    try {
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        toast.error('Bot token not configured');
        return false;
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message']
        })
      });

      const result = await response.json();

      if (result.ok) {
        toast.success('Webhook configured successfully!');
        return true;
      } else {
        toast.error('Failed to configure webhook');
        return false;
      }
    } catch (error) {
      console.error('Error setting up webhook:', error);
      toast.error('Failed to configure webhook');
      return false;
    }
  },
}));