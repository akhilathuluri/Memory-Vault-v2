import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    MessageCircle,
    Link,
    Unlink,
    Settings,
    CheckCircle,
    XCircle,
    Copy,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    Send,
    Image,
    FileText,
    Mic,
    MapPin,
    Hash,
    Zap
} from 'lucide-react';
import { useTelegramStore } from '../../stores/telegramStore';
import { useAuthStore } from '../../stores/authStore';

export const ExternalMemoryCreation: React.FC = () => {
    const { user } = useAuthStore();
    const {
        linkedUsers,
        loading,
        botInfo,
        isConfigured,
        fetchLinkedUsers,
        unlinkTelegramUser,
        fetchBotInfo,
        checkConfiguration
    } = useTelegramStore();

    const [linkingCode, setLinkingCode] = useState<string>('');
    const [showSetup, setShowSetup] = useState(false);
    const [showUsage, setShowUsage] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);

    useEffect(() => {
        if (user) {
            fetchLinkedUsers();
            fetchBotInfo();
            checkConfiguration();
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
            {/* Configuration Status */}
            <div className="glass-card-strong rounded-xl p-6 border border-white/30 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-lg ${isConfigured
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                : 'bg-gradient-to-br from-red-500 to-red-600'
                            }`}>
                            {isConfigured ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                                <XCircle className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Configuration Status</h4>
                            <p className="text-sm text-slate-600">
                                {isConfigured ? 'Telegram bot is ready to use' : 'Bot configuration required'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSetup(!showSetup)}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-100/70 hover:bg-indigo-200/70 text-indigo-700 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Setup Guide</span>
                        {showSetup ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        {isConfigured ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-slate-700 font-medium">
                            Bot Configuration: {isConfigured ? 'Ready' : 'Not Configured'}
                        </span>
                    </div>

                    {botInfo && (
                        <div className="flex items-center space-x-3">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-slate-700">
                                Bot: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">@{botInfo.username}</span> ({botInfo.first_name})
                            </span>
                        </div>
                    )}

                    {linkedUsers.length > 0 && (
                        <div className="flex items-center space-x-3">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-slate-700">
                                Account Linked: <span className="font-medium text-emerald-700">{linkedUsers.length} connection(s)</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Setup Guide */}
            {showSetup && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card-medium rounded-xl p-6 border border-white/20 backdrop-blur-sm"
                >
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-indigo-600" />
                        Setup Instructions
                    </h4>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white font-bold text-sm">
                                    1
                                </div>
                                <h5 className="font-semibold text-slate-800">Create Telegram Bot</h5>
                            </div>
                            <div className="ml-11 space-y-2 text-sm text-slate-600">
                                <p>• Message <span className="font-mono bg-slate-100 px-2 py-1 rounded">@BotFather</span> on Telegram</p>
                                <p>• Send <span className="font-mono bg-slate-100 px-2 py-1 rounded">/newbot</span> and follow instructions</p>
                                <p>• Copy the bot token for configuration</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white font-bold text-sm">
                                    2
                                </div>
                                <h5 className="font-semibold text-slate-800">Configure Environment</h5>
                            </div>
                            <div className="ml-11">
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                                    <div>VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here</div>
                                    <div>VITE_TELEGRAM_WEBHOOK_URL={webhookUrl}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg text-white font-bold text-sm">
                                    3
                                </div>
                                <h5 className="font-semibold text-slate-800">Link Your Account</h5>
                            </div>
                            <div className="ml-11 text-sm text-slate-600">
                                <p>Use the linking section below to connect your Telegram account</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Account Linking */}
            {isConfigured && (
                <div className="glass-card-medium rounded-xl p-6 border border-white/20 backdrop-blur-sm">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg">
                            <Link className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Account Linking</h4>
                            <p className="text-sm text-slate-600">Connect your Telegram account to start creating memories</p>
                        </div>
                    </div>

                    {linkedUsers.length === 0 ? (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h5 className="font-semibold text-slate-800">Your Linking Code</h5>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={generateLinkingCode}
                                            disabled={generatingCode}
                                            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            <Zap className="w-4 h-4" />
                                            <span>{generatingCode ? 'Generating...' : 'New Code'}</span>
                                        </button>
                                        <button
                                            onClick={copyLinkingCode}
                                            disabled={!linkingCode || linkingCode === 'ERROR'}
                                            className="flex items-center space-x-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            <Copy className="w-4 h-4" />
                                            <span>Copy</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200/50">
                                    <div className="font-mono text-2xl text-center text-slate-800 font-bold tracking-wider">
                                        {generatingCode ? 'Generating...' : linkingCode || 'Click "New Code" to generate'}
                                    </div>
                                    {linkingCode && linkingCode !== 'ERROR' && (
                                        <p className="text-xs text-emerald-600 text-center mt-2 font-medium">
                                            ✅ Code is ready to use
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                                <h5 className="font-semibold text-slate-800 mb-4">Linking Steps</h5>
                                <div className="space-y-3">
                                    {[
                                        'Click "New Code" above to generate a linking code',
                                        `Open Telegram and find your bot: @${botUsername}`,
                                        'Send /start to begin',
                                        'Send /link YOUR_CODE',
                                        'Your account will be linked automatically'
                                    ].map((step, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <div className="flex items-center justify-center w-6 h-6 bg-indigo-500 text-white rounded-full text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <span className="text-sm text-slate-700">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <a
                                    href={`https://t.me/${botUsername}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                    <span>Open Bot in Telegram</span>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    <span className="font-semibold text-emerald-800">Account Successfully Linked!</span>
                                </div>
                                <p className="text-sm text-emerald-700 mt-1 ml-8">
                                    You can now send messages and files directly to your Memory Vault via Telegram.
                                </p>
                            </div>

                            {linkedUsers.map((linkedUser) => (
                                <div key={linkedUser.id} className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
                                            <MessageCircle className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">
                                                @{linkedUser.telegram_username || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                ID: <span className="font-mono">{linkedUser.telegram_user_id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUnlink(linkedUser.telegram_user_id)}
                                        className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                                        disabled={loading}
                                    >
                                        <Unlink className="w-4 h-4" />
                                        <span>Unlink</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Usage Instructions */}
            {linkedUsers.length > 0 && (
                <div className="glass-card-medium rounded-xl p-6 border border-white/20 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">How to Use</h4>
                                <p className="text-sm text-slate-600">Start creating memories via Telegram</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowUsage(!showUsage)}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-100/70 hover:bg-purple-200/70 text-purple-700 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm"
                        >
                            <span>View Guide</span>
                            {showUsage ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    {showUsage && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg">
                                            <Send className="w-4 h-4 text-white" />
                                        </div>
                                        <h5 className="font-semibold text-slate-800">Text Messages</h5>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <p>• Any text message becomes a memory</p>
                                        <p>• First line becomes the title</p>
                                        <p>• Use <Hash className="w-3 h-3 inline mx-1" />hashtags for auto-tagging</p>
                                        <p>• AI embeddings for smart search</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-lg">
                                            <Image className="w-4 h-4 text-white" />
                                        </div>
                                        <h5 className="font-semibold text-slate-800">Photos & Files</h5>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <p>• Photos, documents, voice messages</p>
                                        <p>• Add captions for context</p>
                                        <p>• Automatic file upload & linking</p>
                                        <p>• Searchable file metadata</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-lg">
                                            <Mic className="w-4 h-4 text-white" />
                                        </div>
                                        <h5 className="font-semibold text-slate-800">Voice Messages</h5>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <p>• Voice notes saved as audio files</p>
                                        <p>• Automatic transcription (coming soon)</p>
                                        <p>• Perfect for quick thoughts</p>
                                        <p>• Hands-free memory creation</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
                                            <MapPin className="w-4 h-4 text-white" />
                                        </div>
                                        <h5 className="font-semibold text-slate-800">Location Context</h5>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <p>• Share location for context</p>
                                        <p>• Automatic location tagging</p>
                                        <p>• Search memories by place</p>
                                        <p>• Find nearby memories</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200">
                                <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                                    <Zap className="w-5 h-5 mr-2 text-indigo-600" />
                                    Pro Tips
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                                    <div className="space-y-2">
                                        <p>• <strong>Quick capture:</strong> Send photos with captions</p>
                                        <p>• <strong>Organization:</strong> Use consistent hashtags</p>
                                        <p>• <strong>Context:</strong> Include location when relevant</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p>• <strong>Search:</strong> All content is AI-searchable</p>
                                        <p>• <strong>Privacy:</strong> Only you can see your memories</p>
                                        <p>• <strong>Sync:</strong> Instantly available in web app</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Error State */}
            {!isConfigured && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                            <XCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-red-800">Configuration Required</h4>
                            <p className="text-sm text-red-700">Telegram bot is not properly configured</p>
                        </div>
                    </div>
                    <div className="bg-red-100/50 rounded-lg p-4 border border-red-200/50">
                        <p className="text-sm text-red-700">
                            Please configure your Telegram bot token and webhook URL in the environment variables.
                            Use the setup guide above for detailed instructions.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};