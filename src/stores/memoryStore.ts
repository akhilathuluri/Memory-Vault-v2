import { create } from 'zustand';
import { Memory, SearchResult, EnhancedSearchResults } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';
import { generateEmbedding, generateAnswer } from '../services/aiService';
import { FolderService } from '../services/folderService';
import { CacheService } from '../services/cacheService';
import { MemoryExpirationService } from '../services/memoryExpirationService';
import toast from 'react-hot-toast';

interface MemoryState {
  memories: Memory[];
  loading: boolean;
  searchResults: SearchResult[];
  enhancedSearchResults: EnhancedSearchResults | null;
  fetchMemories: () => Promise<void>;
  addMemory: (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<void>;
  updateMemory: (id: string, memory: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (query: string) => Promise<void>;
  enhancedSearch: (query: string) => Promise<void>;
  startExpirationService: () => void;
  stopExpirationService: () => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  loading: false,
  searchResults: [],
  enhancedSearchResults: null,

  fetchMemories: async () => {
    // Get current user
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('⚠️ No user authenticated, skipping memory fetch');
      return;
    }

    const cacheService = CacheService.getInstance();

    // Try to get cached memories first
    const cachedMemories = cacheService.getCachedMemories(user.id);
    if (cachedMemories) {
      set({ memories: cachedMemories });

      // Check if we should refresh in background
      if (!cacheService.shouldRefreshMemories(user.id)) {
        return; // Use cache, no refresh needed
      } else {
        console.log('🔄 Cache exists but needs refresh, fetching in background...');
      }
    } else {
      console.log('📋 No cached memories found, fetching from database...');
      set({ loading: true });
    }

    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const memories = data || [];

      // Update cache
      cacheService.setCachedMemories(user.id, memories);

      // Update store
      set({ memories });

      console.log('✅ Fetched and cached', memories.length, 'memories');
    } catch (error) {
      console.error('Error fetching memories:', error);
      toast.error('Failed to fetch memories');

      // If we have cached data and fetch fails, keep using cache
      if (cachedMemories) {
        console.log('🛡️ Using cached memories due to fetch error');
        set({ memories: cachedMemories });
      }
    } finally {
      set({ loading: false });
    }
  },

  addMemory: async (memory) => {
    set({ loading: true });
    try {
      // Get the current user
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Try to generate embedding, but don't fail if it doesn't work
      let embedding = null;
      try {
        const { settings } = useSettingsStore.getState();
        const webappKeys = useSettingsStore.getState().canUseWebappKeys();
        const canUseAI = settings && (
          settings.api_key_mode === 'webapp' ?
            webappKeys.github || webappKeys.openrouter :
            !!(settings.github_api_key || settings.openrouter_api_key)
        );

        if (canUseAI) {
          embedding = await generateEmbedding(memory.content);
          console.log('✅ Generated embedding for memory');
        } else {
          console.log('⚠️ No AI available, storing memory without embedding');
        }
      } catch (embeddingError) {
        console.warn('⚠️ Failed to generate embedding, storing without:', embeddingError);
      }

      // Extract location data if present
      const { location, ...memoryData } = memory;

      const { data, error } = await supabase
        .from('memories')
        .insert([{ ...memoryData, embedding, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      // Save location data if provided
      if (location) {
        try {
          const { error: locationError } = await supabase
            .from('memory_locations')
            .insert([{
              memory_id: data.id,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              address: location.address,
              city: location.city,
              country: location.country,
              recorded_at: location.timestamp
            }]);

          if (locationError) {
            console.warn('Failed to save location data:', locationError);
          } else {
            console.log('✅ Location data saved for memory');
          }
        } catch (locationError) {
          console.warn('Failed to save location data:', locationError);
        }
      }

      // Update store
      set((state) => ({
        memories: [data, ...state.memories],
        loading: false,
      }));

      // Update cache
      const cacheService = CacheService.getInstance();
      cacheService.addMemoryToCache(user.id, data);

      toast.success('Memory saved successfully');
    } catch (error) {
      console.error('Error adding memory:', error);
      toast.error('Failed to save memory');
      set({ loading: false });
    }
  },

  updateMemory: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('memories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update store
      set((state) => ({
        memories: state.memories.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }));

      // Update cache
      const { user } = useAuthStore.getState();
      if (user) {
        const cacheService = CacheService.getInstance();
        cacheService.updateMemoryInCache(user.id, id, updates);
      }

      toast.success('Memory updated successfully');
    } catch (error) {
      console.error('Error updating memory:', error);
      toast.error('Failed to update memory');
    }
  },

  deleteMemory: async (id) => {
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update store
      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
      }));

      // Update cache
      const { user } = useAuthStore.getState();
      if (user) {
        const cacheService = CacheService.getInstance();
        cacheService.removeMemoryFromCache(user.id, id);
      }

