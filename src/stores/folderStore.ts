import { create } from 'zustand';
import { MemoryFolder, CreateFolderData, FolderTreeNode } from '../types/folders';
import { FolderService } from '../services/folderService';

interface FolderStore {
  // State
  folders: MemoryFolder[];
  selectedFolderId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Computed
  folderTree: FolderTreeNode[];
  
  // Actions
  fetchFolders: () => Promise<void>;
  createFolder: (folderData: CreateFolderData) => Promise<MemoryFolder | null>;
  updateFolder: (folderId: string, updates: Partial<CreateFolderData>) => Promise<MemoryFolder | null>;
  deleteFolder: (folderId: string) => Promise<void>;
  setSelectedFolder: (folderId: string | null) => void;
  moveMemoryToFolder: (memoryId: string, folderId: string | null) => Promise<void>;
  getFolderById: (folderId: string) => MemoryFolder | undefined;
  getFolderPath: (folderId: string | null) => string;
  clearError: () => void;
  reset: () => void;
}

const folderService = FolderService.getInstance();

export const useFolderStore = create<FolderStore>((set, get) => ({
  // Initial State
  folders: [],
  selectedFolderId: null,
  isLoading: false,
  error: null,
  
  // Computed
  get folderTree() {
    const { folders } = get();
    return folderService.buildFolderTree(folders);
  },
  
  // Actions
  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const folders = await folderService.getFolders();
      set({ folders, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch folders';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching folders:', error);
    }
  },

  createFolder: async (folderData: CreateFolderData): Promise<MemoryFolder | null> => {
    set({ isLoading: true, error: null });
    try {
      const newFolder = await folderService.createFolder(folderData);
      const { folders } = get();
      set({ 
        folders: [...folders, newFolder], 
        isLoading: false 
      });
      return newFolder;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
      set({ error: errorMessage, isLoading: false });
      console.error('Error creating folder:', error);
      return null;
    }
  },

  updateFolder: async (folderId: string, updates: Partial<CreateFolderData>): Promise<MemoryFolder | null> => {
    set({ isLoading: true, error: null });
    try {
      const updatedFolder = await folderService.updateFolder(folderId, updates);
      const { folders } = get();
      const updatedFolders = folders.map(folder => 
        folder.id === folderId ? updatedFolder : folder
      );
      set({ 
        folders: updatedFolders, 
        isLoading: false 
      });
      return updatedFolder;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update folder';
      set({ error: errorMessage, isLoading: false });
      console.error('Error updating folder:', error);
      return null;
    }
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await folderService.deleteFolder(folderId);
      const { folders, selectedFolderId } = get();
      const updatedFolders = folders.filter(folder => folder.id !== folderId);
      
      // Reset selection if deleted folder was selected
      const newSelectedFolderId = selectedFolderId === folderId ? null : selectedFolderId;
      
      set({ 
        folders: updatedFolders, 
        selectedFolderId: newSelectedFolderId,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete folder';
      set({ error: errorMessage, isLoading: false });
      console.error('Error deleting folder:', error);
      throw error;
    }
  },

  setSelectedFolder: (folderId: string | null) => {
    set({ selectedFolderId: folderId });
  },

  moveMemoryToFolder: async (memoryId: string, folderId: string | null): Promise<void> => {
    try {
      await folderService.moveMemoryToFolder(memoryId, folderId);
      // Refresh folders to update memory counts
      const folders = await folderService.getFolders();
      set({ folders });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move memory';
      set({ error: errorMessage });
      console.error('Error moving memory:', error);
      throw error;
    }
  },

  getFolderById: (folderId: string): MemoryFolder | undefined => {
    const { folders } = get();
    return folders.find(folder => folder.id === folderId);
  },

  getFolderPath: (folderId: string | null): string => {
    if (!folderId) return 'Root';
    const folder = get().getFolderById(folderId);
    return folderService.getFolderPath(folder || null);
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      folders: [],
      selectedFolderId: null,
      isLoading: false,
      error: null
    });
  }
}));

// Helper hooks for specific use cases
export const useFolders = () => {
  const folders = useFolderStore(state => state.folders);
  const isLoading = useFolderStore(state => state.isLoading);
  const error = useFolderStore(state => state.error);
  const fetchFolders = useFolderStore(state => state.fetchFolders);
  
  return { folders, isLoading, error, fetchFolders };
};

export const useSelectedFolder = () => {
  const selectedFolderId = useFolderStore(state => state.selectedFolderId);
  const setSelectedFolder = useFolderStore(state => state.setSelectedFolder);
  const getFolderById = useFolderStore(state => state.getFolderById);
  
  const selectedFolder = selectedFolderId ? getFolderById(selectedFolderId) : null;
  
  return { selectedFolder, selectedFolderId, setSelectedFolder };
};

export const useFolderActions = () => {
  const createFolder = useFolderStore(state => state.createFolder);
  const updateFolder = useFolderStore(state => state.updateFolder);
  const deleteFolder = useFolderStore(state => state.deleteFolder);
  const moveMemoryToFolder = useFolderStore(state => state.moveMemoryToFolder);
  
  return { createFolder, updateFolder, deleteFolder, moveMemoryToFolder };
};

export const useFolderTree = () => {
  const folderTree = useFolderStore(state => state.folderTree);
  const selectedFolderId = useFolderStore(state => state.selectedFolderId);
  const setSelectedFolder = useFolderStore(state => state.setSelectedFolder);
  
  return { folderTree, selectedFolderId, setSelectedFolder };
};
