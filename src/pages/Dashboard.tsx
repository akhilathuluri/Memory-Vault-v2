import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  FileImage, 
  Clock,
  Database,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useMemoryStore } from '../stores/memoryStore';
import { useFileStore } from '../stores/fileStore';
import { useVaultLock } from '../hooks/useVaultLock';
import { MemorySuggestions } from '../components/Suggestions/MemorySuggestions';
import { SpacedRepetitionPanel } from '../components/Reviews/SpacedRepetitionPanel';
import GraphPreview from '../components/KnowledgeGraph/GraphPreview';
import { MemoryExpirationBadge } from '../components/MemoryExpirationBadge';
import { format } from 'date-fns';

const Dashboard = () => {
  const { memories, fetchMemories } = useMemoryStore();
  const { files, storageUsed, storageLimit, fetchFiles } = useFileStore();
  const { trackActivity } = useVaultLock();

  useEffect(() => {
    fetchMemories();
    fetchFiles();
    trackActivity(); // Track activity on page load
  }, [fetchMemories, fetchFiles, trackActivity]);

  const stats = [
    {
      title: 'Total Memories',
      value: memories.length,
      icon: Brain,
      gradient: 'from-indigo-500 to-purple-600',
      bgGradient: 'from-indigo-50 to-purple-50',
      textColor: 'text-indigo-700',
      change: '+12%',
      trend: 'up',
    },
    {
      title: 'Files Stored',
      value: files.length,
      icon: FileImage,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      textColor: 'text-emerald-700',
      change: '+8%',
      trend: 'up',
    },
    {
      title: 'Storage Used',
      value: `${Math.round((storageUsed / (1024 * 1024)) * 10) / 10}MB`,
      icon: Database,
      gradient: 'from-purple-500 to-violet-600',
      bgGradient: 'from-purple-50 to-violet-50',
      textColor: 'text-purple-700',
      change: `${Math.round((storageUsed / storageLimit) * 100)}%`,
      trend: 'neutral',
    },
  ];

  const recentMemories = memories.slice(0, 5);
  const recentFiles = files.slice(0, 5);

  return (
    <div className="space-y-8" onClick={trackActivity}>
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-header rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute inset-0 animated-gradient opacity-90"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 glass-card-strong rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl heading-display mb-2">Welcome back!</h1>
              <p className="text-indigo-100 text-lg text-body">
                Here's what's happening with your memories today.
              </p>
            </div>
          </div>
          <div className="absolute top-4 right-4 opacity-20">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 border border-white/30 rounded-full"
            ></motion.div>
          </div>
        </div>
      </motion.div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card hover-glow rounded-2xl p-6 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.bgGradient} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className="flex items-center space-x-1">
                {stat.trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                {stat.trend === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                <span className={`text-sm text-body-medium ${
                  stat.trend === 'up' ? 'text-emerald-600' : 
                  stat.trend === 'down' ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <div>
              <p className={`text-sm text-body-medium mb-1 ${stat.textColor}`}>{stat.title}</p>
              <p className="text-3xl heading-xl gradient-text">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Memory Suggestions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MemorySuggestions />
        </motion.div>

        {/* Spaced Repetition */}
        <motion.div
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SpacedRepetitionPanel />
        </motion.div>

        {/* Knowledge Graph Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GraphPreview />
        </motion.div>
      </div>

      {/* Recent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Memories */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card hover-glow rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
                <Brain className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl heading-lg gradient-text">Recent Memories</h3>
            </div>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {recentMemories.length > 0 ? recentMemories.map((memory) => (
              <motion.div 
                key={memory.id} 
                className="glass-card-strong rounded-xl p-4 hover-glow group cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-800 group-hover:gradient-text transition-all duration-300">{memory.title}</h4>
                      <MemoryExpirationBadge memory={memory} />
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{memory.content}</p>
                    <div className="flex items-center text-xs text-slate-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{format(new Date(memory.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No memories yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Files */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card hover-glow rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50">
                <FileImage className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold gradient-text">Recent Files</h3>
            </div>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {recentFiles.length > 0 ? recentFiles.map((file) => (
              <motion.div 
                key={file.id} 
                className="glass-card-strong rounded-xl p-4 hover-glow group cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileImage className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 mb-1 group-hover:gradient-text transition-all duration-300 truncate">{file.name}</h4>
                    <div className="flex items-center text-xs text-slate-500 space-x-3">
                      <span>{Math.round(file.file_size / 1024)}KB</span>
                      <span>•</span>
                      <span>{format(new Date(file.created_at), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-8">
                <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No files yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;