import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, ExternalLink, FileText, File } from 'lucide-react';
import { useChatbotStore } from '../../stores/chatbotStore';
import { ChatMessage } from '../../types/chatbot';
import ConversationSidebar from './ConversationSidebar';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatbotInterface: React.FC = () => {
    const [input, setInput] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true); // Start with sidebar open
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        currentConversation,
        loading,
        error,
        sendMessage,
        createConversation,
        clearError
    } = useChatbotStore();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentConversation?.messages]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Don't auto-create conversation - let user send first message to create it

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const message = input.trim();
        setInput('');

        try {
            await sendMessage(message);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const renderMessage = (message: ChatMessage, index: number) => {
        const isUser = message.role === 'user';
        const isLast = index === (currentConversation?.messages.length || 0) - 1;

        return (
            <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    duration: 0.3,
                    delay: isLast ? 0.1 : 0,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                }}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : ''}`}>
                    <div className={`inline-block p-4 rounded-2xl shadow-sm ${isUser
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : 'glass-card-strong text-slate-800'
                        }`}>
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-slate">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // Custom styling for markdown elements
                                    h1: ({children}) => <h1 className="text-lg font-bold text-slate-900 mb-2">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-base font-semibold text-slate-800 mb-2">{children}</h2>,
                                    h3: ({children}) => <h3 className="text-sm font-medium text-slate-700 mb-1">{children}</h3>,
                                    p: ({children}) => <p className="mb-2 text-slate-700">{children}</p>,
                                    strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                                    table: ({children}) => <table className="min-w-full border-collapse border border-slate-300 my-2">{children}</table>,
                                    th: ({children}) => <th className="border border-slate-300 px-2 py-1 bg-slate-100 font-medium text-xs">{children}</th>,
                                    td: ({children}) => <td className="border border-slate-300 px-2 py-1 text-xs">{children}</td>,
                                    ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                    ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                    li: ({children}) => <li className="text-slate-700 text-sm">{children}</li>,
                                    a: ({href, children}) => <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                                    code: ({children}) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                    blockquote: ({children}) => <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-600">{children}</blockquote>
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>

                        {/* Sources */}
                        {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/20">
                                <p className="text-xs opacity-75 mb-2">Sources:</p>
                                <div className="space-y-1">
                                    {message.sources.map((source, idx) => (
                                        <div key={idx} className="flex items-center space-x-2 text-xs opacity-90">
                                            {source.type === 'memory' ? (
                                                <FileText className="w-3 h-3" />
                                            ) : (
                                                <File className="w-3 h-3" />
                                            )}
                                            <span className="truncate">{source.title}</span>
                                            {source.similarity && (
                                                <span className="text-xs opacity-60">
                                                    ({Math.round(source.similarity * 100)}%)
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <p className={`text-xs text-slate-500 mt-1 ${isUser ? 'text-right' : ''}`}>
                        {format(new Date(message.timestamp), 'HH:mm')}
                    </p>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex relative overflow-hidden">
            {/* Conversation Sidebar */}
            <ConversationSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            {/* Main Chat Area */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
                    sidebarOpen ? 'md:ml-80' : 'ml-0'
                }`}
            >
                {/* Chat Header */}
                <div className="glass-card-strong rounded-t-2xl p-4 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">AI Assistant</h3>
                            <p className="text-sm text-slate-600">Ask me anything about your memories</p>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                        <p className="text-red-800 text-sm">{error}</p>
                        <button
                            onClick={clearError}
                            className="text-red-600 hover:text-red-800 text-xs mt-1"
                        >
                            Dismiss
                        </button>
                    </motion.div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
                    <AnimatePresence>
                        {currentConversation?.messages.map((message, index) =>
                            renderMessage(message, index)
                        )}
                    </AnimatePresence>

                    {/* Loading Indicator */}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start space-x-3"
                        >
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="glass-card-strong p-4 rounded-2xl">
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                    <span className="text-sm text-slate-600">Thinking...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="glass-card-strong rounded-b-2xl p-4 border-t border-white/10">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything about your memories..."
                                className="w-full px-4 py-3 bg-white/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-500"
                                disabled={loading}
                            />
                        </div>
                        <motion.button
                            type="submit"
                            disabled={!input.trim() || loading}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <Send className="w-5 h-5" />
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ChatbotInterface;