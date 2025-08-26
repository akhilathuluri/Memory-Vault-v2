import { supabase } from '../lib/supabase';
import { ReviewSchedule, ReviewSession, SpacedRepetitionSettings } from '../types/suggestions';
import { Memory } from '../types';

/**
 * Spaced repetition service for memory reviews
 * Implements an algorithm similar to Anki's SM-2 algorithm
 */
export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService;
  
  // Default spaced repetition settings
  private defaultSettings: SpacedRepetitionSettings = {
    initial_interval_days: 1,
    easy_multiplier: 2.5,
    good_multiplier: 2.0,
    hard_multiplier: 1.3,
    again_multiplier: 0.5,
    max_interval_days: 365,
    daily_review_limit: 20
  };

  static getInstance(): SpacedRepetitionService {
    if (!this.instance) {
      this.instance = new SpacedRepetitionService();
    }
    return this.instance;
  }

  /**
   * Add a memory to the spaced repetition schedule
   */
  async scheduleMemoryForReview(memoryId: string, userId: string): Promise<ReviewSchedule | null> {
    try {
      const reviewSchedule: Omit<ReviewSchedule, 'id' | 'created_at' | 'updated_at'> = {
        memory_id: memoryId,
        user_id: userId,
        next_review_date: new Date(Date.now() + this.defaultSettings.initial_interval_days * 24 * 60 * 60 * 1000).toISOString(),
        review_interval_days: this.defaultSettings.initial_interval_days,
        review_count: 0,
        difficulty_level: 3, // Start with medium difficulty
      };

      const { data, error } = await supabase
        .from('review_schedules')
        .insert([reviewSchedule])
        .select()
        .single();

      if (error) {
        console.error('Error scheduling memory for review:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in scheduleMemoryForReview:', error);
      return null;
    }
  }

  /**
   * Get memories due for review today
   */
  async getMemoriesDueForReview(userId: string, limit?: number): Promise<(Memory & ReviewSchedule)[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const reviewLimit = limit || this.defaultSettings.daily_review_limit;

      const { data, error } = await supabase
        .from('review_schedules')
        .select(`
          *,
          memories (*)
        `)
        .eq('user_id', userId)
        .lte('next_review_date', today)
        .order('next_review_date', { ascending: true })
        .limit(reviewLimit);

      if (error) {
        console.error('Error getting memories due for review:', error);
        return [];
      }

      return data?.map(item => ({
        ...item.memories,
        ...item,
        memories: undefined // Remove nested memories object
      })) || [];
    } catch (error) {
      console.error('Error in getMemoriesDueForReview:', error);
      return [];
    }
  }

  /**
   * Update review schedule based on user performance
   */
  async updateReviewSchedule(
    scheduleId: string, 
    performance: 'again' | 'hard' | 'good' | 'easy',
    settings?: SpacedRepetitionSettings
  ): Promise<ReviewSchedule | null> {
    try {
      const config = settings || this.defaultSettings;
      
      // Get current schedule
      const { data: currentSchedule, error: fetchError } = await supabase
        .from('review_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (fetchError || !currentSchedule) {
        console.error('Error fetching current schedule:', fetchError);
        return null;
      }

      // Calculate new interval based on performance
      const newInterval = this.calculateNextInterval(
        currentSchedule.review_interval_days,
        currentSchedule.difficulty_level,
        performance,
        config
      );

      // Update difficulty level based on performance
      const newDifficulty = this.updateDifficultyLevel(
        currentSchedule.difficulty_level,
        performance
      );

      const nextReviewDate = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000).toISOString();

      const updates = {
        next_review_date: nextReviewDate,
        review_interval_days: newInterval,
        review_count: currentSchedule.review_count + 1,
        difficulty_level: newDifficulty,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('review_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) {
        console.error('Error updating review schedule:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateReviewSchedule:', error);
      return null;
    }
  }

  /**
   * Calculate next review interval using spaced repetition algorithm
   */
  private calculateNextInterval(
    currentInterval: number,
    difficulty: number,
    performance: 'again' | 'hard' | 'good' | 'easy',
    settings: SpacedRepetitionSettings
  ): number {
    let newInterval: number;

    switch (performance) {
      case 'again':
        newInterval = Math.max(1, Math.floor(currentInterval * settings.again_multiplier));
        break;
      case 'hard':
        newInterval = Math.floor(currentInterval * settings.hard_multiplier);
        break;
      case 'good':
        newInterval = Math.floor(currentInterval * settings.good_multiplier);
        break;
      case 'easy':
        newInterval = Math.floor(currentInterval * settings.easy_multiplier);
        break;
      default:
        newInterval = currentInterval;
    }

    // Apply difficulty factor (easier memories get longer intervals)
    const difficultyFactor = 1 + (5 - difficulty) * 0.1; // Range: 0.6 to 1.4
    newInterval = Math.floor(newInterval * difficultyFactor);

    // Ensure interval is within bounds
    return Math.min(settings.max_interval_days, Math.max(1, newInterval));
  }

  /**
   * Update difficulty level based on performance
   */
  private updateDifficultyLevel(
    currentDifficulty: number,
    performance: 'again' | 'hard' | 'good' | 'easy'
  ): 1 | 2 | 3 | 4 | 5 {
    let newDifficulty = currentDifficulty;

    switch (performance) {
      case 'again':
        newDifficulty = Math.min(5, currentDifficulty + 1);
        break;
      case 'hard':
        newDifficulty = Math.min(5, currentDifficulty + 0.5);
        break;
      case 'good':
        // No change for good performance
        break;
      case 'easy':
        newDifficulty = Math.max(1, currentDifficulty - 0.5);
        break;
    }

    return Math.round(newDifficulty) as 1 | 2 | 3 | 4 | 5;
  }

  /**
   * Start a new review session
   */
  async startReviewSession(userId: string): Promise<ReviewSession | null> {
    try {
      const session: Omit<ReviewSession, 'id' | 'completed_at'> = {
        user_id: userId,
        memories_reviewed: [],
        session_duration_ms: 0,
        correct_recalls: 0,
        total_recalls: 0,
        started_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('review_sessions')
        .insert([session])
        .select()
        .single();

      if (error) {
        console.error('Error starting review session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in startReviewSession:', error);
      return null;
    }
  }

  /**
   * Complete a review session
   */
  async completeReviewSession(
    sessionId: string,
    memoriesReviewed: string[],
    correctRecalls: number,
    totalRecalls: number
  ): Promise<ReviewSession | null> {
    try {
      const { data: session, error: fetchError } = await supabase
        .from('review_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      if (fetchError || !session) {
        console.error('Error fetching session:', fetchError);
        return null;
      }

      const startTime = new Date(session.started_at).getTime();
      const duration = Date.now() - startTime;

      const updates = {
        memories_reviewed: memoriesReviewed,
        session_duration_ms: duration,
        correct_recalls: correctRecalls,
        total_recalls: totalRecalls,
        completed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('review_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error completing review session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in completeReviewSession:', error);
      return null;
    }
  }

  /**
   * Get review statistics for a user
   */
  async getReviewStats(userId: string, days: number = 30): Promise<{
    totalReviews: number;
    averageAccuracy: number;
    streakDays: number;
    upcomingReviews: number;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Get session stats
      const { data: sessions, error: sessionError } = await supabase
        .from('review_sessions')
        .select('correct_recalls, total_recalls, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', since)
        .not('completed_at', 'is', null);

      if (sessionError) {
        console.error('Error fetching session stats:', sessionError);
        return { totalReviews: 0, averageAccuracy: 0, streakDays: 0, upcomingReviews: 0 };
      }

      // Calculate stats
      const totalReviews = sessions?.reduce((sum, s) => sum + s.total_recalls, 0) || 0;
      const totalCorrect = sessions?.reduce((sum, s) => sum + s.correct_recalls, 0) || 0;
      const averageAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

      // Get upcoming reviews
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: upcoming } = await supabase
        .from('review_schedules')
        .select('id')
        .eq('user_id', userId)
        .lte('next_review_date', tomorrow);

      const upcomingReviews = upcoming?.length || 0;

      // Calculate streak (simplified - could be more sophisticated)
      const streakDays = this.calculateStreakDays(sessions || []);

      return {
        totalReviews,
        averageAccuracy: Math.round(averageAccuracy),
        streakDays,
        upcomingReviews
      };
    } catch (error) {
      console.error('Error getting review stats:', error);
      return { totalReviews: 0, averageAccuracy: 0, streakDays: 0, upcomingReviews: 0 };
    }
  }

  /**
   * Calculate consecutive days with reviews (simplified implementation)
   */
  private calculateStreakDays(sessions: any[]): number {
    if (!sessions.length) return 0;

    const sessionDates = sessions
      .map(s => new Date(s.completed_at).toDateString())
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let currentDate = new Date();

    for (const sessionDate of sessionDates) {
      const sessionDateTime = new Date(sessionDate);
      const diffDays = Math.floor((currentDate.getTime() - sessionDateTime.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays === streak) {
        streak++;
        currentDate = sessionDateTime;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Remove a memory from spaced repetition schedule
   */
  async removeFromSchedule(memoryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('review_schedules')
        .delete()
        .eq('memory_id', memoryId);

      if (error) {
        console.error('Error removing from schedule:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeFromSchedule:', error);
      return false;
    }
  }
}
