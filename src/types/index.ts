export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder_id?: string; // Optional folder reference
  embedding?: number[];
  created_at: string;
  updated_at: string;
  user_id: string;
  expires_at?: string; // Auto-deletion timestamp
  auto_delete_enabled?: boolean; // Whether auto-deletion is enabled
}

export interface FileRecord {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  file_path: string;
  file_type: 'image' | 'video' | 'audio';
  file_size: number;
  embedding?: number[];
  created_at: string;
  user_id: string;
}

export interface SearchResult {
  type: 'memory' | 'file';
  data: Memory | FileRecord;
  similarity?: number;
}

export interface EnhancedSearchResults {
  aiAnswer: string;
  memories: SearchResult[];
  files: SearchResult[];
  totalResults: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  resource_type: 'memory' | 'file' | 'search';
  resource_id?: string;
  created_at: string;
  user_id: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  ai_provider: 'github' | 'openrouter';
  selected_model: string; // For embeddings
  answer_model?: string; // For AI answer generation
  api_key_mode: 'user' | 'webapp'; // New field for key source
  github_api_key?: string;
  openrouter_api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'github' | 'openrouter';
  type: 'embedding' | 'chat' | 'both'; // Model capability
  description?: string;
}

// Export suggestion types
export * from './suggestions';

// Export folder types
export * from './folders';

// Export knowledge graph types
export * from './knowledgeGraph';

// Export chatbot types
export * from './chatbot';

// Export notification types
export * from './notifications';

// Export security types
export * from './security';