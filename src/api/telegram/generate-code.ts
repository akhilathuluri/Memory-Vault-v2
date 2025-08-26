import { supabase } from '../../lib/supabase';

/**
 * Generate a linking code for the current user
 */
export async function generateLinkingCode(): Promise<{ code: string | null; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { code: null, error: 'User not authenticated' };
    }

    // Call the database function to generate a linking code
    const { data, error } = await supabase.rpc('generate_telegram_linking_code', {
      user_uuid: user.id
    });

    if (error) {
      console.error('Error generating linking code:', error);
      return { code: null, error: error.message };
    }

    return { code: data };
  } catch (error) {
    console.error('Error in generateLinkingCode:', error);
    return { 
      code: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get linked Telegram users for the current user
 */
export async function getLinkedTelegramUsers(): Promise<{ users: any[]; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { users: [], error: 'User not authenticated' };
    }

    // Get linked Telegram users
    const { data, error } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching linked users:', error);
      return { users: [], error: error.message };
    }

    return { users: data || [] };
  } catch (error) {
    console.error('Error in getLinkedTelegramUsers:', error);
    return { 
      users: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Unlink a Telegram user
 */
export async function unlinkTelegramUser(telegramUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Deactivate the Telegram user link
    const { error } = await supabase
      .from('telegram_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('telegram_user_id', telegramUserId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unlinking Telegram user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in unlinkTelegramUser:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}