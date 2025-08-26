#!/bin/bash

# Memory Vault Telegram Bot Deployment Script
# This script helps deploy the Telegram webhook server

echo "🤖 Memory Vault Telegram Bot Deployment"
echo "======================================="

# Check if required environment variables are set
if [ -z "$VITE_TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: VITE_TELEGRAM_BOT_TOKEN is not set"
    echo "Please set your Telegram bot token:"
    echo "export VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here"
    exit 1
fi

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ Error: VITE_SUPABASE_URL is not set"
    echo "Please set your Supabase URL:"
    echo "export VITE_SUPABASE_URL=https://your-project.supabase.co"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: VITE_SUPABASE_ANON_KEY is not set"
    echo "Please set your Supabase anon key:"
    echo "export VITE_SUPABASE_ANON_KEY=your_anon_key_here"
    exit 1
fi

echo "✅ Environment variables configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Start the server
echo "🚀 Starting Telegram webhook server..."
echo "Server will be available at: http://localhost:${PORT:-3001}"
echo "Webhook endpoint: http://localhost:${PORT:-3001}/api/telegram/webhook"
echo ""
echo "To stop the server, press Ctrl+C"
echo ""

npm start