import { supabase } from '../lib/supabase';
import { MemoryFolder, CreateFolderData, FolderTreeNode } from '../types/folders';
import toast from 'react-hot-toast';

/**
 * Service for managing memory folders
 * Provides CRUD operations and folder hierarchy management
 */
export class FolderService {
  private static instance: FolderService;

  static getInstance(): FolderService {
    if (!this.instance) {
      this.instance = new FolderService();
    }
    return this.instance;
  }

  /**
   * Get all folders for the current user
   */
  async getFolders(): Promise<MemoryFolder[]> {
    try {
      const { data, error } = await supabase
        .from('memory_folders')
        .select(`
          *,
          memories!memories_folder_id_fkey(count)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(folder => ({
        ...folder,
        memory_count: folder.memories?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('Error fetching folders:', error);
      throw new Error('Failed to fetch folders');
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(folderData: CreateFolderData): Promise<MemoryFolder> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('memory_folders')
        .insert([{
          ...folderData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Folder created successfully');
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
      throw error;
    }
  }

  /**
   * Update an existing folder
   */
  async updateFolder(folderId: string, updates: Partial<CreateFolderData>): Promise<MemoryFolder> {
    try {
      const { data, error } = await supabase
        .from('memory_folders')
        .update(updates)
        .eq('id', folderId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Folder updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
      throw error;
    }
  }

  /**
   * Delete a folder (moves memories to root)
   */
  async deleteFolder(folderId: string): Promise<void> {
    try {
      // First, move all memories in this folder to root (null folder_id)
      const { error: moveError } = await supabase
        .from('memories')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      if (moveError) throw moveError;

      // Then delete the folder
      const { error: deleteError } = await supabase
        .from('memory_folders')
        .delete()
        .eq('id', folderId);

      if (deleteError) throw deleteError;

      toast.success('Folder deleted and memories moved to root');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
      throw error;
    }
  }

  /**
   * Move a memory to a folder (or root)
   */
  async moveMemoryToFolder(memoryId: string, folderId: string | null): Promise<void> {
    try {
      const { error } = await supabase
        .from('memories')
        .update({ folder_id: folderId })
        .eq('id', memoryId);

      if (error) throw error;

      const folderName = folderId ? 'folder' : 'root';
      toast.success(`Memory moved to ${folderName}`);
    } catch (error) {
      console.error('Error moving memory:', error);
      toast.error('Failed to move memory');
      throw error;
    }
  }

  /**
   * Get memories by folder ID
   */
  async getMemoriesByFolder(folderId: string | null): Promise<any[]> {
    try {
      const query = supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (folderId) {
        query.eq('folder_id', folderId);
      } else {
        query.is('folder_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching memories by folder:', error);
      throw new Error('Failed to fetch memories');
    }
  }

  /**
   * Build folder tree structure (for future hierarchical folders)
   */
  buildFolderTree(folders: MemoryFolder[]): FolderTreeNode[] {
    // For now, flat structure - can be extended for hierarchical folders
    return folders.map(folder => ({
      ...folder,
      depth: 0,
      children: [],
      isExpanded: true
    }));
  }

  /**
   * Get folder by ID
   */
  async getFolderById(folderId: string): Promise<MemoryFolder | null> {
    try {
      const { data, error } = await supabase
        .from('memory_folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching folder:', error);
      return null;
    }
  }

  /**
   * Get folder path for display (useful for search results)
   */
  getFolderPath(folder: MemoryFolder | null): string {
    if (!folder) return 'Root';
    return folder.name;
  }

  /**
   * Search memories with folder information
   */
  async searchMemoriesWithFolders(searchResults: any[]): Promise<any[]> {
    try {
      const memoryIds = searchResults
        .filter(result => result.type === 'memory')
        .map(result => result.data.id);

      if (memoryIds.length === 0) return searchResults;

      // Get folder information for memories
      const { data: memoriesWithFolders, error } = await supabase
        .from('memories')
        .select(`
          id,
          folder_id,
          memory_folders!memories_folder_id_fkey (
            id,
            name,
            color
          )
        `)
        .in('id', memoryIds);

      if (error) {
        console.warn('Failed to fetch folder info for search results:', error);
        return searchResults;
      }

      // Enhance search results with folder information
      return searchResults.map(result => {
        if (result.type === 'memory') {
          const memoryFolder = memoriesWithFolders?.find(m => m.id === result.data.id);
          const folderData = memoryFolder?.memory_folders as any;
          
          if (folderData && typeof folderData === 'object' && !Array.isArray(folderData)) {
            return {
              ...result,
              folderPath: folderData.name || 'Unknown Folder',
              folderInfo: {
                id: folderData.id,
                name: folderData.name,
                color: folderData.color
              }
            };
          } else {
            return {
              ...result,
              folderPath: 'Root',
              folderInfo: null
            };
          }
        }
        return result;
      });
    } catch (error) {
      console.error('Error enhancing search results with folders:', error);
      return searchResults;
    }
  }

  /**
   * Get default folder colors
   */
  getDefaultColors(): string[] {
    return [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280'  // Gray
    ];
  }

  /**
   * Get default folder icons
   */
  getDefaultIcons(): string[] {
    return [
      'folder',
      'book-open',
      'briefcase',
      'heart',
      'star',
      'target',
      'lightbulb',
      'calendar',
      'camera',
      'music'
    ];
  }
}
