import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Tag, FileText, Image, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, metadata: FileMetadata) => Promise<void>;
  selectedFile: File | null;
}

export interface FileMetadata {
  name: string;
  description: string;
  tags: string[];
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  selectedFile
}) => {
  const [metadata, setMetadata] = useState<FileMetadata>({
    name: selectedFile?.name || '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Update name when file changes
  React.useEffect(() => {
    if (selectedFile) {
      setMetadata(prev => ({
        ...prev,
        name: selectedFile.name
      }));
    }
  }, [selectedFile]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !metadata.tags.includes(tag)) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }

    if (!metadata.name.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    setLoading(true);
    try {
      await onUpload(selectedFile, metadata);
      onClose();
      // Reset form
      setMetadata({ name: '', description: '', tags: [] });
      setTagInput('');
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filePreview = selectedFile ? URL.createObjectURL(selectedFile) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/50 shadow-2xl"
          >
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-400/20 to-cyan-400/20 rounded-full blur-2xl -z-10"></div>
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Upload File
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">Add files to your digital vault</p>
                </div>
              </div>
              {!loading && (
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100/50 rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Preview */}
              {selectedFile && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                      {selectedFile.type.startsWith('image/') ? (
                        filePreview ? (
                          <img 
                            src={filePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="w-8 h-8 text-slate-400" />
                        )
                      ) : (
                        <div className="bg-gradient-to-br from-emerald-100 to-teal-100 w-full h-full flex items-center justify-center rounded-lg">
                          <FileText className="w-8 h-8 text-emerald-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-lg">{selectedFile.name}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* File Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  File Name <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  value={metadata.name}
                  onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 text-slate-800 placeholder-slate-500 transition-all duration-200 shadow-sm disabled:opacity-50"
                  placeholder="Enter a descriptive name for your file"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Description <span className="text-xs text-slate-600">(helps with search)</span>
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  disabled={loading}
                  rows={3}
                  className="w-full px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 text-slate-800 placeholder-slate-500 transition-all duration-200 resize-none shadow-sm disabled:opacity-50"
                  placeholder="Describe what's in this file to make it searchable"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Tags <span className="text-xs text-slate-600">(optional)</span>
                </label>
                <div className="flex space-x-3 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    className="flex-1 px-4 py-3.5 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 text-slate-800 placeholder-slate-500 transition-all duration-200 shadow-sm disabled:opacity-50"
                    placeholder="Add tags (press Enter)"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={loading}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-6 py-3.5 rounded-xl transition-all duration-200 border border-emerald-200 disabled:opacity-50"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Tag List */}
                {metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm border border-emerald-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          disabled={loading}
                          className="ml-2 text-emerald-500 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-600">
                  Tags help categorize and search your files
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-white/80 hover:bg-white/90 text-slate-700 border border-slate-300 rounded-xl font-medium transition-all duration-200 shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedFile || !metadata.name.trim()}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FileUploadModal;
