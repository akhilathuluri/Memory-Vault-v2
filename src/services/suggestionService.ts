import { generateEmbedding } from './aiService';
import { supabase } from '../lib/supabase';
import { MemorySuggestion, SuggestionContext } from '../types/suggestions';

/**
 * AI-powered memory suggestion service
 * Analyzes user context and suggests relevant memories
 */
export class MemorySuggestionService {
  private static instance: MemorySuggestionService;
  
  static getInstance(): MemorySuggestionService {
    if (!this.instance) {
      this.instance = new MemorySuggestionService();
    }
    return this.instance;
  }

  /**
   * Get contextual memory suggestions based on current activity
   */
  async getContextualSuggestions(context: SuggestionContext): Promise<MemorySuggestion[]> {
    try {
      const suggestions: MemorySuggestion[] = [];
      
      // Get related memories based on current context
      if (context.currentMemory) {
        const relatedSuggestions = await this.getRelatedMemorySuggestions(context.currentMemory);
        suggestions.push(...relatedSuggestions);
      }

      // Get tag-based suggestions
      if (context.relatedTags.length > 0) {
        const tagSuggestions = await this.getTagBasedSuggestions(context.relatedTags);
        suggestions.push(...tagSuggestions);
      }

      // Get time-based suggestions
      const timeSuggestions = await this.getTimeBasedSuggestions(context.timeOfDay, context.dayOfWeek);
      suggestions.push(...timeSuggestions);

      // Remove duplicates and sort by priority
      return this.deduplicateAndSort(suggestions);
    } catch (error) {
      console.error('Error getting contextual suggestions:', error);
      return [];
    }
  }

  /**
   * Get memories related to the current memory using AI embeddings
   */
  private async getRelatedMemorySuggestions(currentMemoryId: string): Promise<MemorySuggestion[]> {
    try {
      // Get current memory
      const { data: currentMemory, error } = await supabase
        .from('memories')
        .select('*')
        .eq('id', currentMemoryId)
        .single();

      if (error || !currentMemory) return [];

      // Generate embedding for current memory content
      const queryEmbedding = await generateEmbedding(currentMemory.content);

      // Find similar memories
      const { data: similarMemories, error: searchError } = await supabase.rpc('search_memories', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.3,
        match_count: 5
      });

      if (searchError || !similarMemories) return [];

      return similarMemories
        .filter((memory: any) => memory.id !== currentMemoryId)
        .map((memory: any) => ({
          id: `related_${memory.id}_${Date.now()}`,
          memory_id: memory.id,
          suggestion_type: 'related' as const,
          title: `Related: ${memory.title}`,
          reason: `Similar to "${currentMemory.title}" (${Math.round(memory.similarity * 100)}% match)`,
          priority: memory.similarity > 0.6 ? 'high' as const : 'medium' as const,
          created_at: new Date().toISOString(),
          dismissed: false,
          acted_upon: false
        }));
    } catch (error) {
      console.error('Error getting related memory suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions based on tags that appear frequently together
   */
  private async getTagBasedSuggestions(tags: string[]): Promise<MemorySuggestion[]> {
    try {
      const suggestions: MemorySuggestion[] = [];

      for (const tag of tags) {
        const { data: tagMemories, error } = await supabase
          .from('memories')
          .select('*')
          .contains('tags', [tag])
          .limit(3);

        if (!error && tagMemories) {
          tagMemories.forEach(memory => {
            suggestions.push({
              id: `tag_${memory.id}_${Date.now()}`,
              memory_id: memory.id,
              suggestion_type: 'contextual',
              title: `Tag match: ${memory.title}`,
              reason: `Contains tag "${tag}" you're currently working with`,
              priority: 'medium',
              created_at: new Date().toISOString(),
              dismissed: false,
              acted_upon: false
            });
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting tag-based suggestions:', error);
      return [];
    }
  }

  /**
   * Get time-based suggestions (memories from same time periods)
   */
  private async getTimeBasedSuggestions(timeOfDay: string, _dayOfWeek: string): Promise<MemorySuggestion[]> {
    try {
      // Get memories created around the same time of day in previous weeks
      const currentHour = new Date().getHours();
      const startHour = Math.max(0, currentHour - 2);
      const endHour = Math.min(23, currentHour + 2);

      const { data: timeMemories, error } = await supabase
        .from('memories')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last week
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !timeMemories) return [];

      return timeMemories
        .filter(memory => {
          const memoryHour = new Date(memory.created_at).getHours();
          return memoryHour >= startHour && memoryHour <= endHour;
        })
        .map(memory => ({
          id: `time_${memory.id}_${Date.now()}`,
          memory_id: memory.id,
          suggestion_type: 'reminder',
          title: `Time reminder: ${memory.title}`,
          reason: `You created this during similar time last week (${timeOfDay})`,
          priority: 'low',
          created_at: new Date().toISOString(),
          dismissed: false,
          acted_upon: false
        }));
    } catch (error) {
      console.error('Error getting time-based suggestions:', error);
      return [];
    }
  }

  /**
   * Remove duplicate suggestions and sort by priority
   */
  private deduplicateAndSort(suggestions: MemorySuggestion[]): MemorySuggestion[] {
    const seen = new Set<string>();
    const unique = suggestions.filter(suggestion => {
      if (seen.has(suggestion.memory_id)) return false;
      seen.add(suggestion.memory_id);
      return true;
    });

    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return unique.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Get current context based on user activity
   */
  getCurrentContext(): SuggestionContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    let timeOfDay: SuggestionContext['timeOfDay'];
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      recentActivity: [], // Could be populated from activity logs
      timeOfDay,
      dayOfWeek,
      relatedTags: [] // Could be populated from recent memory interactions
    };
  }

  /**
   * Mark suggestion as dismissed
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    // In a real implementation, you'd store dismissed suggestions in the database
    console.log(`Suggestion ${suggestionId} dismissed`);
  }

  /**
   * Mark suggestion as acted upon
   */
  async actOnSuggestion(suggestionId: string): Promise<void> {
    // In a real implementation, you'd track this interaction
    console.log(`User acted on suggestion ${suggestionId}`);
  }
}
