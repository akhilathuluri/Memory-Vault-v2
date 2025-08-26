# 🤖 Telegram Integration Setup Guide

This guide will help you set up Telegram integration for your Memory Vault app, allowing users to create memories by sending messages directly to a Telegram bot.

## 📋 Overview

The Telegram integration consists of:
- **Frontend Components**: Settings UI for linking accounts
- **Backend Service**: Telegram bot service for processing messages
- **Database**: Tables for storing Telegram user links and codes
- **Webhook Server**: Express.js server to handle Telegram updates

## 🚀 Quick Start

### 1. Create Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# Telegram Bot Configuration
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
VITE_TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

### 3. Run Database Migration

Apply the Telegram integration migration:

```bash
# If using Supabase CLI
supabase migration up

# Or apply the SQL directly in Supabase dashboard
# File: supabase/migrations/20250815000000_add_telegram_integration.sql
```

### 4. Deploy Webhook Server

#### Option A: Deploy to Railway/Render/Heroku

1. Copy the `server/` directory to your deployment platform
2. Set environment variables:
   - `VITE_TELEGRAM_BOT_TOKEN`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `WEBHOOK_URL` (your deployed server URL)

#### Option B: Deploy to Vercel/Netlify (Serverless)

Create `api/telegram/webhook.js`:

```javascript
// Serverless function version
import { handleTelegramWebhook } from '../../src/api/telegram/webhook';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await handleTelegramWebhook(req);
    const result = await response.json();
    
    res.status(response.status).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 5. Set Webhook URL

The webhook will be automatically set when you start the server, or you can set it manually:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

## 🔧 Features

### ✅ Implemented Features

#### **Text Messages**
- Any text message creates a memory
- First line becomes the title
- Automatic hashtag extraction (`#work`, `#personal`, etc.)
- Auto-tagging with common keywords

#### **Bot Commands**
- `/start` - Welcome message and setup instructions
- `/help` - Show available commands and usage
- `/link CODE` - Link Telegram account using code from app
- `/unlink` - Unlink Telegram account
- `/status` - Check account linking status

#### **Account Linking**
- Secure linking codes (expire in 1 hour)
- Multiple Telegram accounts per user
- Easy unlinking from app settings

#### **File Support** (Basic)
- Photo messages create memories with captions
- Document messages create memories with file info
- Voice messages create memories with duration info

### 🚧 Coming Soon

#### **Full File Upload**
- Actual file storage in Supabase
- OCR text extraction from images
- Audio transcription for voice messages
- File search and organization

#### **Advanced Features**
- Location-based memories
- Scheduled messages
- Memory reminders
- Group chat support

## 📱 User Experience

### Linking Account

1. User goes to Memory Vault app → Settings → Telegram Integration
2. Clicks "Generate Linking Code" (expires in 1 hour)
3. Opens Telegram bot and sends `/link ABC123`
4. Bot confirms successful linking
5. User can now send messages to create memories

### Creating Memories

#### Text Messages
```
User: "Had a great meeting with the team today #work #meeting

Discussed the new project roadmap and assigned tasks. Everyone seems excited about the direction we're heading."

Bot: "✅ Memory saved successfully!

📝 Title: Had a great meeting with the team today
🏷️ Tags: work, meeting, telegram

💡 You can view it in your Memory Vault app."
```

#### Photos
```
User: [Sends photo with caption "Beautiful sunset at the beach"]

Bot: "✅ Photo memory saved!

📸 Caption: Beautiful sunset at the beach

💡 Note: Full photo upload coming soon. For now, a memory has been created with your caption."
```

## 🔒 Security Features

### Account Linking Security
- **Time-limited codes**: Linking codes expire after 1 hour
- **One-time use**: Each code can only be used once
- **User verification**: Only authenticated app users can generate codes

### Data Protection
- **Row Level Security**: All database tables have RLS policies
- **User isolation**: Users can only access their own data
- **Secure tokens**: Bot tokens stored as environment variables

### Privacy Controls
- **Opt-in linking**: Users must explicitly link their accounts
- **Easy unlinking**: Users can unlink anytime from app settings
- **Message logging**: Optional logging for debugging (can be disabled)

## 🛠️ Development

### Local Development

1. **Start the webhook server:**
```bash
cd server
npm install
npm run dev
```

2. **Use ngrok for local testing:**
```bash
ngrok http 3001
# Use the ngrok URL as your webhook URL
```

3. **Test the integration:**
```bash
# Set webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-ngrok-url.ngrok.io/api/telegram/webhook"

# Send test message to your bot
```

### Database Schema

The integration adds these tables:

- `telegram_users` - Links Telegram accounts to app users
- `telegram_linking_codes` - Secure codes for account linking
- `telegram_messages` - Optional message logging for debugging

### API Endpoints

- `POST /api/telegram/webhook` - Receives Telegram updates
- `GET /health` - Health check endpoint
- `GET /` - Server status

## 📊 Monitoring

### Webhook Health
- Monitor webhook endpoint uptime
- Check Telegram webhook info: `GET https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### Error Handling
- All errors are logged to console
- Failed messages send error responses to users
- Graceful degradation for unsupported message types

### Analytics
- Track message processing success/failure
- Monitor user engagement
- Optional message logging for insights

## 🚀 Deployment Examples

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add
railway deploy
```

### Vercel Deployment

```json
// vercel.json
{
  "functions": {
    "api/telegram/webhook.js": {
      "runtime": "@vercel/node"
    }
  }
}
```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🎯 Best Practices

### Bot Configuration
- Use descriptive bot name and description
- Set bot commands with @BotFather
- Configure bot privacy settings

### Error Handling
- Always respond to user messages
- Provide clear error messages
- Log errors for debugging

### Performance
- Use database indexes for fast lookups
- Implement rate limiting if needed
- Cache frequently accessed data

### Security
- Validate all incoming data
- Use HTTPS for webhook URLs
- Rotate bot tokens periodically

## 🆘 Troubleshooting

### Common Issues

#### "Webhook not receiving updates"
- Check webhook URL is accessible
- Verify SSL certificate is valid
- Check Telegram webhook info

#### "User not linked" errors
- Verify linking code generation
- Check database RLS policies
- Ensure user is authenticated

#### "Failed to save memory"
- Check Supabase connection
- Verify database permissions
- Check memory table schema

### Debug Commands

```bash
# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Delete webhook (for testing)
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Test database connection
# Use Supabase dashboard or CLI
```

## 📚 Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## 🎉 Success!

Once set up, users can:
- ✅ Send text messages to create memories instantly
- ✅ Use hashtags for automatic tagging
- ✅ Send photos and files (basic support)
- ✅ Link/unlink accounts securely
- ✅ Get immediate confirmation of saved memories
- ✅ Access all memories in the main app

The integration maintains the high-quality UX of your Memory Vault while adding powerful external memory creation capabilities! 🚀