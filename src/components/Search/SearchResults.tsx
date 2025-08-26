import React from 'react';
import { motion } from 'framer-motion';
import { Brain, FileImage, Video, Sparkles, MessageSquare, Eye, Download } from 'lucide-react';
import { EnhancedSearchResults } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';
import { supabase } from '../../lib/supabase';
import { MemoryExpirationBadge } from '../MemoryExpirationBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface SearchResultsProps {
  results: EnhancedSearchResults;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  const { aiAnswer, memories, files, totalResults } = results;
  const { settings } = useSettingsStore();

  // Get model display information
  const getModelInfo = () => {
    if (!settings) return null;
    
    const answerModel = settings.answer_model || 'No model configured';
    const provider = settings.ai_provider === 'github' ? 'GitHub Models' : 'OpenRouter';
    
    return {
      model: answerModel,
      provider,
      embedding: 'openai/text-embedding-3-large (GitHub Models)'
    };
  };

  // File interaction handlers
  const handleFilePreview = async (file: any) => {
    try {
      const { data } = await supabase.storage
        .from('memory-vault-files')
        .createSignedUrl(file.file_path, 3600);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast.error('Failed to preview file');
    }
  };

  const handleFileDownload = async (file: any) => {
    try {
      const { data } = await supabase.storage
        .from('memory-vault-files')
        .createSignedUrl(file.file_path, 3600);
      
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = file.name;
        link.click();
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const modelInfo = getModelInfo();

  return (
    <div className="space-y-6">
      {/* AI Answer Section */}
      {aiAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 border-l-4 border-l-indigo-500"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg mr-3">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">AI Answer</h3>
            </div>
            {modelInfo && (
              <div className="text-xs text-slate-600">
                <div className="glass-card-medium rounded-lg px-2 py-1 border border-indigo-200">
                  <span className="font-medium text-slate-700">{modelInfo.model}</span>
                  <span className="text-slate-500 ml-1">({modelInfo.provider})</span>
                </div>
              </div>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
          </div>
        </motion.div>
      )}

      {/* Memory Results */}
      {memories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: aiAnswer ? 0.1 : 0 }}
          className="glass-card rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Brain className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold text-slate-800">
                Memory Results ({memories.length})
              </h3>
            </div>
            {totalResults > memories.length && (
              <span className="text-sm text-slate-500">
                Showing top {memories.length} of {totalResults} results
              </span>
            )}
          </div>
          <div className="space-y-4">
            {memories.map((result) => {
              const memory = result.data as any;
              const folderInfo = (result as any).folderInfo;
              const folderPath = (result as any).folderPath;
              
              return (
                <div
                  key={memory.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{memory.title}</h4>
                        <MemoryExpirationBadge memory={memory} />
                      </div>
                      {folderPath && folderPath !== 'Root' && (
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span 
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: folderInfo?.color ? `${folderInfo.color}20` : '#E5E7EB',
                              color: folderInfo?.color || '#6B7280'
                            }}
                          >
                            {folderPath}
                          </span>
                        </div>
                      )}
                    </div>
                    {result.similarity && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{memory.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {memory.tags?.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span>{format(new Date(memory.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* File Results */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: aiAnswer ? 0.2 : 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center mb-4">
            <FileImage className="w-5 h-5 text-teal-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              File Results ({files.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((result) => {
              const file = result.data as any;
              return (
                <div
                  key={file.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center flex-1 min-w-0">
                      {file.file_type === 'image' ? (
                        <FileImage className="w-4 h-4 text-teal-600 mr-2 flex-shrink-0" />
                      ) : (
                        <Video className="w-4 h-4 text-teal-600 mr-2 flex-shrink-0" />
                      )}
                      <h4 className="font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </h4>
                    </div>
                    {result.similarity && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{Math.round(file.file_size / 1024)}KB</span>
                    <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                  </div>

                  {/* Description */}
                  {file.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {file.description}
                    </p>
                  )}

                  {/* Tags */}
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {file.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{file.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleFilePreview(file)}
                      className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="flex-1 bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs hover:bg-teal-200 transition-colors flex items-center justify-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* No Results */}
      {memories.length === 0 && files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try searching with different keywords or phrases
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SearchResults;