      toast.success('Memory deleted successfully');
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
    }
  },

  searchMemories: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // Use lower similarity threshold for better recall
      const { data, error } = await supabase.rpc('search_memories', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.3, // Lower threshold for better results
        match_count: 10
      });

      if (error) throw error;

      const searchResults: SearchResult[] = data.map((item: any) => ({
        type: 'memory' as const,
        data: item,
        similarity: item.similarity,
      }));

      // Enhance search results with folder information
      const folderService = FolderService.getInstance();
      const enhancedResults = await folderService.searchMemoriesWithFolders(searchResults);

      set({ searchResults: enhancedResults });
    } catch (error) {
      console.error('Error searching memories:', error);
      toast.error(error instanceof Error ? error.message : 'Search failed');
    }
  },

  enhancedSearch: async (query) => {
    if (!query.trim()) {
      set({ enhancedSearchResults: null });
      return;
    }

    console.log('🔍 Starting enhanced search for:', query);

    try {
      let memoryResults: SearchResult[] = [];
      let fileResults: SearchResult[] = [];
      let aiAnswer = '';

      // Check if AI is available
      const { settings } = useSettingsStore.getState();
      console.log('⚙️ Settings:', settings);

      const webappKeys = useSettingsStore.getState().canUseWebappKeys();
      console.log('🔑 Webapp keys available:', webappKeys);

      const canUseAI = settings && (
        settings.api_key_mode === 'webapp' ?
          webappKeys.github || webappKeys.openrouter :
          !!(settings.github_api_key || settings.openrouter_api_key)
      );

      console.log('🤖 Can use AI:', canUseAI);

      if (canUseAI) {
        // AI-powered embedding search (PRIORITY)
        try {
          console.log('🧠 Attempting AI embedding search...');
          const queryEmbedding = await generateEmbedding(query);
          console.log('✅ Generated query embedding');

          // Search memories using embeddings
          const { data: vectorResults, error: vectorError } = await supabase.rpc('search_memories', {
            query_embedding: queryEmbedding,
            similarity_threshold: 0.1, // Very low threshold for better recall
            match_count: 20
          });

          console.log('🧠 Embedding memory search results:', vectorResults, 'Error:', vectorError);

          if (!vectorError && vectorResults && vectorResults.length > 0) {
            memoryResults = vectorResults.map((item: any) => ({
              type: 'memory' as const,
              data: item,
              similarity: item.similarity,
            }));
            console.log('✅ Found memories via embedding search:', memoryResults.length);
          }

          // Search files using embeddings
          const { data: fileEmbeddingResults, error: fileEmbeddingError } = await supabase.rpc('search_files', {
            query_embedding: queryEmbedding,
            similarity_threshold: 0.1, // Very low threshold for better recall
            match_count: 20
          });

          console.log('🧠 Embedding file search results:', fileEmbeddingResults, 'Error:', fileEmbeddingError);

          if (!fileEmbeddingError && fileEmbeddingResults && fileEmbeddingResults.length > 0) {
            fileResults = fileEmbeddingResults.map((file: any) => ({
              type: 'file' as const,
              data: file,
              similarity: file.similarity,
            }));
            console.log('✅ Found files via embedding search:', fileResults.length);
          }

        } catch (embeddingError) {
          console.warn('⚠️ Embedding search failed:', embeddingError);
        }
      }

      // Fallback to text search ONLY if embedding search failed or returned no results
      if (memoryResults.length === 0) {
        console.log('📝 Falling back to text search for memories...');

        // First, let's see what memories exist in the database
        const { data: allMemories, error: allMemoriesError } = await supabase
          .from('memories')
          .select('*')
          .limit(5);

        console.log('📊 Sample memories in database:', allMemories, 'Error:', allMemoriesError);

        // Try different search approaches
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
        console.log('🔍 Search terms extracted:', searchTerms);

        let keywordResults: any[] = [];

        // Try exact phrase search first
        const { data: exactResults, error: exactError } = await supabase
          .from('memories')
          .select('*')
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(20);

        console.log('🎯 Exact phrase search results:', exactResults, 'Error:', exactError);

        if (!exactError && exactResults && exactResults.length > 0) {
          keywordResults = exactResults;
        } else {
          // Try individual terms search
          const searchQueries = searchTerms.map(term =>
            `title.ilike.%${term}%,content.ilike.%${term}%`
          ).join(',');

          if (searchQueries) {
            const { data: termResults, error: termError } = await supabase
              .from('memories')
              .select('*')
              .or(searchQueries)
              .limit(20);

            console.log('🔤 Individual terms search results:', termResults, 'Error:', termError);

            if (!termError && termResults) {
              keywordResults = termResults;
            }
          }
        }

        if (keywordResults && keywordResults.length > 0) {
          memoryResults = keywordResults.map((memory: any) => ({
            type: 'memory' as const,
            data: memory,
            similarity: 0.4, // Lower score for text search fallback
          }));
          console.log('✅ Found memories via text search fallback:', memoryResults.length);
        } else {
          console.log('❌ No memories found via text search');
        }
      }

      // Fallback file search ONLY if embedding search failed
      if (fileResults.length === 0) {
        console.log('📁 Falling back to text search for files...');
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

        // Try searching file names, descriptions, and tags
        const fileSearchQueries = searchTerms.map(term =>
          `name.ilike.%${term}%,description.ilike.%${term}%`
        ).join(',');

        if (fileSearchQueries) {
          const { data: basicFileResults, error: basicFileError } = await supabase
            .from('files')
            .select('*')
            .or(fileSearchQueries)
            .limit(10);

          console.log('📁 File text search results:', basicFileResults, 'Error:', basicFileError);

          if (!basicFileError && basicFileResults && basicFileResults.length > 0) {
            fileResults = basicFileResults.map((file: any) => ({
              type: 'file' as const,
              data: file,
              similarity: 0.4, // Lower score for text search fallback
            }));
            console.log('✅ Found files via text search fallback:', fileResults.length);
          }
        }
      }

      // Generate AI answer if we have results and AI is available
      if (canUseAI && (memoryResults.length > 0 || fileResults.length > 0)) {
        console.log('🤖 Attempting AI answer generation...');
        try {
          const topMemories = memoryResults.slice(0, 3).map(r => r.data);
          const topFiles = fileResults.slice(0, 2).map(r => r.data);

          const contextItems: any[] = [...topMemories];
          topFiles.forEach((file: any) => {
            const fileInfo = `File: ${file.name}${file.description ? ` - ${file.description}` : ''}${file.tags?.length ? ` (Tags: ${file.tags.join(', ')})` : ''}`;
            contextItems.push({
              id: file.id,
              title: `File: ${file.name}`,
              content: fileInfo,
              tags: file.tags || [],
              created_at: file.created_at,
              updated_at: file.created_at,
              user_id: file.user_id
            });
          });

          if (contextItems.length > 0) {
            console.log('🤖 Generating AI answer with context items:', contextItems.length);

            // Build context from memories and files
            const context = contextItems.map(item =>
              `Title: ${item.title}\nContent: ${item.content}\nTags: ${item.tags?.join(', ') || 'None'}`
            ).join('\n\n---\n\n');

            const prompt = `Based on the following memories and files, provide a helpful and accurate answer to the question: "${query}"

Context from user's data:
${context}

Please provide a concise, helpful answer based on the information above. If the memories don't contain enough information to answer the question, say so politely.`;

            aiAnswer = await generateAnswer(prompt, contextItems);
            console.log('✅ AI answer generated:', aiAnswer ? 'Yes' : 'No');
          }

        } catch (aiError) {
          console.warn('⚠️ AI answer generation failed:', aiError);
        }
      }

      // Sort results by relevance (embedding similarity is already good)
      const scoredMemoryResults = memoryResults.map(item => {
        const data = item.data as any;
        return {
          ...item,
          finalScore: (item.similarity || 0.4) +
            (data.title?.toLowerCase().includes(query.toLowerCase()) ? 0.1 : 0) +
            (data.content?.toLowerCase().includes(query.toLowerCase()) ? 0.05 : 0)
        };
      }).sort((a, b) => b.finalScore - a.finalScore);

      const enhancedResults: EnhancedSearchResults = {
        aiAnswer,
        memories: scoredMemoryResults.slice(0, 10),
        files: fileResults.slice(0, 10),
        totalResults: scoredMemoryResults.length + fileResults.length
      };

      console.log('🎯 Final results:', {
        aiAnswer: !!aiAnswer,
        memories: enhancedResults.memories.length,
        files: enhancedResults.files.length,
        total: enhancedResults.totalResults
      });

      set({
        enhancedSearchResults: enhancedResults,
        searchResults: scoredMemoryResults
      });

    } catch (error) {
      console.error('❌ Error in enhanced search:', error);
      toast.error(error instanceof Error ? error.message : 'Search failed');
    }
  },

  startExpirationService: () => {
    const expirationService = MemoryExpirationService.getInstance();
    
    // Set up callback to refresh memories when expired ones are deleted
    expirationService.setOnMemoriesDeletedCallback((count) => {
      console.log(`🔄 Refreshing memories after ${count} expired memories were deleted`);
      // Refresh the memory list
      useMemoryStore.getState().fetchMemories();
    });
    
    expirationService.startAutomaticCleanup();
  },

  stopExpirationService: () => {
    const expirationService = MemoryExpirationService.getInstance();
    expirationService.stopAutomaticCleanup();
  },
}));