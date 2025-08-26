import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ChatMessage, ChatConversation } from '../types/chatbot';
import { generateEmbedding, generateAnswer } from './aiService';
import { v4 as uuidv4 } from 'uuid';

class ChatbotService {
  private static instance: ChatbotService;

  static getInstance(): ChatbotService {
    if (!ChatbotService.instance) {
      ChatbotService.instance = new ChatbotService();
    }
    return ChatbotService.instance;
  }

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<ChatConversation> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const conversationData = {
      id: uuidv4(),
      title: title || 'New Conversation',
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert([conversationData])
      .select('id, title, created_at, updated_at, user_id')
      .single();

    if (error) throw error;

    // Return conversation with empty messages array
    return {
      ...data,
      messages: []
    };
  }

  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<ChatConversation[]> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at, user_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Return conversations with empty messages array since we're not loading messages here
    return (data || []).map(conv => ({
      ...conv,
      messages: []
    }));
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(conversationId: string): Promise<ChatConversation | null> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const [conversationResult, messagesResult] = await Promise.all([
      supabase
        .from('chat_conversations')
        .select('id, title, created_at, updated_at, user_id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('chat_messages')
        .select('id, content, role, timestamp, sources')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
    ]);

    if (conversationResult.error) {
      if (conversationResult.error.code === 'PGRST116') return null;
      throw conversationResult.error;
    }

    if (messagesResult.error) throw messagesResult.error;

    return {
      ...conversationResult.data,
      messages: messagesResult.data || []
    };
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    // Create user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    // Save user message
    await supabase
      .from('chat_messages')
      .insert([{
        ...userMessage,
        conversation_id: conversationId,
        user_id: user.id
      }]);

    // Generate AI response
    const aiResponse = await this.generateAIResponse(content, conversationId);

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      content: aiResponse.content,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      sources: aiResponse.sources
    };

    // Save assistant message
    await supabase
      .from('chat_messages')
      .insert([{
        ...assistantMessage,
        conversation_id: conversationId,
        user_id: user.id,
        sources: JSON.stringify(assistantMessage.sources || [])
      }]);

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ 
        updated_at: new Date().toISOString(),
        title: conversationId === userMessage.id ? this.generateConversationTitle(content) : undefined
      })
      .eq('id', conversationId);

    return assistantMessage;
  }

  /**
   * Generate AI response with context from memories and files
   */
  private async generateAIResponse(query: string, conversationId: string): Promise<{
    content: string;
    sources: ChatMessage['sources'];
  }> {
    const { settings } = useSettingsStore.getState();
    
    if (!settings) {
      return {
        content: "I'm not configured with AI capabilities yet. Please set up your API keys in Settings to enable intelligent responses.",
        sources: []
      };
    }

    const webappKeys = useSettingsStore.getState().canUseWebappKeys();
    const canUseAI = settings && (
      settings.api_key_mode === 'webapp' ? 
        webappKeys.github || webappKeys.openrouter :
        !!(settings.github_api_key || settings.openrouter_api_key)
    );

    if (!canUseAI) {
      return {
        content: "I need API keys to provide intelligent responses. Please configure your AI settings to enable this feature.",
        sources: []
      };
    }

    try {
      // Get conversation context
      const conversation = await this.getConversation(conversationId);
      const conversationContext = conversation?.messages.slice(-6) || []; // Last 6 messages for context

      // Search for relevant memories and files
      const queryEmbedding = await generateEmbedding(query);
      
      const [memoriesResult, filesResult] = await Promise.all([
        supabase.rpc('search_memories', {
          query_embedding: queryEmbedding,
          similarity_threshold: 0.3,
          match_count: 5
        }),
        supabase.rpc('search_files', {
          query_embedding: queryEmbedding,
          similarity_threshold: 0.3,
          match_count: 3
        })
      ]);

      const memories = memoriesResult.data || [];
      const files = filesResult.data || [];

      // Prepare context for AI
      const contextItems = [
        ...memories.map((m: any) => ({
          type: 'memory' as const,
          id: m.id,
          title: m.title,
          content: m.content,
          similarity: m.similarity
        })),
        ...files.map((f: any) => ({
          type: 'file' as const,
          id: f.id,
          title: f.name,
          content: `File: ${f.name}${f.description ? ` - ${f.description}` : ''}${f.tags?.length ? ` (Tags: ${f.tags.join(', ')})` : ''}`,
          similarity: f.similarity
        }))
      ];

      // Build conversation context
      const conversationPrompt = conversationContext.length > 0 
        ? `\n\nConversation history:\n${conversationContext.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
        : '';

      // Build context prompt
      const contextPrompt = contextItems.length > 0
        ? `Context from user's memories and files:\n${contextItems.map(item => `${item.title}: ${item.content}`).join('\n\n')}\n\n`
        : '';

      const fullPrompt = `You are a helpful AI assistant for a personal memory management system. Answer the user's question based on their stored memories and files, and the conversation context.

${contextPrompt}${conversationPrompt}User question: ${query}

Please provide a helpful, conversational response. If you reference specific memories or files, be natural about it. If you don't have relevant information, say so politely.`;

      console.log('🎯 Calling generateAnswer with prompt length:', fullPrompt.length);
      const aiContent = await generateAnswer(fullPrompt, contextItems);
      console.log('✅ AI response result:', aiContent ? 'Success' : 'Failed/Empty');
      console.log('🤖 AI Content preview:', aiContent ? aiContent.substring(0, 100) + '...' : 'NULL/EMPTY');

      return {
        content: aiContent || "I couldn't generate a response at the moment. Please try again.",
        sources: contextItems.slice(0, 3).map(item => ({
          type: item.type,
          id: item.id,
          title: item.title,
          similarity: item.similarity
        }))
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        content: "I encountered an error while processing your request. Please try again.",
        sources: []
      };
    }
  }

  /**
   * Generate a conversation title from the first message
   */
  private generateConversationTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    // Delete messages first (due to foreign key constraint)
    await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    // Delete conversation
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('chat_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) throw error;
  }
}

export { ChatbotService };