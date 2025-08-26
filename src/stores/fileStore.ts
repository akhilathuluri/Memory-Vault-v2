import { create } from 'zustand';
import { FileRecord } from '../types';
import { supabase } from '../lib/supabase';
import { generateEmbedding } from '../services/aiService';
import { CacheService } from '../services/cacheService';
import toast from 'react-hot-toast';

export interface FileMetadata {
  name: string;
  description: string;
  tags: string[];
}

interface FileState {
  files: FileRecord[];
  loading: boolean;
  storageUsed: number;
  storageLimit: number;
  fetchFiles: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  uploadFileWithMetadata: (file: File, metadata: FileMetadata) => Promise<void>;
  uploadVoiceRecording: (audioBlob: Blob, transcription: string, language: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  getStorageInfo: () => Promise<void>;
  searchFiles: (query: string) => Promise<FileRecord[]>;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  loading: false,
  storageUsed: 0,
  storageLimit: 100 * 1024 * 1024, // 100MB

  fetchFiles: async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ No user authenticated, skipping files fetch');
      return;
    }

    const cacheService = CacheService.getInstance();
    
    // Try to get cached files first
    const cachedFiles = cacheService.getCachedFiles(user.id);
    if (cachedFiles) {
      set({ files: cachedFiles });
      get().getStorageInfo();
      
      // Check if we should refresh in background
      if (!cacheService.shouldRefreshFiles(user.id)) {
        return; // Use cache, no refresh needed
      } else {
        console.log('🔄 File cache exists but needs refresh, fetching in background...');
      }
    } else {
      console.log('📁 No cached files found, fetching from database...');
      set({ loading: true });
    }

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const files = data || [];
      
      // Update cache
      cacheService.setCachedFiles(user.id, files);
      
      // Update store
      set({ files });
      
      console.log('✅ Fetched and cached', files.length, 'files');
      get().getStorageInfo();
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
      
