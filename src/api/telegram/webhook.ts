import { TelegramBotService } from '../../services/telegramBotService';

/**
 * Telegram Webhook Handler
 * This endpoint receives updates from Telegram Bot API
 */
export async function handleTelegramWebhook(request: Request): Promise<Response> {
  try {
    // Verify request method
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse the webhook update
    const update = await request.json();
    console.log('📱 Received Telegram webhook:', update);

    // Verify the update has required fields
    if (!update || !update.message) {
      return new Response('Invalid update format', { status: 400 });
    }

    // Process the webhook using the Telegram service
    const telegramService = TelegramBotService.getInstance();
    const result = await telegramService.processWebhook(update);

    if (result.success) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: result.message 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('❌ Webhook processing failed:', result.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: result.message 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Telegram webhook error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Telegram Bot Commands Handler
 * Handles special bot commands like /start, /link, /help
 */
export async function handleTelegramCommands(update: any): Promise<{ success: boolean; message?: string }> {
  try {
    const message = update.message;
    const text = message.text;
    const telegramUserId = message.from.id.toString();
    const chatId = message.chat.id;

    if (!text || !text.startsWith('/')) {
      return { success: false, message: 'Not a command' };
    }

    const telegramService = TelegramBotService.getInstance();

    // Parse command and arguments
    const [command, ...args] = text.split(' ');

    switch (command.toLowerCase()) {
      case '/start':
        await sendMessage(chatId, `
🎉 Welcome to Memory Vault Bot!

I can help you save memories and files directly to your Memory Vault app.

📝 Send me text messages to create memories
📸 Send photos, documents, or voice messages to save files
📍 Share your location to add context

To get started:
1. Link your account with /link YOUR_CODE
2. Get your linking code from the Memory Vault app settings

Need help? Use /help for more commands.
        `);
        return { success: true, message: 'Start command processed' };

      case '/help':
        await sendMessage(chatId, `
🤖 Memory Vault Bot Commands:

/start - Welcome message and setup instructions
/link CODE - Link your Telegram account (get code from app)
/unlink - Unlink your Telegram account
/status - Check your account status
/help - Show this help message

📝 Usage:
• Send any text to create a memory
• Use #hashtags to tag your memories
• Send photos/files to save them
• Share location for context

Questions? Visit the Memory Vault app for more settings.
        `);
        return { success: true, message: 'Help command processed' };

      case '/link':
        if (args.length === 0) {
          await sendMessage(chatId, `
❌ Please provide your linking code.

Usage: /link YOUR_CODE

Get your linking code from:
Memory Vault App → Settings → Telegram Integration
          `);
          return { success: false, message: 'No linking code provided' };
        }

        const linkingCode = args[0].toUpperCase();
        
        // Verify the linking code and get the user ID
        const userId = await telegramService.verifyLinkingCode(
          linkingCode,
          telegramUserId,
          message.from.username
        );

        if (userId) {
          await sendMessage(chatId, `
✅ Account linked successfully!

You can now:
📝 Send text messages to create memories
📸 Send photos and files to save them
📍 Share location for context

Your memories will appear in the Memory Vault app automatically.
          `);
          return { success: true, message: 'Account linked' };
        } else {
          await sendMessage(chatId, `
❌ Failed to link account. Please check:

1. Make sure your linking code is correct
2. Get a fresh code from the Memory Vault app
3. Try again with /link YOUR_CODE

Linking codes expire after 1 hour for security.
          `);
          return { success: false, message: 'Linking failed' };
        }

      case '/unlink':
        const unlinkSuccess = await telegramService.unlinkTelegramUser(telegramUserId);
        
        if (unlinkSuccess) {
          await sendMessage(chatId, `
✅ Account unlinked successfully!

To use the bot again, you'll need to link your account with /link YOUR_CODE

Get a new linking code from the Memory Vault app settings.
          `);
          return { success: true, message: 'Account unlinked' };
        } else {
          await sendMessage(chatId, `
❌ Failed to unlink account. 

If you continue having issues, please check the Memory Vault app settings.
          `);
          return { success: false, message: 'Unlinking failed' };
        }

      case '/status':
        const linkedUserData = await telegramService.findLinkedUser(telegramUserId);
        
        if (linkedUserData) {
          await sendMessage(chatId, `
✅ Account Status: Linked

👤 Telegram: @${message.from.username || 'Unknown'}
🔗 Linked: ${new Date(linkedUserData.created_at).toLocaleDateString()}
📱 Status: Active

You can send messages and files to create memories!
          `);
        } else {
          await sendMessage(chatId, `
❌ Account Status: Not Linked

To start using the bot:
1. Get your linking code from Memory Vault app settings
2. Use /link YOUR_CODE to connect your account

Need help? Use /help for more information.
          `);
        }
        return { success: true, message: 'Status command processed' };

      default:
        await sendMessage(chatId, `
❓ Unknown command: ${command}

Available commands:
/start - Get started
/link CODE - Link your account
/help - Show help
/status - Check status

Use /help for detailed instructions.
        `);
        return { success: false, message: 'Unknown command' };
    }

  } catch (error) {
    console.error('❌ Error handling Telegram command:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send message to Telegram chat
 */
async function sendMessage(chatId: number, text: string): Promise<void> {
  try {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    
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
      console.error('Failed to send Telegram message:', error);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

// Export for use in serverless functions or Express routes
export { handleTelegramWebhook as default };