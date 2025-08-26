import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Brain, Trash2, Tag, Calendar, X, BookOpen, Mic, Folder, ChevronDown, ChevronRight, Bell, Clock } from 'lucide-react';
import { useMemoryStore } from '../stores/memoryStore';
import { useFileStore } from '../stores/fileStore';
import { useSuggestionReviewStore } from '../stores/suggestionReviewStore';
import { useFolders } from '../stores/folderStore';
import { useAuthStore } from '../stores/authStore';
import { useSmartRefresh } from '../hooks/useSmartRefresh';
import { VoiceRecorder } from '../components/VoiceRecorder/VoiceRecorder';
import { FolderSelector } from '../components/Folders/FolderSelector';
import { Pagination } from '../components/Common/Pagination';
import LocationToggle from '../components/Location/LocationToggle';
import LocationCapture from '../components/Location/LocationCapture';
import { GetNotifiedModal, NotificationHistoryModal } from '../components/Notifications';
import { MemoryExpirationModal } from '../components/MemoryExpirationModal';
import { MemoryExpirationBadge } from '../components/MemoryExpirationBadge';
import { usePagination } from '../hooks/usePagination';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Memories = () => {
  const { memories, loading, fetchMemories, addMemory, deleteMemory, updateMemory } = useMemoryStore();
  const { uploadVoiceRecording } = useFileStore();
  const { scheduleMemoryForReview } = useSuggestionReviewStore();
  const { folders, fetchFolders } = useFolders();
  const { user } = useAuthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGetNotified, setShowGetNotified] = useState(false);
  const [showNotificationHistory, setShowNotificationHistory] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expirationMemory, setExpirationMemory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    tags: string[];
    folder_id: string | null;
    location?: any;
  }>({
    title: '',
    content: '',
    tags: [],
    folder_id: null,
    location: null,
  });
  const [tagInput, setTagInput] = useState('');


  // Smart refresh for memories and folders
  useSmartRefresh({
    fetchFunction: fetchMemories,
    userId: user?.id || null,
    dataType: 'memories',
    dependencies: []
  });

  useEffect(() => {
    fetchFolders();

    // Add some test folders if none exist (for testing only)
    if (folders.length === 0) {
      console.log('No folders found, this is expected until DB migration is applied');
    }
  }, [fetchFolders]);

  // Helper function to organize memories by folders
  const organizeMemoriesByFolders = () => {
    const memoriesByFolder: { [key: string]: any[] } = {};
    const rootMemories: any[] = [];

    memories.forEach(memory => {
      if (memory.folder_id) {
        if (!memoriesByFolder[memory.folder_id]) {
          memoriesByFolder[memory.folder_id] = [];
        }
        memoriesByFolder[memory.folder_id].push(memory);
      } else {
        rootMemories.push(memory);
      }
    });

    return { memoriesByFolder, rootMemories };
  };

  const { memoriesByFolder, rootMemories } = organizeMemoriesByFolders();

  // Pagination for unfiled memories
  const unfiledMemoriesPagination = usePagination({
    data: rootMemories,
    itemsPerPage: 9, // 3x3 grid
    initialPage: 1
  });

  // Pagination state for each folder
  const [folderPaginations, setFolderPaginations] = useState<{ [key: string]: number }>({});

  const getFolderPage = (folderId: string) => folderPaginations[folderId] || 1;

  const setFolderPage = (folderId: string, page: number) => {
    setFolderPaginations(prev => ({ ...prev, [folderId]: page }));
  };

  const getPaginatedFolderMemories = (folderId: string, folderMemories: any[]) => {
    const itemsPerPage = 6; // 2 rows of 3 in folders
    const currentPage = getFolderPage(folderId);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedMemories: folderMemories.slice(startIndex, endIndex),
      totalPages: Math.ceil(folderMemories.length / itemsPerPage),
      currentPage,
      totalItems: folderMemories.length,
      itemsPerPage
    };
  };

  // Auto-expand folders that have memories
  useEffect(() => {
    if (folders.length > 0) {
      const foldersWithMemories = folders
        .filter(folder => memoriesByFolder[folder.id]?.length > 0)
        .map(folder => folder.id);

      setExpandedFolders(new Set(foldersWithMemories));
    }
  }, [folders, memories]); // Changed dependency to memories instead of memoriesByFolder

  const toggleFolderExpansion = (folderId: string) => {
    console.log('Toggling folder:', folderId, 'Current expanded:', expandedFolders.has(folderId));
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      console.log('New expanded folders:', Array.from(newSet));
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addMemory({
        ...formData,
        folder_id: formData.folder_id || undefined
      });

      setFormData({ title: '', content: '', tags: [], folder_id: null, location: null });
      setShowAddForm(false);
      toast.success('Memory saved successfully!');
    } catch (error) {
      console.error('Error adding memory:', error);
      toast.error('Failed to save memory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleLocationCaptured = (location: any) => {
    setFormData(prev => ({
      ...prev,
      location,
      // Add location tags to the existing tags
      tags: [...prev.tags, ...(location.tags || [])].filter((tag, index, arr) => arr.indexOf(tag) === index)
    }));
  };

  const handleLocationRemoved = () => {
    setFormData(prev => ({
      ...prev,
      location: null,
      // Remove location-related tags
      tags: prev.tags.filter(tag => !tag.startsWith('location:') && !tag.startsWith('country:'))
    }));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory(id);
    }
  };

  const handleVoiceRecording = async (transcription: string, audioBlob: Blob, language: string) => {
    try {
      setIsSubmitting(true);

      // Save audio file with transcription
      await uploadVoiceRecording(audioBlob, transcription, language);

      // Create memory from transcription
      const memoryData = {
        title: `Voice Memo - ${new Date().toLocaleDateString()}`,
        content: transcription,
        tags: ['voice-memo', language.split('-')[0]], // Add language tag
        folder_id: formData.folder_id || undefined,
        location: formData.location || undefined,
      };

      await addMemory(memoryData);

      setShowAddForm(false);
      setActiveTab('text');
      toast.success('Voice memo saved as memory and audio file!');
    } catch (error) {
      console.error('Error saving voice recording:', error);
      toast.error('Failed to save voice memo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Memories</h1>
          <p className="text-slate-600 mt-1">Store and organize your precious memories</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-3 sm:space-y-0">
          {/* Get Notified Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowGetNotified(true)}
            className="glass-button-secondary px-4 py-3 rounded-xl font-semibold hover-glow transition-colors flex items-center justify-center space-x-2 border border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/50 w-full sm:w-auto"
          >
            <Bell className="w-5 h-5" />
            <span>Get Notified</span>
          </motion.button>
          
          {/* History Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNotificationHistory(true)}
            className="glass-button-secondary px-4 py-3 rounded-xl font-semibold hover-glow transition-colors flex items-center justify-center space-x-2 border border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100/50 w-full sm:w-auto"
            title="View Notification History"
          >
            <BookOpen className="w-5 h-5" />
            <span>History</span>
          </motion.button>

          {/* Add Memory Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="glass-button px-6 py-3 rounded-xl font-semibold hover-glow transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Add Memory</span>
          </motion.button>
        </div>
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => !isSubmitting && setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/50 shadow-2xl"
            >
              {/* Decorative gradient orbs */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-2xl -z-10"></div>

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Add New Memory
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">Capture and organize your thoughts</p>
                  </div>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setActiveTab('text');
                    }}
                    className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100/50 rounded-lg transition-all duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-100/50 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setActiveTab('text')}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${activeTab === 'text'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                    } disabled:opacity-50`}
                >
                  <Brain className="w-4 h-4" />
                  <span>Text Memory</span>
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${activeTab === 'voice'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                    } disabled:opacity-50`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Voice Memory</span>
                </button>
              </div>


              {/* Tab Content */}
              {activeTab === 'text' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Title <span className="text-indigo-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 placeholder-slate-500 transition-all duration-200 shadow-sm disabled:opacity-50"
                      placeholder="Give your memory a descriptive title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Content <span className="text-indigo-600">*</span>
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      disabled={isSubmitting}
                      rows={6}
                      className="w-full px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 placeholder-slate-500 transition-all duration-200 resize-none shadow-sm disabled:opacity-50"
                      placeholder="Describe your memory in detail..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Folder <span className="text-xs text-slate-600">(optional)</span>
                    </label>
                    <FolderSelector
                      selectedFolderId={formData.folder_id}
                      onFolderSelect={(folderId) => setFormData(prev => ({ ...prev, folder_id: folderId }))}
                      allowCreateNew={true}
                      className="mb-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Tags <span className="text-xs text-slate-600">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 border border-indigo-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            disabled={isSubmitting}
                            className="ml-2 text-indigo-500 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(tagInput))}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 text-slate-800 placeholder-slate-500 transition-all duration-200 shadow-sm disabled:opacity-50"
                        placeholder="Add a tag..."
                      />
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-medium transition-all duration-200 border border-indigo-200 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Location Capture */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Location <span className="text-xs text-slate-600">(optional)</span>
                    </label>
                    <LocationCapture
                      onLocationCaptured={handleLocationCaptured}
                      onLocationRemoved={handleLocationRemoved}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setActiveTab('text');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-white/80 hover:bg-white/90 text-slate-700 border border-slate-300 rounded-xl font-medium transition-all duration-200 shadow-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5" />
                          <span>Save Memory</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-2">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Record Voice Memory</h3>
                    <p className="text-sm text-slate-600">
                      Record your thoughts and we'll automatically create a memory with transcription
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Folder <span className="text-xs text-slate-600">(optional)</span>
                    </label>
                    <FolderSelector
                      selectedFolderId={formData.folder_id}
                      onFolderSelect={(folderId) => setFormData(prev => ({ ...prev, folder_id: folderId }))}
                      allowCreateNew={true}
                      className="mb-4"
                    />
                  </div>

                  {/* Location Capture for Voice */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Location <span className="text-xs text-slate-600">(optional)</span>
                    </label>
                    <LocationCapture
                      onLocationCaptured={handleLocationCaptured}
                      onLocationRemoved={handleLocationRemoved}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </div>

                  <VoiceRecorder
                    onTranscriptionComplete={handleVoiceRecording}
                    isDisabled={isSubmitting}
                  />

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setActiveTab('text');
                      }}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-white/80 hover:bg-white/90 text-slate-700 border border-slate-300 rounded-xl font-medium transition-all duration-200 shadow-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/50 shadow-2xl"
            >
              {/* Decorative gradient orbs */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-2xl -z-10"></div>

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {selectedMemory.title}
                    </h2>
                    <div className="flex items-center text-sm text-slate-600 mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(selectedMemory.created_at), 'MMMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="text-slate-600 hover:text-slate-800 p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Memory Content */}
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Memory Content</h3>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedMemory.content}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemory.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 border border-indigo-200"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Location</h3>
                  <LocationToggle
                    memoryId={selectedMemory.id}
                    className="w-full"
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => setSelectedMemory(null)}
                    className="flex-1 px-6 py-3 bg-white/80 hover:bg-white/90 text-slate-700 border border-slate-300 rounded-xl font-medium transition-all duration-200 shadow-sm"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      scheduleMemoryForReview(selectedMemory.id);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Schedule Review</span>
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(selectedMemory.id);
                      setSelectedMemory(null);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Memory</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">No memories yet</h3>
          <p className="text-slate-600 mb-6">Start by adding your first memory</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="glass-button px-6 py-3 rounded-lg hover-glow transition-colors"
          >
            Add Your First Memory
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Debug info */}
          {/* <div className="bg-yellow-100 p-4 rounded-lg text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Total folders: {folders.length}</p>
            <p>Total memories: {memories.length}</p>
            <p>Expanded folders: {Array.from(expandedFolders).join(', ')}</p>
            <p>Folders: {folders.map(f => f.name).join(', ')}</p>
            {folders.length === 0 && (
              <p className="text-red-600 mt-2">
                ⚠️ No folders found - Database migration may not be applied yet. 
                All memories will show in "Unfiled" section below.
              </p>
            )}
          </div> */}

          {/* Folders with their memories */}
          {folders.map((folder) => {
            const folderMemories = memoriesByFolder[folder.id] || [];
            // Temporarily show all folders for testing
            // if (folderMemories.length === 0) return null;

            const isExpanded = expandedFolders.has(folder.id);
            const {
              paginatedMemories,
              totalPages,
              currentPage,
              totalItems,
              itemsPerPage
            } = getPaginatedFolderMemories(folder.id, folderMemories);

            return (
              <div key={folder.id} className="space-y-4">
                {/* Folder Header */}
                <div
                  className="flex items-center space-x-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolderExpansion(folder.id);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-600 transition-transform" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-600 transition-transform" />
                    )}
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg"
                      style={{ backgroundColor: `${folder.color}20` }}
                    >
                      <Folder
                        className="w-5 h-5"
                        style={{ color: folder.color }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-semibold group-hover:text-slate-900 transition-colors"
                      style={{ color: folder.color }}
                    >
                      {folder.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {folderMemories.length} {folderMemories.length === 1 ? 'memory' : 'memories'}
                      {folder.description && ` • ${folder.description}`}
                    </p>
                  </div>
                </div>

                {/* Folder Memories */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-10 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedMemories.map((memory, index) => (
                        <motion.div
                          key={memory.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card rounded-xl p-4 hover-glow transition-all duration-200 cursor-pointer hover:scale-[1.02] border-l-4"
                          style={{ borderLeftColor: folder.color }}
                          onClick={() => setSelectedMemory(memory)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 mr-2">
                              <h4 className="font-medium text-slate-800 line-clamp-2 text-sm mb-1">
                                {memory.title}
                              </h4>
                              <MemoryExpirationBadge memory={memory} />
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpirationMemory(memory);
                                  setShowExpirationModal(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="Set auto-delete timer"
                              >
                                <Clock className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(memory.id);
                                }}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-slate-600 text-xs mb-3 line-clamp-2">
                            {memory.content.length > 80
                              ? `${memory.content.substring(0, 80)}...`
                              : memory.content
                            }
                          </p>

                          {memory.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {memory.tags.slice(0, 2).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs glass-card-medium text-indigo-700"
                                >
                                  <Tag className="w-2 h-2 mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(memory.created_at), 'MMM d, yyyy')}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                scheduleMemoryForReview(memory.id);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              <Brain className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Folder Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={totalItems}
                          itemsPerPage={itemsPerPage}
                          onPageChange={(page) => setFolderPage(folder.id, page)}
                          className="justify-center"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* Root/Unfiled Memories */}
          {rootMemories.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Unfiled Memories
                  </h3>
                  <p className="text-sm text-slate-500">
                    {rootMemories.length} {rootMemories.length === 1 ? 'memory' : 'memories'} without folders
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unfiledMemoriesPagination.paginatedData.map((memory: any, index: number) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card rounded-xl p-6 hover-glow transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    onClick={() => setSelectedMemory(memory)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 mr-2">
                        <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1">{memory.title}</h3>
                        <MemoryExpirationBadge memory={memory} />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpirationMemory(memory);
                            setShowExpirationModal(true);
                          }}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Set auto-delete timer"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(memory.id);
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                      {memory.content.length > 120
                        ? `${memory.content.substring(0, 120)}...`
                        : memory.content
                      }
                    </p>

                    {memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {memory.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs glass-card-medium text-indigo-700"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {memory.tags.length > 3 && (
                          <span className="text-xs text-slate-500">+{memory.tags.length - 3} more</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-slate-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(memory.created_at), 'MMM d, yyyy')}
                      </div>
                      <span className="text-xs text-indigo-600 font-medium">Click to view</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Unfiled Memories Pagination */}
              {unfiledMemoriesPagination.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={unfiledMemoriesPagination.currentPage}
                    totalPages={unfiledMemoriesPagination.totalPages}
                    totalItems={unfiledMemoriesPagination.totalItems}
                    itemsPerPage={unfiledMemoriesPagination.itemsPerPage}
                    onPageChange={unfiledMemoriesPagination.goToPage}
                    className="justify-center"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Get Notified Modal */}
      <GetNotifiedModal
        isOpen={showGetNotified}
        onClose={() => setShowGetNotified(false)}
      />

      {/* Notification History Modal */}
      <NotificationHistoryModal
        isOpen={showNotificationHistory}
        onClose={() => setShowNotificationHistory(false)}
      />

      {/* Memory Expiration Modal */}
      {expirationMemory && (
        <MemoryExpirationModal
          memory={expirationMemory}
          isOpen={showExpirationModal}
          onClose={() => {
            setShowExpirationModal(false);
            setExpirationMemory(null);
          }}
          onUpdate={updateMemory}
        />
      )}
    </div>
  );
};

export default Memories;