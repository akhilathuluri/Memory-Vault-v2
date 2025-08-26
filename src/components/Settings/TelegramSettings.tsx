import React, { useEffect, useState } from 'react';
import { MessageCircle, Link, Unlink, Settings, CheckCircle, XCircle, Copy, ExternalLink } from 'lucide-react';
import { useTelegramStore } from '../../stores/telegramStore';
import { useAuthStore } from '../../stores/authStore';

export const TelegramSettings: React.FC = () => {
  const { user } = useAuthStore();
  const {
    linkedUsers,
    loading,
    botInfo,
    isConfigured,
    fetchLinkedUsers,
    unlinkTelegramUser,
    fetchBotInfo,
    checkConfiguration,
    setupWebhook
  } = useTelegramStore();

  const [linkingCode, setLinkingCode] = useState<string>('');
  const [showSetup, setShowSetup] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLinkedUsers();
      fetchBotInfo();
      checkConfiguration();
      // Don't auto-generate code - only when user clicks button
    }
  }, [user]);

  const generateLinkingCode = async () => {
    if (!user) return;
    
    setGeneratingCode(true);
    try {
      const { generateLinkingCode: generateCode } = await import('../../api/telegram/generate-code');
      const result = await generateCode();
      
      if (result.code) {
        setLinkingCode(result.code);
      } else {
        console.error('Failed to generate linking code:', result.error);
        setLinkingCode('ERROR');
      }
    } catch (error) {
      console.error('Error generating linking code:', error);
      setLinkingCode('ERROR');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyLinkingCode = () => {
    navigator.clipboard.writeText(linkingCode);
  };

  const handleUnlink = async (telegramUserId: string) => {
    if (confirm('Are you sure you want to unlink this Telegram account?')) {
      await unlinkTelegramUser(telegramUserId);
    }
  };

  const botUsername = botInfo?.username || 'your_memory_bot';
  const webhookUrl = import.meta.env.VITE_TELEGRAM_WEBHOOK_URL || 'https://your-domain.com/api/telegram/webhook';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <MessageCircle className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Telegram Integration</h3>
          <p className="text-gray-400 text-sm">
            Send messages and files directly to your Memory Vault via Telegram
          </p>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white">Configuration Status</h4>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            Setup Guide
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-gray-300">
              Bot Configuration: {isConfigured ? 'Ready' : 'Not Configured'}
            </span>
          </div>

          {botInfo && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                Bot: @{botInfo.username} ({botInfo.first_name})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide */}
      {showSetup && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="font-medium text-white mb-3">Setup Instructions</h4>
          <div className="space-y-3 text-sm text-gray-300">
            <div>
              <strong className="text-white">1. Create Telegram Bot:</strong>
              <ul className="ml-4 mt-1 space-y-1 list-disc">
                <li>Message @BotFather on Telegram</li>
                <li>Send /newbot and follow instructions</li>
                <li>Copy the bot token</li>
              </ul>
            </div>
            
            <div>
              <strong className="text-white">2. Configure Environment:</strong>
              <div className="bg-gray-900 rounded p-2 mt-1 font-mono text-xs">
                VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here<br/>
                VITE_TELEGRAM_WEBHOOK_URL={webhookUrl}
              </div>
            </div>

            <div>
              <strong className="text-white">3. Set Webhook:</strong>
              <p className="ml-4 mt-1">
                The webhook will be automatically configured when you restart the app.
              </p>
            </div>

            <div>
              <strong className="text-white">4. Link Your Account:</strong>
              <p className="ml-4 mt-1">
                Use the linking code below to connect your Telegram account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Linking */}
      {isConfigured && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="font-medium text-white mb-3">Link Telegram Account</h4>
          
          {linkedUsers.length === 0 ? (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                To start sending memories via Telegram, link your account:
              </p>
              
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Your Linking Code:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateLinkingCode}
                      disabled={generatingCode}
                      className="text-gray-400 hover:text-gray-300 text-sm flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      {generatingCode ? 'Generating...' : 'New Code'}
                    </button>
                    <button
                      onClick={copyLinkingCode}
                      disabled={!linkingCode || linkingCode === 'ERROR'}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="font-mono text-lg text-white bg-gray-800 rounded p-2 text-center">
                  {generatingCode ? 'Generating...' : linkingCode || 'Click "New Code" to generate'}
                </div>
                {linkingCode && linkingCode !== 'ERROR' && (
                  <p className="text-xs text-gray-400 mt-2">
                    ✅ Code is ready to use (no expiration)
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-300">
                <p><strong className="text-white">Steps:</strong></p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Click "New Code" above to generate a linking code</li>
                  <li>Open Telegram and find your bot: @{botUsername}</li>
                  <li>Send /start to begin</li>
                  <li>Send /link YOUR_CODE</li>
                  <li>Your account will be linked automatically</li>
                </ol>
              </div>

              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Bot in Telegram
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-green-400 text-sm">
                ✅ Your Telegram account is linked! You can now send messages and files.
              </p>
              
              {linkedUsers.map((linkedUser) => (
                <div key={linkedUser.id} className="flex items-center justify-between bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Link className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        @{linkedUser.telegram_username || 'Unknown'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        ID: {linkedUser.telegram_user_id}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUnlink(linkedUser.telegram_user_id)}
                    className="flex items-center gap-1 px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors text-sm"
                    disabled={loading}
                  >
                    <Unlink className="w-3 h-3" />
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Usage Instructions */}
      {linkedUsers.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="font-medium text-white mb-3">How to Use</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-white">Send Text Messages:</strong></p>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Any text message will be saved as a memory</li>
              <li>Use #hashtags to auto-tag your memories</li>
              <li>First line becomes the memory title</li>
            </ul>

            <p className="pt-2"><strong className="text-white">Send Files:</strong></p>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Photos, documents, and voice messages are supported</li>
              <li>Add captions to provide context</li>
              <li>Files are automatically uploaded and linked to memories</li>
            </ul>

            <p className="pt-2"><strong className="text-white">Location Support:</strong></p>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Share your location to add context to memories</li>
              <li>Location data helps with memory search and organization</li>
            </ul>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isConfigured && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-4 h-4" />
            <span className="font-medium">Telegram Not Configured</span>
          </div>
          <p className="text-red-300 text-sm">
            Please configure your Telegram bot token and webhook URL in the environment variables.
            Check the setup guide above for detailed instructions.
          </p>
        </div>
      )}
    </div>
  );
};