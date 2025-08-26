export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  sources?: {
    type: 'memory' | 'file';
    id: string;
    title: string;
    similarity?: number;
  }[];
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ChatbotState {
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  loading: boolean;
  error: string | null;
}