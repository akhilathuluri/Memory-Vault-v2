import { supabase } from '../lib/supabase';
import { Memory, FileRecord } from '../types';
import { generateEmbedding } from './aiService';
import LocationService from './locationService';

export interface TelegramUser {
  id: string;
  telegram_user_id: string;
  telegram_username?: string;
  user_id: string; // Link to our app's user
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  location?: {
    longitude: number;
    latitude: number;
  };
  caption?: string;
}

/**
 * Telegram Bot Service for external memory creation
 * Handles incoming messages from Telegram and creates memories
 */
export class TelegramBotService {
  private static instance: TelegramBotService;
  private botToken: string;
  private webhookUrl: string;

  private constructor() {
    this.botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
    this.webhookUrl = import.meta.env.VITE_TELEGRAM_WEBHOOK_URL || '';
  }

  static getInstance(): TelegramBotService {
    if (!this.instance) {
      this.instance = new TelegramBotService();
    }
    return this.instance;
  }

  /**
   * Process incoming webhook from Telegram
   */
  async processWebhook(update: any): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📱 Processing Telegram webhook:', update);

      if (!update.message) {
        return { success: false, message: 'No message in update' };
      }

      const message: TelegramMessage = update.message;
      const telegramUserId = message.from.id.toString();

      // Find linked user
      const linkedUser = await this.findLinkedUser(telegramUserId);
      if (!linkedUser) {
        await this.sendMessage(
          message.chat.id,
          '🔗 Please link your Telegram account first by visiting the app settings and following the setup instructions.'
        );
        return { success: false, message: 'User not linked' };
      }

