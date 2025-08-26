import { create } from 'zustand';
import { UserSettings } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface SettingsState {
  settings: UserSettings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  canUseWebappKeys: () => { github: boolean; openrouter: boolean };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      set({ settings: data || null });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (updates) => {
    try {
      const { settings } = get();
      const { user } = useAuthStore.getState();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (settings) {
        const { error } = await supabase
          .from('user_settings')
          .update(updates)
          .eq('id', settings.id);

        if (error) throw error;
        
        set({ settings: { ...settings, ...updates } });
      } else {
        const { data, error } = await supabase
          .from('user_settings')
          .insert([{ ...updates, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;
        set({ settings: data });
      }

      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  },

  canUseWebappKeys: () => {
    const githubKey = import.meta.env.VITE_WEBAPP_GITHUB_API_KEY;
    const openrouterKey = import.meta.env.VITE_WEBAPP_OPENROUTER_API_KEY;
    
    return {
      github: !!(githubKey && githubKey !== 'your_webapp_github_api_key_here'),
      openrouter: !!(openrouterKey && openrouterKey !== 'your_webapp_openrouter_api_key_here')
    };
  },
}));