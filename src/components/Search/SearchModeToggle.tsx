import React from 'react';
import { motion } from 'framer-motion';
import { Search, MessageCircle } from 'lucide-react';

interface SearchModeToggleProps {
  mode: 'normal' | 'chatbot';
  onModeChange: (mode: 'normal' | 'chatbot') => void;
}

const SearchModeToggle: React.FC<SearchModeToggleProps> = ({ mode, onModeChange }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="glass-card-strong rounded-2xl p-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={() => onModeChange('normal')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${
              mode === 'normal'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Search className="w-5 h-5" />
            <span className="font-medium">Normal Search</span>
          </motion.button>
          
          <motion.button
            onClick={() => onModeChange('chatbot')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${
              mode === 'chatbot'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Chatbot</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SearchModeToggle;