import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    Plus,
    Trash2,
    Edit3,
    Check,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useChatbotStore } from '../../stores/chatbotStore';
import { ChatConversation } from '../../types/chatbot';
import { format } from 'date-fns';

interface ConversationSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ isOpen, onToggle }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const {
        conversations,
        currentConversation,
        loading,
        createConversation,
        loadConversation,
        deleteConversation,
        updateConversationTitle,
        setCurrentConversation,
        loadConversations
    } = useChatbotStore();

    // Load conversations when component mounts (only once)
    useEffect(() => {
        console.log('📋 Sidebar: Loading conversations on mount');
        loadConversations();
    }, []); // Empty dependency array to run only once

    const handleCreateConversation = async () => {
        try {
            const newConversation = await createConversation();
            setCurrentConversation(newConversation);
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    const handleSelectConversation = async (conversation: ChatConversation) => {
        if (conversation.id === currentConversation?.id) return;

        try {
            await loadConversation(conversation.id);
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (confirm('Are you sure you want to delete this conversation?')) {
            await deleteConversation(conversationId);
        }
    };

    const handleEditTitle = (conversation: ChatConversation, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(conversation.id);
        setEditTitle(conversation.title);
    };

    const handleSaveTitle = async () => {
        if (editingId && editTitle.trim()) {
            await updateConversationTitle(editingId, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditTitle('');
    };

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                onClick={onToggle}
                className={`absolute top-1/2 -translate-y-1/2 z-40 p-2 bg-white shadow-lg rounded-full border border-gray-200 hover:bg-gray-50 transition-all duration-300 ${isOpen ? 'left-80' : 'left-0'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </motion.button>

            {/* Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-25 z-20 md:hidden"
                            onClick={onToggle}
                        />

                        {/* Sidebar Content */}
                        <motion.div
                            initial={{ x: -320 }}
                            animate={{ x: 0 }}
                            exit={{ x: -320 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl z-30 flex flex-col md:relative md:shadow-none"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                                    <motion.button
                                        onClick={handleCreateConversation}
                                        disabled={loading}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Conversations List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {/* Debug info */}
                                <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
                                    <span>Conversations: {conversations.length} | Loading: {loading ? 'Yes' : 'No'}</span>
                                    <button
                                        onClick={() => {
                                            console.log('🔄 Manual refresh clicked');
                                            loadConversations();
                                        }}
                                        className="text-blue-500 hover:text-blue-700 text-xs underline"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                {conversations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">No conversations yet</p>
                                        <p className="text-gray-400 text-xs">Start a new chat to begin</p>
                                    </div>
                                ) : (
                                    conversations.map((conversation) => (
                                        <motion.div
                                            key={conversation.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${currentConversation?.id === conversation.id
                                                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                                                : 'hover:bg-gray-50 border border-transparent'
                                                }`}
                                            onClick={() => handleSelectConversation(conversation)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    {editingId === conversation.id ? (
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="text"
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveTitle();
                                                                    if (e.key === 'Escape') handleCancelEdit();
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={handleSaveTitle}
                                                                className="p-1 text-green-600 hover:text-green-700"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-1 text-red-600 hover:text-red-700"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h3 className="font-medium text-gray-900 truncate text-sm">
                                                                {conversation.title}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {format(new Date(conversation.updated_at), 'MMM d, HH:mm')}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                                {editingId !== conversation.id && (
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleEditTitle(conversation, e)}
                                                            className="p-1 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                                            className="p-1 text-gray-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default ConversationSidebar;