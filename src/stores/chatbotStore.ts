import { create } from 'zustand';
import { ChatMessage, ChatConversation, ChatbotState } from '../types/chatbot';
import { ChatbotService } from '../services/chatbotService';
import toast from 'react-hot-toast';

interface ChatbotStore extends ChatbotState {
  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<ChatConversation>;
  loadConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  setCurrentConversation: (conversation: ChatConversation | null) => void;
  clearError: () => void;
}

export const useChatbotStore = create<ChatbotStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  loading: false,
  error: null,

  loadConversations: async () => {
    console.log('🏪 Store: Loading conversations...');
    set({ loading: true, error: null });
    
    try {
      const chatbotService = ChatbotService.getInstance();
      const conversations = await chatbotService.getConversations();
      
      console.log('🏪 Store: Loaded conversations:', conversations.length);
      set({ conversations, loading: false });
    } catch (error) {
      console.error('🏪 Store: Error loading conversations:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        loading: false 
      });
    }
  },

  createConversation: async (title?: string) => {
    console.log('🏪 Store: Creating conversation with title:', title);
    set({ loading: true, error: null });
    
    try {
      const chatbotService = ChatbotService.getInstance();
      const conversation = await chatbotService.createConversation(title);
      
      console.log('🏪 Store: Conversation created:', conversation);
      
      set(state => {
        console.log('🏪 Store: Adding conversation to list. Current count:', state.conversations.length);
        return {
          conversations: [conversation, ...state.conversations],
          currentConversation: conversation,
          loading: false
        };
      });
      
      return conversation;
    } catch (error) {
      console.error('🏪 Store: Error creating conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create conversation',
        loading: false 
      });
      throw error;
    }
  },

  loadConversation: async (conversationId: string) => {
    set({ loading: true, error: null });
    
    try {
      const chatbotService = ChatbotService.getInstance();
      const conversation = await chatbotService.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      set({ currentConversation: conversation, loading: false });
    } catch (error) {
      console.error('Error loading conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load conversation',
        loading: false 
      });
    }
  },

  sendMessage: async (content: string) => {
    console.log('🏪 Store: Starting sendMessage:', content);
    
    let { currentConversation } = get();
    
    if (!currentConversation) {
      console.log('🏪 Store: No current conversation, creating new one...');
      // Create new conversation if none exists
      try {
        currentConversation = await get().createConversation();
        console.log('🏪 Store: New conversation created:', currentConversation.id);
      } catch (error) {
        console.error('🏪 Store: Failed to create conversation:', error);
        set({ 
          error: 'Failed to create conversation',
          loading: false 
        });
        return;
      }
    }

    const conversation = currentConversation;
    
    // Add user message immediately for better UX
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    console.log('🏪 Store: Adding user message to UI...');
    set(state => ({
      currentConversation: state.currentConversation ? {
        ...state.currentConversation,
        messages: [...state.currentConversation.messages, userMessage]
      } : null,
      loading: true,
      error: null
    }));

    try {
      console.log('🏪 Store: Calling chatbot service...');
      const chatbotService = ChatbotService.getInstance();
      const assistantMessage = await chatbotService.sendMessage(conversation.id, content);
      
      console.log('🏪 Store: Got assistant response, updating UI...');
      set(state => ({
        currentConversation: state.currentConversation ? {
          ...state.currentConversation,
          messages: [...state.currentConversation.messages, assistantMessage],
          updated_at: new Date().toISOString()
        } : null,
        loading: false
      }));

      // Update conversation in the list, or add it if it doesn't exist
      set(state => {
        const existingConvIndex = state.conversations.findIndex(conv => conv.id === conversation.id);
        
        if (existingConvIndex >= 0) {
          // Update existing conversation
          const updatedConversations = [...state.conversations];
          updatedConversations[existingConvIndex] = {
            ...updatedConversations[existingConvIndex],
            updated_at: new Date().toISOString(),
            title: conversation.title || updatedConversations[existingConvIndex].title
          };
          console.log('🏪 Store: Updated existing conversation in list. Total:', updatedConversations.length);
          return { conversations: updatedConversations };
        } else {
          // Add new conversation to the list
          const newConversations = [conversation, ...state.conversations];
          console.log('🏪 Store: Adding new conversation to list. Total:', newConversations.length);
          return {
            conversations: newConversations
          };
        }
      });
      
      console.log('🏪 Store: Message flow completed successfully');

    } catch (error) {
      console.error('🏪 Store: Error sending message:', error);
      
      // Remove the user message on error
      set(state => ({
        currentConversation: state.currentConversation ? {
          ...state.currentConversation,
          messages: state.currentConversation.messages.slice(0, -1)
        } : null,
        error: error instanceof Error ? error.message : 'Failed to send message',
        loading: false
      }));
      
      toast.error('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const chatbotService = ChatbotService.getInstance();
      await chatbotService.deleteConversation(conversationId);
      
      set(state => ({
        conversations: state.conversations.filter(conv => conv.id !== conversationId),
        currentConversation: state.currentConversation?.id === conversationId 
          ? null 
          : state.currentConversation
      }));
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  },

  updateConversationTitle: async (conversationId: string, title: string) => {
    try {
      const chatbotService = ChatbotService.getInstance();
      await chatbotService.updateConversationTitle(conversationId, title);
      
      set(state => ({
        conversations: state.conversations.map(conv => 
          conv.id === conversationId ? { ...conv, title } : conv
        ),
        currentConversation: state.currentConversation?.id === conversationId
          ? { ...state.currentConversation, title }
          : state.currentConversation
      }));
      
      toast.success('Title updated');
    } catch (error) {
      console.error('Error updating conversation title:', error);
      toast.error('Failed to update title');
    }
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  clearError: () => {
    set({ error: null });
  }
}));