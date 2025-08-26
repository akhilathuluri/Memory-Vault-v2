/**
 * Notification Scheduler Service
 * 
 * This service runs alongside the Telegram webhook server to process
 * scheduled notifications and send them via Telegram at the right time.
 * 
 * Environment Variables Required:
 * - VITE_TELEGRAM_BOT_TOKEN: Your Telegram bot token
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database access
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class NotificationScheduler {
    constructor() {
        this.botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
        this.isRunning = false;
        this.checkInterval = 60000; // Check every minute
        this.intervalId = null;
        
        // Initialize Supabase with service role key for full access
        this.supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        console.log('🔔 Notification Scheduler initialized');
    }

    /**
     * Start the notification scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Scheduler is already running');
            return;
        }

        console.log('🚀 Starting notification scheduler...');
        this.isRunning = true;
        
        // Process immediately on start
        this.processPendingNotifications();
        
        // Set up recurring checks
        this.intervalId = setInterval(() => {
            this.processPendingNotifications();
        }, this.checkInterval);
        
        console.log(`✅ Scheduler started - checking every ${this.checkInterval / 1000} seconds`);
    }

    /**
     * Stop the notification scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Scheduler is not running');
            return;
        }

        console.log('🛑 Stopping notification scheduler...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('✅ Scheduler stopped');
    }

    /**
     * Process all pending notifications that are due
     */
    async processPendingNotifications() {
        try {
            const now = new Date().toISOString();
            
            // Get pending notifications that are due
            const { data: pendingNotifications, error } = await this.supabase
                .from('notifications')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_time', now);

            if (error) {
                console.error('❌ Error fetching pending notifications:', error);
                return;
            }

            if (!pendingNotifications || pendingNotifications.length === 0) {
                // Only log if we're in verbose mode
                if (process.env.VERBOSE_LOGGING === 'true') {
                    console.log('📋 No pending notifications found');
                }
                return;
            }

            console.log(`📋 Processing ${pendingNotifications.length} pending notification(s)`);

            // Process each notification
            for (const notification of pendingNotifications) {
                await this.sendNotification(notification);
            }

        } catch (error) {
            console.error('❌ Error in processPendingNotifications:', error);
        }
    }

    /**
     * Send a single notification via Telegram
     */
    async sendNotification(notification) {
        try {
            console.log(`📤 Sending notification: "${notification.title}" to user ${notification.user_id}`);

            if (!notification.telegram_chat_id) {
                console.log('❌ No Telegram chat ID found for notification');
                await this.markNotificationAsFailed(
                    notification.id, 
                    'No Telegram account linked'
                );
                return;
            }

            // Format the message
            const message = this.formatNotificationMessage(notification);
            
            // Send to Telegram
            await this.sendTelegramMessage(
                parseInt(notification.telegram_chat_id), 
                message
            );

            // Mark as sent
            await this.markNotificationAsSent(notification.id);
            
            // Log to history
            await this.logNotificationHistory(
                notification.id,
                'success'
            );

            console.log(`✅ Notification sent successfully: "${notification.title}"`);

        } catch (error) {
            console.error(`❌ Error sending notification "${notification.title}":`, error);
            
            // Mark as failed
            await this.markNotificationAsFailed(
                notification.id,
                error.message || 'Unknown error'
            );
            
            // Log to history
            await this.logNotificationHistory(
                notification.id,
                'failed',
                error.message || 'Unknown error'
            );
        }
    }

    /**
     * Format notification message for Telegram
     */
    formatNotificationMessage(notification) {
        return `🔔 Here is the message to remind you

📝 Title - ${notification.title}

💬 Message - ${notification.description}

Thank You
Memory Vault Team`;
    }

    /**
     * Send message via Telegram Bot API
     */
    async sendTelegramMessage(chatId, text) {
        if (!this.botToken) {
            throw new Error('Telegram bot token not configured');
        }

        const response = await fetch(
            `https://api.telegram.org/bot${this.botToken}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Telegram API error: ${error.description || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log(`📱 Message sent to chat ${chatId}`);
        return result;
    }

    /**
     * Mark notification as sent
     */
    async markNotificationAsSent(notificationId) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ 
                    status: 'sent',
                    updated_at: new Date().toISOString()
                })
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Error marking notification as sent:', error);
            }
        } catch (error) {
            console.error('❌ Error in markNotificationAsSent:', error);
        }
    }

    /**
     * Mark notification as failed
     */
    async markNotificationAsFailed(notificationId, errorMessage) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ 
                    status: 'failed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Error marking notification as failed:', error);
            }
        } catch (error) {
            console.error('❌ Error in markNotificationAsFailed:', error);
        }
    }

    /**
     * Log notification delivery attempt to history
     */
    async logNotificationHistory(notificationId, status, errorMessage = null) {
        try {
            const historyData = {
                notification_id: notificationId,
                sent_at: new Date().toISOString(),
                status: status,
                error_message: errorMessage
            };

            const { error } = await this.supabase
                .from('notification_history')
                .insert([historyData]);

            if (error) {
                console.error('❌ Error logging notification history:', error);
            }
        } catch (error) {
            console.error('❌ Error in logNotificationHistory:', error);
        }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            checkInterval: this.checkInterval,
            nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval).toISOString() : null
        };
    }
}

// Create global scheduler instance
const scheduler = new NotificationScheduler();

// Handle graceful shutdown
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

// Export for use in other modules
module.exports = { NotificationScheduler, scheduler };

// Start scheduler if this file is run directly
if (require.main === module) {
    console.log('🔔 Starting Notification Scheduler Service...');
    scheduler.start();
    
    // Keep the process alive
    setInterval(() => {
        // Health check - just keep process alive
    }, 30000);
}
