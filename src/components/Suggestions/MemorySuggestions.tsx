import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Eye, Clock } from 'lucide-react';
import { useSuggestionReviewStore } from '../../stores/suggestionReviewStore';
import { MemorySuggestion } from '../../types/suggestions';

export const MemorySuggestions: React.FC = () => {
  const { 
    suggestions, 
    suggestionsLoading, 
    loadSuggestions, 
    dismissSuggestion, 
    actOnSuggestion 
  } = useSuggestionReviewStore();

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleViewMemory = async (suggestion: MemorySuggestion) => {
    await actOnSuggestion(suggestion.id);
    // In a real implementation, you would navigate to the memory
    console.log('Navigate to memory:', suggestion.memory_id);
  };

  const getSuggestionIcon = (type: MemorySuggestion['suggestion_type']) => {
    switch (type) {
      case 'contextual': return <Lightbulb className="w-4 h-4 text-indigo-600" />;
      case 'related': return <Eye className="w-4 h-4 text-emerald-600" />;
      case 'reminder': return <Clock className="w-4 h-4 text-purple-600" />;
    }
  };

  if (suggestionsLoading) {
    return (
      <div className="glass-card hover-glow rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="glass-card hover-glow rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl heading-lg gradient-text">Memory Suggestions</h3>
          </div>
        </div>
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No suggestions available at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card hover-glow rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-xl heading-lg gradient-text">Memory Suggestions</h3>
        </div>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        <AnimatePresence>
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -300 }}
              className="glass-card-strong rounded-xl p-4 hover-glow group cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      {getSuggestionIcon(suggestion.suggestion_type)}
                      <span className="font-semibold text-slate-800 group-hover:gradient-text transition-all duration-300">
                        {suggestion.title}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      suggestion.priority === 'high' 
                        ? 'bg-red-100 text-red-700'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {suggestion.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    {suggestion.reason}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewMemory(suggestion)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View Memory
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
