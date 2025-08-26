import { Memory, SearchResult } from './index';

// Folder system types for organizing memories
export interface MemoryFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  memory_count?: number; // Virtual field for display
}

export interface FolderTreeNode extends MemoryFolder {
  children?: FolderTreeNode[];
  parent_id?: string;
  depth: number;
  isExpanded?: boolean;
}

export interface CreateFolderData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface MoveTo {
  type: 'folder' | 'root';
  folderId?: string;
  folderName?: string;
}

// Extended Memory interface with folder support
export interface MemoryWithFolder extends Memory {
  folder_id?: string;
  folder?: MemoryFolder;
}

// Enhanced search result with folder information
export interface EnhancedSearchResult extends SearchResult {
  folderPath?: string; // Full folder path for display
  folderInfo?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface EnhancedSearchResultsWithFolders {
  aiAnswer: string;
  memories: EnhancedSearchResult[];
  files: SearchResult[];
  totalResults: number;
}