      // Process different message types
      if (message.text) {
        return await this.processTextMessage(message, linkedUser);
      } else if (message.photo) {
        return await this.processPhotoMessage(message, linkedUser);
      } else if (message.document) {
        return await this.processDocumentMessage(message, linkedUser);
      } else if (message.voice) {
        return await this.processVoiceMessage(message, linkedUser);
      } else {
        await this.sendMessage(
          message.chat.id,
          '❓ I can process text messages, photos, documents, and voice messages. Please send one of these types.'
        );
        return { success: false, message: 'Unsupported message type' };
      }

    } catch (error) {
      console.error('❌ Error processing Telegram webhook:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process text message and create memory
   */
  private async processTextMessage(
    message: TelegramMessage, 
    linkedUser: TelegramUser
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const content = message.text!;
      
      // Extract title from first line or first few words
      const lines = content.split('\n');
      const title = lines[0].length > 50 ? 
        lines[0].substring(0, 47) + '...' : 
        lines[0];

      // Auto-generate tags from content
      const tags = this.extractTagsFromText(content);
      
      // Add Telegram-specific tag
      tags.push('telegram');

      // Try to generate embedding
      let embedding = null;
      try {
        embedding = await generateEmbedding(content);
      } catch (embeddingError) {
        console.warn('⚠️ Failed to generate embedding:', embeddingError);
      }

      // Create memory
      const memoryData: Omit<Memory, 'id' | 'created_at' | 'updated_at'> = {
        title,
        content,
        tags,
        user_id: linkedUser.user_id,
        embedding
      };

      const { data: memory, error } = await supabase
        .from('memories')
        .insert([memoryData])
        .select()
        .single();

      if (error) throw error;

      // Handle location if provided
      if (message.location) {
        await this.saveLocationData(memory.id, message.location);
      }

      // Send confirmation
      await this.sendMessage(
        message.chat.id,
        `✅ Memory saved successfully!\n\n📝 Title: ${title}\n🏷️ Tags: ${tags.join(', ')}\n\n💡 You can view it in your Memory Vault app.`
      );

      return { success: true, message: 'Text memory created' };

    } catch (error) {
      console.error('❌ Error processing text message:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Failed to save memory. Please try again later.'
      );
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process photo message and create file record + memory
   */
  private async processPhotoMessage(
    message: TelegramMessage,
    linkedUser: TelegramUser
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const photo = message.photo![message.photo!.length - 1]; // Get highest resolution
      const caption = message.caption || 'Photo from Telegram';

      // Download file from Telegram
      const fileData = await this.downloadTelegramFile(photo.file_id);
      if (!fileData) {
        throw new Error('Failed to download photo');
      }

      // Upload to Supabase storage
      const fileName = `telegram_photo_${Date.now()}.jpg`;
      const filePath = `${linkedUser.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, fileData, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Create file record
      const fileRecord: Omit<FileRecord, 'id' | 'created_at'> = {
        name: fileName,
        description: caption,
        tags: ['telegram', 'photo'],
        file_path: filePath,
        file_type: 'image',
        file_size: fileData.size || photo.file_size || 0,
        user_id: linkedUser.user_id
      };

      const { data: file, error: fileError } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (fileError) throw fileError;

      // Create memory for the photo
      const memoryContent = `Photo: ${caption}\n\nUploaded via Telegram`;
      const memoryData: Omit<Memory, 'id' | 'created_at' | 'updated_at'> = {
        title: `Photo: ${caption.substring(0, 30)}${caption.length > 30 ? '...' : ''}`,
        content: memoryContent,
        tags: ['telegram', 'photo'],
        user_id: linkedUser.user_id
      };

      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert([memoryData])
        .select()
        .single();

      if (memoryError) throw memoryError;

      // Send confirmation
      await this.sendMessage(
        message.chat.id,
        `✅ Photo saved successfully!\n\n📸 File: ${fileName}\n📝 Caption: ${caption}\n\n💡 You can view it in your Memory Vault app.`
      );

      return { success: true, message: 'Photo memory created' };

    } catch (error) {
      console.error('❌ Error processing photo message:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Failed to save photo. Please try again later.'
      );
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process document message
   */
  private async processDocumentMessage(
    message: TelegramMessage,
    linkedUser: TelegramUser
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const document = message.document!;
      const caption = message.caption || document.file_name || 'Document from Telegram';

      // Download file from Telegram
      const fileData = await this.downloadTelegramFile(document.file_id);
      if (!fileData) {
        throw new Error('Failed to download document');
      }

      // Determine file type
      const fileType = this.getFileTypeFromMime(document.mime_type);
      const fileName = document.file_name || `telegram_document_${Date.now()}`;
      const filePath = `${linkedUser.user_id}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, fileData, {
          contentType: document.mime_type
        });

      if (uploadError) throw uploadError;

      // Create file record
      const fileRecord: Omit<FileRecord, 'id' | 'created_at'> = {
        name: fileName,
        description: caption,
        tags: ['telegram', 'document'],
        file_path: filePath,
        file_type: fileType,
        file_size: document.file_size || fileData.size || 0,
        user_id: linkedUser.user_id
      };

      const { data: file, error: fileError } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (fileError) throw fileError;

      // Create memory for the document
      const memoryContent = `Document: ${caption}\nFile: ${fileName}\n\nUploaded via Telegram`;
      const memoryData: Omit<Memory, 'id' | 'created_at' | 'updated_at'> = {
        title: `Document: ${caption.substring(0, 30)}${caption.length > 30 ? '...' : ''}`,
        content: memoryContent,
        tags: ['telegram', 'document'],
        user_id: linkedUser.user_id
      };

      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert([memoryData])
        .select()
        .single();

      if (memoryError) throw memoryError;

      // Send confirmation
      await this.sendMessage(
        message.chat.id,
        `✅ Document saved successfully!\n\n📄 File: ${fileName}\n📝 Description: ${caption}\n\n💡 You can view it in your Memory Vault app.`
      );

      return { success: true, message: 'Document memory created' };

    } catch (error) {
      console.error('❌ Error processing document message:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Failed to save document. Please try again later.'
      );
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process voice message
   */
  private async processVoiceMessage(
    message: TelegramMessage,
    linkedUser: TelegramUser
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const voice = message.voice!;
      const caption = message.caption || 'Voice message from Telegram';

      // Download voice file from Telegram
      const fileData = await this.downloadTelegramFile(voice.file_id);
      if (!fileData) {
        throw new Error('Failed to download voice message');
      }

      // Upload to Supabase storage
      const fileName = `telegram_voice_${Date.now()}.ogg`;
      const filePath = `${linkedUser.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, fileData, {
          contentType: voice.mime_type || 'audio/ogg'
        });

      if (uploadError) throw uploadError;

      // Create file record
      const fileRecord: Omit<FileRecord, 'id' | 'created_at'> = {
        name: fileName,
        description: `Voice message (${voice.duration}s)`,
        tags: ['telegram', 'voice', 'audio'],
        file_path: filePath,
        file_type: 'audio',
        file_size: voice.file_size || fileData.size || 0,
        user_id: linkedUser.user_id
      };

      const { data: file, error: fileError } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (fileError) throw fileError;

      // Create memory for the voice message
      const memoryContent = `Voice message (${voice.duration} seconds)\n\nUploaded via Telegram`;
      const memoryData: Omit<Memory, 'id' | 'created_at' | 'updated_at'> = {
        title: `Voice message (${voice.duration}s)`,
        content: memoryContent,
        tags: ['telegram', 'voice', 'audio'],
        user_id: linkedUser.user_id
      };

      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert([memoryData])
        .select()
        .single();

      if (memoryError) throw memoryError;

      // Send confirmation
      await this.sendMessage(
        message.chat.id,
        `✅ Voice message saved successfully!\n\n🎤 Duration: ${voice.duration} seconds\n📄 File: ${fileName}\n\n💡 You can view it in your Memory Vault app.`
      );

      return { success: true, message: 'Voice memory created' };

    } catch (error) {
      console.error('❌ Error processing voice message:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Failed to save voice message. Please try again later.'
      );
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Find linked user by Telegram user ID
   */
  async findLinkedUser(telegramUserId: string): Promise<TelegramUser | null> {
    try {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error finding linked user:', error);
      return null;
    }
  }

  /**
   * Download file from Telegram
   */
  private async downloadTelegramFile(fileId: string): Promise<Blob | null> {
    try {
      // Get file info from Telegram
      const fileInfoResponse = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`
      );
      
      if (!fileInfoResponse.ok) {
        throw new Error('Failed to get file info from Telegram');
      }

      const fileInfo = await fileInfoResponse.json();
      if (!fileInfo.ok) {
        throw new Error('Telegram API error: ' + fileInfo.description);
      }

      // Download the actual file
      const fileResponse = await fetch(
        `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.result.file_path}`
      );

      if (!fileResponse.ok) {
        throw new Error('Failed to download file from Telegram');
      }

      return await fileResponse.blob();
    } catch (error) {
      console.error('Error downloading Telegram file:', error);
      return null;
    }
  }

  /**
   * Send message to Telegram chat
   */
  private async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
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
        console.error('Failed to send Telegram message:', error);
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error);
    }
  }

  /**
   * Extract tags from text content
   */
  private extractTagsFromText(text: string): string[] {
    const tags: string[] = [];
    
    // Extract hashtags
    const hashtags = text.match(/#\w+/g);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.substring(1).toLowerCase()));
    }

    // Extract common keywords
    const keywords = ['work', 'personal', 'idea', 'todo', 'meeting', 'note', 'reminder'];
    const lowerText = text.toLowerCase();
    
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        tags.push(keyword);
      }
    });

    // Remove duplicates
    return [...new Set(tags)];
  }

  /**
   * Determine file type from MIME type
   */
  private getFileTypeFromMime(mimeType?: string): 'image' | 'video' | 'audio' {
    if (!mimeType) return 'image';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    
    return 'image'; // Default fallback
  }

  /**
   * Save location data for memory
   */
  private async saveLocationData(memoryId: string, location: { latitude: number; longitude: number }): Promise<void> {
    try {
      const locationService = LocationService.getInstance();
      
      // Try to get address from coordinates
      let address = '';
      try {
        const addressData = await locationService.reverseGeocode(location.latitude, location.longitude);
        address = addressData.display_name || '';
      } catch (error) {
        console.warn('Failed to reverse geocode location:', error);
      }

      const { error } = await supabase
        .from('memory_locations')
        .insert([{
          memory_id: memoryId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 10, // Default accuracy for Telegram locations
          address,
          recorded_at: new Date().toISOString()
        }]);

      if (error) {
        console.warn('Failed to save location data:', error);
      }
    } catch (error) {
      console.warn('Error saving location data:', error);
    }
  }

  /**
   * Link Telegram user to app user
   */
  async linkTelegramUser(
    telegramUserId: string,
    telegramUsername: string | undefined,
    appUserId: string
  ): Promise<TelegramUser | null> {
    try {
      // Check if already linked
      const existing = await this.findLinkedUser(telegramUserId);
      if (existing) {
        // Update existing link
        const { data, error } = await supabase
          .from('telegram_users')
          .update({
            telegram_username: telegramUsername,
            user_id: appUserId,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('telegram_user_id', telegramUserId)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new link
      const telegramUser: Omit<TelegramUser, 'id' | 'created_at' | 'updated_at'> = {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        user_id: appUserId,
        is_active: true
      };

      const { data, error } = await supabase
        .from('telegram_users')
        .insert([telegramUser])
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error linking Telegram user:', error);
      return null;
    }
  }

  /**
   * Unlink Telegram user
   */
  async unlinkTelegramUser(telegramUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('telegram_users')
        .update({ is_active: false })
        .eq('telegram_user_id', telegramUserId);

      return !error;
    } catch (error) {
      console.error('Error unlinking Telegram user:', error);
      return false;
    }
  }

  /**
   * Get linked users for an app user
   */
  async getLinkedTelegramUsers(appUserId: string): Promise<TelegramUser[]> {
    try {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('user_id', appUserId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting linked Telegram users:', error);
      return [];
    }
  }

  /**
   * Set webhook URL for the bot
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/setWebhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ['message']
          })
        }
      );

      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Get bot info
   */
  async getBotInfo(): Promise<any> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getMe`
      );
      
      const result = await response.json();
      return result.ok ? result.result : null;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  /**
   * Generate a linking code for a user
   */
  async generateLinkingCode(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('generate_telegram_linking_code', {
        user_uuid: userId
      });

      if (error) {
        console.error('Error generating linking code:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error generating linking code:', error);
      return null;
    }
  }

  /**
   * Verify and use a linking code
   */
  async verifyLinkingCode(
    code: string, 
    telegramUserId: string, 
    telegramUsername?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('verify_telegram_linking_code', {
        code: code.toUpperCase(),
        telegram_uid: telegramUserId,
        telegram_uname: telegramUsername || null
      });

      if (error) {
        console.error('Error verifying linking code:', error);
        return null;
      }

      return data; // Returns user UUID if successful
    } catch (error) {
      console.error('Error verifying linking code:', error);
      return null;
    }
  }

  /**
   * Log telegram message for debugging/analytics
   */
  async logMessage(
    telegramUserId: string,
    messageId: number,
    messageType: string,
    content?: string,
    fileId?: string,
    success: boolean = true,
    errorMessage?: string,
    memoryId?: string,
    fileRecordId?: string
  ): Promise<void> {
    try {
      await supabase.rpc('log_telegram_message', {
        telegram_uid: telegramUserId,
        msg_id: messageId,
        msg_type: messageType,
        content_text: content || null,
        file_id_text: fileId || null,
        success_flag: success,
        error_msg: errorMessage || null,
        memory_uuid: memoryId || null,
        file_uuid: fileRecordId || null
      });
    } catch (error) {
      console.warn('Failed to log telegram message:', error);
    }
  }
}