      // If we have cached data and fetch fails, keep using cache
      if (cachedFiles) {
        console.log('🛡️ Using cached files due to fetch error');
        set({ files: cachedFiles });
      }
    } finally {
      set({ loading: false });
    }
  },

  uploadFileWithMetadata: async (file, metadata) => {
    const { storageUsed, storageLimit } = get();
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    if (storageUsed + file.size > storageLimit) {
      toast.error('Storage limit exceeded');
      return;
    }

    set({ loading: true });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      // Get current user ID for file organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('memory-vault-files')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please contact the administrator to set up file storage.');
        }
        throw uploadError;
      }

      // Generate embedding from metadata
      let embedding: number[] | null = null;
      try {
        const textContent = `${metadata.name} ${metadata.description} ${metadata.tags.join(' ')}`.trim();
        if (textContent) {
          embedding = await generateEmbedding(textContent);
        }
      } catch (embeddingError) {
        console.warn('Failed to generate embedding:', embeddingError);
        // Continue without embedding
      }

      // Determine file type
      let fileType: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) {
        fileType = 'video';
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
      }

      // Save file record to database with metadata
      const { data, error } = await supabase
        .from('files')
        .insert([{
          name: metadata.name || file.name,
          description: metadata.description || null,
          tags: metadata.tags || [],
          file_path: filePath,
          file_type: fileType,
          file_size: file.size,
          embedding: embedding,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update store
      set((state) => ({
        files: [data, ...state.files],
        loading: false,
      }));

      // Update cache
      const cacheService = CacheService.getInstance();
      cacheService.addFileToCache(user.id, data);

      toast.success('File uploaded successfully');
      get().getStorageInfo();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
      set({ loading: false });
    }
  },

  uploadFile: async (file) => {
    const { storageUsed, storageLimit } = get();
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    if (storageUsed + file.size > storageLimit) {
      toast.error('Storage limit exceeded');
      return;
    }

    set({ loading: true });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      // Get current user ID for file organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('memory-vault-files')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, provide helpful error message
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please contact the administrator to set up file storage.');
        }
        throw uploadError;
      }

      // Save file record to database
      const { data, error } = await supabase
        .from('files')
        .insert([{
          name: file.name,
          file_path: filePath,
          file_type: file.type.startsWith('image/') ? 'image' : 'video',
          file_size: file.size,
          user_id: user.id, // Add the user_id field
        }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        files: [data, ...state.files],
        loading: false,
      }));

      toast.success('File uploaded successfully');
      get().getStorageInfo();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
      set({ loading: false });
    }
  },

  uploadVoiceRecording: async (audioBlob, transcription, language) => {
    const { storageUsed, storageLimit } = get();
    
    if (audioBlob.size > 10 * 1024 * 1024) {
      toast.error('Audio file size must be less than 10MB');
      return;
    }

    if (storageUsed + audioBlob.size > storageLimit) {
      toast.error('Storage limit exceeded');
      return;
    }

    set({ loading: true });
    try {
      const timestamp = Date.now();
      
      // Determine file extension and MIME type based on the blob type
      let fileExtension = 'mp3'; // Default to mp3 for better compatibility
      let mimeType = 'audio/mpeg';
      
      if (audioBlob.type.includes('webm')) {
        fileExtension = 'webm';
        mimeType = 'audio/webm';
      } else if (audioBlob.type.includes('mp4')) {
        fileExtension = 'm4a';
        mimeType = 'audio/mp4';
      } else if (audioBlob.type.includes('wav')) {
        fileExtension = 'wav';
        mimeType = 'audio/wav';
      }
      
      const fileName = `voice-memo-${timestamp}.${fileExtension}`;
      
      // Get current user ID for file organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const filePath = `${user.id}/${fileName}`;

      // Convert blob to file with proper MIME type
      const audioFile = new File([audioBlob], fileName, { type: mimeType });

      // Upload audio file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('memory-vault-files')
        .upload(filePath, audioFile, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please contact the administrator to set up file storage.');
        }
        if (uploadError.message.includes('mime type') || uploadError.message.includes('not supported')) {
          // Try uploading as binary data with generic audio type
          const { error: retryError } = await supabase.storage
            .from('memory-vault-files')
            .upload(filePath, audioFile, {
              contentType: 'audio/mpeg', // Use generic audio type
              upsert: false
            });
          if (retryError) {
            throw new Error(`Upload failed: ${retryError.message}`);
          }
        } else {
          throw uploadError;
        }
      }

      // Generate embedding from transcription
      let embedding: number[] | null = null;
      try {
        if (transcription.trim()) {
          embedding = await generateEmbedding(transcription);
        }
      } catch (embeddingError) {
        console.warn('Failed to generate embedding:', embeddingError);
        // Continue without embedding
      }

      // Create tags based on language and content type
      const tags = ['voice-memo', language];
      if (transcription.length > 100) {
        tags.push('long-recording');
      }

      // Save file record to database
      const { data, error } = await supabase
        .from('files')
        .insert([{
          name: `Voice Memo - ${new Date().toLocaleDateString()}`,
          description: transcription.trim() || 'Voice recording without transcription',
          tags: tags,
          file_path: filePath,
          file_type: 'audio',
          file_size: audioBlob.size,
          embedding: embedding,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        files: [data, ...state.files],
        loading: false,
      }));

      toast.success('Voice recording saved successfully');
      get().getStorageInfo();
    } catch (error) {
      console.error('Error uploading voice recording:', error);
      toast.error('Failed to save voice recording. Please try again.');
      set({ loading: false });
    }
  },

  deleteFile: async (id) => {
    try {
      const file = get().files.find(f => f.id === id);
      if (!file) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('memory-vault-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update store
      set((state) => ({
        files: state.files.filter((f) => f.id !== id),
      }));

      // Update cache
      const cacheService = CacheService.getInstance();
      cacheService.removeFileFromCache(user.id, id);

      toast.success('File deleted successfully');
      get().getStorageInfo();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  },

  getStorageInfo: async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('file_size');

      if (error) throw error;

      const totalSize = data.reduce((sum, file) => sum + file.file_size, 0);
      set({ storageUsed: totalSize });
    } catch (error) {
      console.error('Error getting storage info:', error);
    }
  },

  searchFiles: async (query: string): Promise<FileRecord[]> => {
    if (!query.trim()) return [];

    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);
      
      // Use the search_files function with a lower threshold for better recall
      const { data, error } = await supabase.rpc('search_files', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.3, // Lower threshold for better results
        match_count: 10
      });

      if (error) {
        console.error('Error searching files:', error);
        // Fallback to basic text search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('files')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
          .limit(10);
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }

      return data || [];
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  },
}));