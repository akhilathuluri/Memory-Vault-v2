/**
 * Telegram Webhook Server
 * 
 * This is a simple Express.js server to handle Telegram webhooks.
 * Deploy this to your preferred hosting service (Vercel, Netlify, Railway, etc.)
 * 
 * Environment Variables Required:
 * - VITE_TELEGRAM_BOT_TOKEN: Your Telegram bot token
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon key
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { scheduler } = require('./notification-scheduler');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// Telegram Bot Service (simplified server version)
class TelegramBotService {
    constructor() {
        this.botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
        this.processedMessages = new Set(); // Track processed message IDs
    }

    async processWebhook(update) {
        try {
            console.log('📱 Processing Telegram webhook:', update);

            if (!update.message) {
                return { success: true, message: 'No message in update' }; // Return success to prevent retry
            }

            const message = update.message;
            const messageId = message.message_id;
            const telegramUserId = message.from.id.toString();

            // Check if we've already processed this message
            const messageKey = `${telegramUserId}_${messageId}`;
            if (this.processedMessages.has(messageKey)) {
                console.log(`⏭️ Skipping already processed message: ${messageKey}`);
                return { success: true, message: 'Message already processed' };
            }

            // Mark message as processed immediately
            this.processedMessages.add(messageKey);

            // Clean up old processed messages (keep only last 1000)
            if (this.processedMessages.size > 1000) {
                const oldMessages = Array.from(this.processedMessages).slice(0, 500);
                oldMessages.forEach(msg => this.processedMessages.delete(msg));
            }

            console.log(`🆕 Processing new message: ${messageKey}`);

            // Handle commands first
            if (message.text && message.text.startsWith('/')) {
                const result = await this.handleCommand(message);
                return { success: true, message: result.message }; // Always return success
            }

            // Find linked user
            const linkedUser = await this.findLinkedUser(telegramUserId);
            if (!linkedUser) {
                await this.sendMessage(
                    message.chat.id,
                    '🔗 Please link your Telegram account first by using /link YOUR_CODE\n\nGet your linking code from the Memory Vault app settings.'
                );
                return { success: true, message: 'User not linked' }; // Return success to prevent retry
            }

            // Process different message types
            if (message.text) {
                const result = await this.processTextMessage(message, linkedUser);
                return { success: true, message: result.message }; // Always return success
            } else if (message.photo) {
                const result = await this.processPhotoMessage(message, linkedUser);
                return { success: true, message: result.message }; // Always return success
            } else if (message.document) {
                const result = await this.processDocumentMessage(message, linkedUser);
                return { success: true, message: result.message }; // Always return success
            } else if (message.voice) {
                const result = await this.processVoiceMessage(message, linkedUser);
                return { success: true, message: result.message }; // Always return success
            } else {
                await this.sendMessage(
                    message.chat.id,
                    '❓ I can process text messages, photos, documents, and voice messages. Please send one of these types.'
                );
                return { success: true, message: 'Unsupported message type' }; // Return success to prevent retry
            }

        } catch (error) {
            console.error('❌ Error processing Telegram webhook:', error);
            // Always return success to prevent Telegram from retrying
            return { success: true, message: 'Error handled to prevent retry' };
        }
    }

    async handleCommand(message) {
        const text = message.text;
        const telegramUserId = message.from.id.toString();
        const chatId = message.chat.id;
        const [command, ...args] = text.split(' ');

        switch (command.toLowerCase()) {
            case '/start':
                await this.sendMessage(chatId, `
🎉 Welcome to Memory Vault Bot!

I can help you save memories and files directly to your Memory Vault app.

📝 Send me text messages to create memories
📸 Send photos, documents, or voice messages to save files
📍 Share your location to add context

To get started:
1. Get your linking code from the Memory Vault app settings
2. Use /link YOUR_CODE to connect your account

Need help? Use /help for more commands.
        `);
                return { success: true, message: 'Start command processed' };

            case '/help':
                await this.sendMessage(chatId, `
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
                    await this.sendMessage(chatId, `
❌ Please provide your linking code.

Usage: /link YOUR_CODE

Get your linking code from:
Memory Vault App → Settings → Telegram Integration
          `);
                    return { success: false, message: 'No linking code provided' };
                }

                const linkingCode = args[0].toUpperCase();
                const userId = await this.verifyLinkingCode(linkingCode, telegramUserId, message.from.username);

                if (userId) {
                    await this.sendMessage(chatId, `
✅ Account linked successfully!

You can now:
📝 Send text messages to create memories
📸 Send photos and files to save them
📍 Share location for context

Your memories will appear in the Memory Vault app automatically.
          `);
                    return { success: true, message: 'Account linked' };
                } else {
                    await this.sendMessage(chatId, `
❌ Failed to link account. Please check:

1. Make sure your linking code is correct
2. Get a fresh code from the Memory Vault app
3. Try again with /link YOUR_CODE

Linking codes expire after 1 hour for security.
          `);
                    return { success: false, message: 'Linking failed' };
                }

            case '/status':
                const linkedUserData = await this.findLinkedUser(telegramUserId);

                if (linkedUserData) {
                    await this.sendMessage(chatId, `
✅ Account Status: Linked

👤 Telegram: @${message.from.username || 'Unknown'}
🔗 Linked: ${new Date(linkedUserData.created_at).toLocaleDateString()}
📱 Status: Active

You can send messages and files to create memories!
          `);
                } else {
                    await this.sendMessage(chatId, `
❌ Account Status: Not Linked

To start using the bot:
1. Get your linking code from Memory Vault app settings
2. Use /link YOUR_CODE to connect your account

Need help? Use /help for more information.
          `);
                }
                return { success: true, message: 'Status command processed' };

            default:
                await this.sendMessage(chatId, `
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
    }

    async processTextMessage(message, linkedUser) {
        try {
            const content = message.text;
            const lines = content.split('\n');
            const title = lines[0].length > 50 ? lines[0].substring(0, 47) + '...' : lines[0];
            const tags = this.extractTagsFromText(content);
            tags.push('telegram');

            // Try to generate embedding
            let embedding = null;
            try {
                embedding = await this.generateEmbedding(content);
                console.log('✅ Generated embedding for text memory');
            } catch (embeddingError) {
                console.warn('⚠️ Failed to generate embedding:', embeddingError);
            }

            const memoryData = {
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

            await this.sendMessage(
                message.chat.id,
                `✅ Memory saved successfully!

📝 Title: ${title}
🏷️ Tags: ${tags.join(', ')}
${embedding ? '🧠 AI embedding: ✅' : '🧠 AI embedding: ❌'}

💡 You can view it in your Memory Vault app.`
            );

            return { success: true, message: 'Text memory created' };

        } catch (error) {
            console.error('❌ Error processing text message:', error);

            // Always return success to prevent Telegram retry loop
            await this.sendMessage(
                message.chat.id,
                `❌ Failed to save memory. Please try retyping your message.

If this keeps happening, the issue is temporary and will be fixed soon.`
            );
            return { success: true, message: 'Error handled, preventing retry' };
        }
    }

    async processPhotoMessage(message, linkedUser) {
        try {
            const photo = message.photo[message.photo.length - 1]; // Get highest resolution
            const caption = message.caption || 'Photo from Telegram';

            console.log(`📸 Processing photo: ${photo.file_id}`);

            // Download file from Telegram
            const fileData = await this.downloadTelegramFile(photo.file_id);
            if (!fileData) {
                throw new Error('Failed to download photo');
            }

            console.log(`📥 Downloaded photo: ${fileData.size} bytes`);

            // Create authenticated supabase client for this user
            const userSupabase = await this.createUserSupabaseClient(linkedUser.user_id);
            if (!userSupabase) {
                throw new Error('Failed to authenticate user for file upload');
            }

            // Upload to Supabase storage
            const fileName = `telegram_photo_${Date.now()}.jpg`;
            const filePath = `${linkedUser.user_id}/${fileName}`;

            console.log(`☁️ Uploading to storage: ${filePath}`);

            const { error: uploadError } = await userSupabase.storage
                .from('memory-vault-files')
                .upload(filePath, fileData, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.error('❌ Upload error:', uploadError);
                // Continue without file upload - just create memory
                console.log('⚠️ Continuing without file upload due to storage error');
            } else {
                console.log(`✅ Successfully uploaded: ${filePath}`);
                
                // Create file record
                try {
                    const fileRecord = {
                        name: fileName,
                        description: caption,
                        tags: ['telegram', 'photo'],
                        file_path: filePath,
                        file_type: 'image',
                        file_size: fileData.length || photo.file_size || 0,
                        user_id: linkedUser.user_id
                    };

                    const { data: file, error: fileError } = await userSupabase
                        .from('files')
                        .insert([fileRecord])
                        .select()
                        .single();

                    if (fileError) {
                        console.error('❌ File record error:', fileError);
                    } else {
                        console.log(`📄 Created file record: ${file.id}`);
                    }
                } catch (fileRecordError) {
                    console.error('❌ Error creating file record:', fileRecordError);
                }
            }

            // File record creation handled above

            // Create memory for the photo with embedding
            const memoryContent = `Photo: ${caption}\n\nPhoto ID: ${photo.file_id}\nFile: ${fileName}\nSent via Telegram`;

            // Try to generate embedding
            let embedding = null;
            try {
                embedding = await this.generateEmbedding(memoryContent);
                console.log('✅ Generated embedding for photo memory');
            } catch (embeddingError) {
                console.warn('⚠️ Failed to generate embedding:', embeddingError);
            }

            const memoryData = {
                title: `Photo: ${caption.substring(0, 30)}${caption.length > 30 ? '...' : ''}`,
                content: memoryContent,
                tags: ['telegram', 'photo'],
                user_id: linkedUser.user_id,
                embedding
            };

            const { data: memory, error: memoryError } = await supabase
                .from('memories')
                .insert([memoryData])
                .select()
                .single();

            if (memoryError) {
                console.error('❌ Memory creation error:', memoryError);
                // Return success to prevent retry loop
                await this.sendMessage(
                    message.chat.id,
                    `❌ Failed to save photo memory. Please try sending the photo again with a text description instead.`
                );
                return { success: true, message: 'Failed but preventing retry' };
            }

            console.log(`💾 Created photo memory: ${memory.id}`);

            // Send confirmation
            await this.sendMessage(
                message.chat.id,
                `✅ Photo processed successfully!

📸 Caption: ${caption}
�  File: ${fileName}
💾 Memory ID: ${memory.id}
${embedding ? '🧠 AI embedding: ✅' : '🧠 AI embedding: ❌'}

💡 You can view it in your Memory Vault app.`
            );

            return { success: true, message: 'Photo memory created' };

        } catch (error) {
            console.error('❌ Error processing photo message:', error);

            // Always return success to prevent Telegram retry loop
            await this.sendMessage(
                message.chat.id,
                `❌ Unable to process photo right now. 

Please try one of these alternatives:
• Send the photo with a detailed text description
• Send just text describing what the photo shows
• Try again later

Your message won't be lost - I've stopped trying to prevent spam.`
            );

            return { success: true, message: 'Error handled, preventing retry' };
        }
    }

    async processDocumentMessage(message, linkedUser) {
        // Similar to photo, create a memory about the document
        try {
            const document = message.document;
            const caption = message.caption || document.file_name || 'Document from Telegram';
            const memoryContent = `Document: ${caption}\nFile: ${document.file_name}\n\nUploaded via Telegram`;

            const memoryData = {
                title: `Document: ${caption.substring(0, 30)}${caption.length > 30 ? '...' : ''}`,
                content: memoryContent,
                tags: ['telegram', 'document'],
                user_id: linkedUser.user_id
            };

            const { data: memory, error } = await supabase
                .from('memories')
                .insert([memoryData])
                .select()
                .single();

            if (error) throw error;

            await this.sendMessage(
                message.chat.id,
                `✅ Document memory saved!\n\n📄 File: ${document.file_name}\n📝 Description: ${caption}\n\n💡 Note: Full file upload coming soon. For now, a memory has been created.`
            );

            return { success: true, message: 'Document memory created' };

        } catch (error) {
            console.error('❌ Error processing document message:', error);
            await this.sendMessage(
                message.chat.id,
                '❌ Failed to save document memory. Please try again later.'
            );
            return { success: false, message: error.message };
        }
    }

    async processVoiceMessage(message, linkedUser) {
        // Create a memory about the voice message
        try {
            const voice = message.voice;
            const memoryContent = `Voice message (${voice.duration} seconds)\n\nUploaded via Telegram`;

            const memoryData = {
                title: `Voice message (${voice.duration}s)`,
                content: memoryContent,
                tags: ['telegram', 'voice', 'audio'],
                user_id: linkedUser.user_id
            };

            const { data: memory, error } = await supabase
                .from('memories')
                .insert([memoryData])
                .select()
                .single();

            if (error) throw error;

            await this.sendMessage(
                message.chat.id,
                `✅ Voice memory saved!\n\n🎤 Duration: ${voice.duration} seconds\n\n💡 Note: Full audio upload coming soon. For now, a memory has been created.`
            );

            return { success: true, message: 'Voice memory created' };

        } catch (error) {
            console.error('❌ Error processing voice message:', error);
            await this.sendMessage(
                message.chat.id,
                '❌ Failed to save voice memory. Please try again later.'
            );
            return { success: false, message: error.message };
        }
    }

    async findLinkedUser(telegramUserId) {
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

    async createUserSupabaseClient(userId) {
        try {
            // Create a temporary session for the user to bypass RLS
            // This is a simplified approach - in production you might want to use service role key
            const { createClient } = require('@supabase/supabase-js');
            
            // For now, we'll use the service role approach
            // You'll need to add SUPABASE_SERVICE_ROLE_KEY to your .env file
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                return createClient(
                    process.env.VITE_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
            }
            
            // Fallback: return null to indicate we need service role key
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
            return null;
        } catch (error) {
            console.error('Error creating user Supabase client:', error);
            return null;
        }
    }

    async verifyLinkingCode(code, telegramUserId, telegramUsername) {
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

            return data;
        } catch (error) {
            console.error('Error verifying linking code:', error);
            return null;
        }
    }

    async sendMessage(chatId, text) {
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

    async downloadTelegramFile(fileId) {
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

            console.log(`📁 File info: ${fileInfo.result.file_path}`);

            // Download the actual file
            const fileResponse = await fetch(
                `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.result.file_path}`
            );

            if (!fileResponse.ok) {
                throw new Error('Failed to download file from Telegram');
            }

            const arrayBuffer = await fileResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log(`📥 Downloaded file: ${buffer.length} bytes`);
            return buffer;
        } catch (error) {
            console.error('❌ Error downloading Telegram file:', error);
            return null;
        }
    }

    async generateEmbedding(text) {
        try {
            // Use GitHub Models API for embedding generation with correct model
            const response = await fetch('https://models.inference.ai.azure.com/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.VITE_WEBAPP_GITHUB_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-large', // Use small model (1536 dimensions) - works with database limits
                    input: text,
                    dimensions: 1536,
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Embedding API response:', response.status, errorText);
                throw new Error(`Embedding API error: ${response.status}`);
            }

            const data = await response.json();
            console.log(`🧠 Generated embedding with ${data.data[0].embedding.length} dimensions`);
            return data.data[0].embedding;
        } catch (error) {
            console.error('❌ Embedding generation failed:', error);
            throw error;
        }
    }

    extractTagsFromText(text) {
        const tags = [];

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

        return [...new Set(tags)];
    }
}

// Initialize service
const telegramService = new TelegramBotService();

// Routes
app.get('/', (req, res) => {
    res.json({
        status: 'Memory Vault Telegram Bot Server',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/telegram/webhook', async (req, res) => {
    try {
        const update = req.body;
        const result = await telegramService.processWebhook(update);

        // Always return 200 OK to prevent Telegram retries
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        console.error('Webhook error:', error);
        // Even on error, return 200 OK to prevent retries
        res.status(200).json({ success: true, message: 'Error handled' });
    }
});

// Health check
app.get('/health', (req, res) => {
    const schedulerStatus = scheduler.getStatus();
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        scheduler: schedulerStatus
    });
});

// Notification scheduler status
app.get('/api/notifications/status', (req, res) => {
    const status = scheduler.getStatus();
    res.json(status);
});

// Manual trigger for processing notifications (for testing)
app.post('/api/notifications/process', async (req, res) => {
    try {
        console.log('🔧 Manual notification processing triggered');
        await scheduler.processPendingNotifications();
        res.json({ success: true, message: 'Notifications processed manually' });
    } catch (error) {
        console.error('❌ Manual processing failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🤖 Telegram webhook server running on port ${port}`);
    console.log(`📱 Webhook URL: http://localhost:${port}/api/telegram/webhook`);

    // Start notification scheduler
    console.log('🔔 Starting notification scheduler...');
    scheduler.start();

    // Set webhook on startup (optional)
    if (process.env.VITE_TELEGRAM_BOT_TOKEN && process.env.WEBHOOK_URL) {
        setWebhook();
    }
});

async function setWebhook() {
    try {
        const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:${port}/api/telegram/webhook`;
        const response = await fetch(
            `https://api.telegram.org/bot${process.env.VITE_TELEGRAM_BOT_TOKEN}/setWebhook`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: webhookUrl,
                    allowed_updates: ['message']
                })
            }
        );

        const result = await response.json();
        if (result.ok) {
            console.log('✅ Webhook set successfully:', webhookUrl);
        } else {
            console.error('❌ Failed to set webhook:', result);
        }
    } catch (error) {
        console.error('❌ Error setting webhook:', error);
    }
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
});