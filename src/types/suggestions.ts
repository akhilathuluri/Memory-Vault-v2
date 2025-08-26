export interface MemorySuggestion {
  id: string;
  memory_id: string;
  suggestion_type: 'contextual' | 'related' | 'reminder';
  title: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  dismissed: boolean;
  acted_upon: boolean;
}

export interface SuggestionContext {
  currentMemory?: string;
  recentActivity: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  relatedTags: string[];
}

export interface ReviewSchedule {
  id: string;
  memory_id: string;
  user_id: string;
  next_review_date: string;
  review_interval_days: number;
  review_count: number;
  difficulty_level: 1 | 2 | 3 | 4 | 5; // 1 = easy, 5 = hard
  last_reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewSession {
  id: string;
  user_id: string;
  memories_reviewed: string[];
  session_duration_ms: number;
  correct_recalls: number;
  total_recalls: number;
  started_at: string;
  completed_at: string;
}

export interface SpacedRepetitionSettings {
  initial_interval_days: number;
  easy_multiplier: number;
  good_multiplier: number;
  hard_multiplier: number;
  again_multiplier: number;
  max_interval_days: number;
  daily_review_limit: number;
}
