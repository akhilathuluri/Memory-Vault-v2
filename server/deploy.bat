@echo off
echo 🤖 Memory Vault Telegram Bot Deployment
echo =======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if required environment variables are set
if "%VITE_TELEGRAM_BOT_TOKEN%"=="" (
    echo ❌ Error: VITE_TELEGRAM_BOT_TOKEN is not set
    echo Please set your Telegram bot token:
    echo set VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
    pause
    exit /b 1
)

if "%VITE_SUPABASE_URL%"=="" (
    echo ❌ Error: VITE_SUPABASE_URL is not set
    echo Please set your Supabase URL:
    echo set VITE_SUPABASE_URL=https://your-project.supabase.co
    pause
    exit /b 1
)

if "%VITE_SUPABASE_ANON_KEY%"=="" (
    echo ❌ Error: VITE_SUPABASE_ANON_KEY is not set
    echo Please set your Supabase anon key:
    echo set VITE_SUPABASE_ANON_KEY=your_anon_key_here
    pause
    exit /b 1
)

echo ✅ Environment variables configured

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed

REM Start the server
echo 🚀 Starting Telegram webhook server...
if "%PORT%"=="" set PORT=3001
echo Server will be available at: http://localhost:%PORT%
echo Webhook endpoint: http://localhost:%PORT%/api/telegram/webhook
echo.
echo To stop the server, press Ctrl+C
echo.

npm start