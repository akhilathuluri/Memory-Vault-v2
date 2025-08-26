import { create } from 'zustand';
import { MemorySuggestion, ReviewSchedule, ReviewSession } from '../types/suggestions';
import { Memory } from '../types';
import { MemorySuggestionService } from '../services/suggestionService';
import { SpacedRepetitionService } from '../services/spacedRepetitionService';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface SuggestionReviewState {
  // Suggestions
  suggestions: MemorySuggestion[];
  suggestionsLoading: boolean;
  
  // Spaced Repetition
  reviewQueue: (Memory & ReviewSchedule)[];
  reviewsLoading: boolean;
  currentReviewSession: ReviewSession | null;
  reviewStats: {
    totalReviews: number;
    averageAccuracy: number;
    streakDays: number;
    upcomingReviews: number;
  };

  // Actions
  loadSuggestions: () => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
  actOnSuggestion: (suggestionId: string) => Promise<void>;
  
  loadReviewQueue: () => Promise<void>;
  scheduleMemoryForReview: (memoryId: string) => Promise<void>;
  startReviewSession: () => Promise<void>;
  reviewMemory: (scheduleId: string, performance: 'again' | 'hard' | 'good' | 'easy') => Promise<void>;
  completeReviewSession: () => Promise<void>;
  loadReviewStats: () => Promise<void>;
}

export const useSuggestionReviewStore = create<SuggestionReviewState>((set, get) => ({
  // Initial state
  suggestions: [],
  suggestionsLoading: false,
  reviewQueue: [],
  reviewsLoading: false,
  currentReviewSession: null,
  reviewStats: {
    totalReviews: 0,
    averageAccuracy: 0,
    streakDays: 0,
    upcomingReviews: 0
  },

  // Load contextual suggestions
  loadSuggestions: async () => {
    set({ suggestionsLoading: true });
    try {
      const suggestionService = MemorySuggestionService.getInstance();
      const context = suggestionService.getCurrentContext();
      const suggestions = await suggestionService.getContextualSuggestions(context);
      
      set({ suggestions, suggestionsLoading: false });
    } catch (error) {
      console.error('Error loading suggestions:', error);
      set({ suggestionsLoading: false });
    }
  },

  // Dismiss a suggestion
  dismissSuggestion: async (suggestionId: string) => {
    try {
      const suggestionService = MemorySuggestionService.getInstance();
      await suggestionService.dismissSuggestion(suggestionId);
      
      set(state => ({
        suggestions: state.suggestions.filter(s => s.id !== suggestionId)
      }));
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      toast.error('Failed to dismiss suggestion');
    }
  },

  // Act on a suggestion
  actOnSuggestion: async (suggestionId: string) => {
    try {
      const suggestionService = MemorySuggestionService.getInstance();
      await suggestionService.actOnSuggestion(suggestionId);
      
      set(state => ({
        suggestions: state.suggestions.map(s => 
          s.id === suggestionId ? { ...s, acted_upon: true } : s
        )
      }));
    } catch (error) {
      console.error('Error acting on suggestion:', error);
      toast.error('Failed to process suggestion');
    }
  },

  // Load memories due for review
  loadReviewQueue: async () => {
    set({ reviewsLoading: true });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const spacedRepetitionService = SpacedRepetitionService.getInstance();
      const reviewQueue = await spacedRepetitionService.getMemoriesDueForReview(user.id);
      
      set({ reviewQueue, reviewsLoading: false });
    } catch (error) {
      console.error('Error loading review queue:', error);
      set({ reviewsLoading: false });
      toast.error('Failed to load review queue');
    }
  },

  // Schedule a memory for spaced repetition
  scheduleMemoryForReview: async (memoryId: string) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const spacedRepetitionService = SpacedRepetitionService.getInstance();
      const schedule = await spacedRepetitionService.scheduleMemoryForReview(memoryId, user.id);
      
      if (schedule) {
        toast.success('Memory added to review schedule');
        // Reload review stats to update upcoming count
        get().loadReviewStats();
      } else {
        toast.error('Failed to schedule memory for review');
      }
    } catch (error) {
      console.error('Error scheduling memory for review:', error);
      toast.error('Failed to schedule memory for review');
    }
  },

  // Start a new review session
  startReviewSession: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const spacedRepetitionService = SpacedRepetitionService.getInstance();
      const session = await spacedRepetitionService.startReviewSession(user.id);
      
      if (session) {
        set({ currentReviewSession: session });
        toast.success('Review session started');
      } else {
        toast.error('Failed to start review session');
      }
    } catch (error) {
      console.error('Error starting review session:', error);
      toast.error('Failed to start review session');
    }
  },

  // Review a memory with performance rating
  reviewMemory: async (scheduleId: string, performance: 'again' | 'hard' | 'good' | 'easy') => {
    try {
      const spacedRepetitionService = SpacedRepetitionService.getInstance();
      const updatedSchedule = await spacedRepetitionService.updateReviewSchedule(scheduleId, performance);
      
      if (updatedSchedule) {
        // Remove from current review queue
        set(state => ({
          reviewQueue: state.reviewQueue.filter(item => item.id !== scheduleId)
        }));

        // Update current session if active
        const { currentReviewSession } = get();
        if (currentReviewSession) {
          const isCorrect = performance === 'good' || performance === 'easy';
          set(state => ({
            currentReviewSession: state.currentReviewSession ? {
              ...state.currentReviewSession,
              memories_reviewed: [...state.currentReviewSession.memories_reviewed, updatedSchedule.memory_id],
              total_recalls: state.currentReviewSession.total_recalls + 1,
              correct_recalls: state.currentReviewSession.correct_recalls + (isCorrect ? 1 : 0)
            } : null
          }));
        }

        toast.success('Memory reviewed successfully');
      } else {
        toast.error('Failed to update review schedule');
      }
    } catch (error) {
      console.error('Error reviewing memory:', error);
      toast.error('Failed to review memory');
    }
  },

  // Complete the current review session
  completeReviewSession: async () => {
    try {
      const { currentReviewSession } = get();
      if (!currentReviewSession) return;

      const spacedRepetitionService = SpacedRepetitionService.getInstance();
      const completedSession = await spacedRepetitionService.completeReviewSession(
        currentReviewSession.id,
        currentReviewSession.memories_reviewed,
        currentReviewSession.correct_recalls,
        currentReviewSession.total_recalls
      );

      if (completedSession) {
        set({ currentReviewSession: null });
        toast.success(`Review session completed! ${currentReviewSession.correct_recalls}/${currentReviewSession.total_recalls} correct`);
        
        // Reload stats and queue
        get().loadReviewStats();
        get().loadReviewQueue();
      } else {
        toast.error('Failed to complete review session');
      }
    } catch (error) {
      console.error('Error completing review session:', error);
      toast.error('Failed to complete review session');
    }
  },

  // Load review statistics
  loadReviewStats: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return;

      const spacedRepetitionService = SpacedRepetitionService.getInstance();
      const stats = await spacedRepetitionService.getReviewStats(user.id);
      
      set({ reviewStats: stats });
    } catch (error) {
      console.error('Error loading review stats:', error);
    }
  }
}));
