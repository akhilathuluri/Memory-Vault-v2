import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Target,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { useSuggestionReviewStore } from '../../stores/suggestionReviewStore';
import { Memory } from '../../types';
import { ReviewSchedule } from '../../types/suggestions';

export const SpacedRepetitionPanel: React.FC = () => {
  const {
    reviewQueue,
    reviewsLoading,
    currentReviewSession,
    reviewStats,
    loadReviewQueue,
    startReviewSession,
    reviewMemory,
    completeReviewSession,
    loadReviewStats
  } = useSuggestionReviewStore();

  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    loadReviewQueue();
    loadReviewStats();
  }, [loadReviewQueue, loadReviewStats]);

  const handleStartReview = async () => {
    await startReviewSession();
    setCurrentReviewIndex(0);
    setShowAnswer(false);
  };

  const handleReviewResponse = async (performance: 'again' | 'hard' | 'good' | 'easy') => {
    const currentItem = reviewQueue[currentReviewIndex];
    if (!currentItem) return;

    await reviewMemory(currentItem.id, performance);
    
    if (currentReviewIndex < reviewQueue.length - 1) {
      setCurrentReviewIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      await completeReviewSession();
      setCurrentReviewIndex(0);
      setShowAnswer(false);
    }
  };

  const currentReviewItem = reviewQueue[currentReviewIndex] as (Memory & ReviewSchedule) | undefined;

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-600';
    if (difficulty <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
    return labels[difficulty] || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card-strong rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-slate-600">Total Reviews</span>
          </div>
          <p className="text-2xl font-bold gradient-text">{reviewStats.totalReviews}</p>
        </div>

        <div className="glass-card-strong rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-600">Accuracy</span>
          </div>
          <p className="text-2xl font-bold gradient-text">{reviewStats.averageAccuracy}%</p>
        </div>

        <div className="glass-card-strong rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-slate-600">Streak</span>
          </div>
          <p className="text-2xl font-bold gradient-text">{reviewStats.streakDays} days</p>
        </div>

        <div className="glass-card-strong rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-slate-600">Due Soon</span>
          </div>
          <p className="text-2xl font-bold gradient-text">{reviewStats.upcomingReviews}</p>
        </div>
      </div>

      {/* Review Interface */}
      <div className="glass-card hover-glow rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
              <Brain className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl heading-lg gradient-text">
              Spaced Repetition Review
            </h3>
          </div>
          
          {reviewQueue.length > 0 && !currentReviewSession && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartReview}
              className="glass-button px-4 py-2 rounded-xl font-semibold hover-glow transition-colors flex items-center space-x-2"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Start Review</span>
            </motion.button>
          )}

          {currentReviewSession && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={completeReviewSession}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <StopCircle className="w-4 h-4" />
              <span>End Session</span>
            </motion.button>
          )}
        </div>

        {reviewsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-slate-600 mt-2">Loading review queue...</p>
          </div>
        ) : reviewQueue.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-800 mb-2">
              All caught up!
            </h4>
            <p className="text-slate-600">
              No memories are due for review right now. Great job!
            </p>
          </div>
        ) : !currentReviewSession ? (
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <p className="text-slate-600 mb-4">
              You have {reviewQueue.length} memories due for review.
            </p>
            <div className="space-y-3">
              {reviewQueue.slice(0, 5).map((item) => (
                <motion.div 
                  key={item.id}
                  className="glass-card-strong rounded-xl p-4 hover-glow group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800 group-hover:gradient-text transition-all duration-300 text-sm mb-1">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Review #{item.review_count + 1}</span>
                        <span className={getDifficultyColor(item.difficulty_level)}>
                          {getDifficultyLabel(item.difficulty_level)}
                        </span>
                        <span>Interval: {item.review_interval_days} days</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {reviewQueue.length > 5 && (
                <p className="text-sm text-slate-500 text-center">
                  ...and {reviewQueue.length - 5} more
                </p>
              )}
            </div>
          </div>
        ) : currentReviewItem ? (
          <motion.div
            key={`review-${currentReviewIndex}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Progress: {currentReviewIndex + 1} / {reviewQueue.length}</span>
                <span className={getDifficultyColor(currentReviewItem.difficulty_level)}>
                  {getDifficultyLabel(currentReviewItem.difficulty_level)}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                Session: {currentReviewSession.correct_recalls}/{currentReviewSession.total_recalls} correct
              </div>
            </div>

            <div className="glass-card-strong rounded-xl p-6">
              <h4 className="text-lg font-semibold text-slate-800 mb-4">
                {currentReviewItem.title}
              </h4>
              
              {!showAnswer ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">
                    Try to recall the content of this memory, then click to reveal the answer.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAnswer(true)}
                    className="glass-button px-4 py-2 rounded-xl font-semibold hover-glow transition-colors"
                  >
                    Show Answer
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {currentReviewItem.content}
                    </p>
                  </div>
                  
                  {currentReviewItem.tags && currentReviewItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentReviewItem.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-600 mb-4">
                      How well did you remember this?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleReviewResponse('again')}
                        className="flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Again</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleReviewResponse('hard')}
                        className="flex items-center justify-center gap-2 p-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm font-medium">Hard</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleReviewResponse('good')}
                        className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Good</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleReviewResponse('easy')}
                        className="flex items-center justify-center gap-2 p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                      >
                        <Target className="w-4 h-4" />
                        <span className="text-sm font-medium">Easy</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
