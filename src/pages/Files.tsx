import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, Video, Trash2, Eye, Download } from 'lucide-react';
import { useFileStore } from '../stores/fileStore';
import { useAuthStore } from '../stores/authStore';
import { useSmartRefresh } from '../hooks/useSmartRefresh';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import FileUploadModal, { FileMetadata } from '../components/Files/FileUploadModal';
import { Pagination } from '../components/Common/Pagination';
import { usePagination } from '../hooks/usePagination';

const Files = () => {
  const { files, loading, storageUsed, storageLimit, fetchFiles, uploadFileWithMetadata, deleteFile } = useFileStore();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Pagination setup
  const filesPagination = usePagination({
    data: files,
    itemsPerPage: 24, // 6x4 grid on large screens
    initialPage: 1
  });

  // Smart refresh for files
  useSmartRefresh({
    fetchFunction: fetchFiles,
    userId: user?.id || null,
    dataType: 'files',
    dependencies: []
  });

  // Generate thumbnails for files
  useEffect(() => {
    const generateThumbnails = async () => {
      const newThumbnails: { [key: string]: string } = {};
      
      for (const file of files) {
        if (file.file_type === 'image') {
          try {
            const url = await getFileUrl(file.file_path);
            newThumbnails[file.id] = url;
          } catch (error) {
            console.error('Error generating thumbnail:', error);
          }
        }
      }
      
      setThumbnails(newThumbnails);
    };

    if (files.length > 0) {
      generateThumbnails();
    }
  }, [files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Only images and videos are allowed');
        return;
      }
      
      // Open modal with file for metadata input
      setFileToUpload(file);
      setShowUploadModal(true);
    }
  };

  const handleUploadWithMetadata = async (file: File, metadata: FileMetadata) => {
    await uploadFileWithMetadata(file, metadata);
    setShowUploadModal(false);
    setFileToUpload(null);
  };

  const handleQuickUpload = () => {
    fileInputRef.current?.click();
  };

  const getFileUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('memory-vault-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    return data?.signedUrl || '';
  };

  const handlePreview = async (file: any) => {
    const url = await getFileUrl(file.file_path);
    setPreviewUrl(url);
    setSelectedFile(file);
  };

  const handleDownload = async (file: any) => {
    const url = await getFileUrl(file.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
  };

  const storagePercentage = (storageUsed / storageLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Files</h1>
          <p className="text-slate-600 mt-1">Store and manage your photos and videos</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleQuickUpload}
          className="glass-button px-6 py-3 rounded-xl font-semibold hover-glow transition-colors flex items-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>Upload File</span>
        </motion.button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Premium Storage Info */}
      <div className="glass-card rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Storage Usage</h3>
          <span className="text-sm text-slate-600">
            {Math.round((storageUsed / (1024 * 1024)) * 10) / 10}MB / 100MB
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${storagePercentage}%` }}
            className={`h-3 rounded-full transition-colors ${
              storagePercentage > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
              storagePercentage > 70 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
          />
        </div>
        <p className="text-sm text-slate-600 mt-2">
          {storagePercentage > 90 ? 'Storage almost full' : 
           storagePercentage > 70 ? 'Storage getting full' : 'Plenty of storage available'}
        </p>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
          <p className="text-gray-600 mb-6">Upload your first photo or video</p>
          <button
            onClick={handleQuickUpload}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
          >
            Upload Your First File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {filesPagination.paginatedData.map((file: any, index: number) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group glass-card-medium hover:glass-card-strong rounded-xl p-3 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer border border-white/20 backdrop-blur-sm hover:scale-105"
              onClick={() => handlePreview(file)}
            >
              {/* Thumbnail/Icon Area */}
              <div className="aspect-square bg-gradient-to-br from-slate-100/50 to-slate-200/50 rounded-lg mb-2 overflow-hidden relative">
                {file.file_type === 'image' && thumbnails[file.id] ? (
                  <img 
                    src={thumbnails[file.id]} 
                    alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : file.file_type === 'image' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-indigo-500" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100/50 to-indigo-100/50">
                    <Video className="w-8 h-8 text-purple-600" />
                  </div>
                )}
                
                {/* File type badge */}
                <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
                  {file.name.split('.').pop()?.toUpperCase()}
                </div>
              </div>

              {/* File Info */}
              <div className="space-y-1">
                <h3 className="font-medium text-slate-800 text-xs truncate" title={file.name}>
                  {file.name}
                </h3>
                
                {/* Tags */}
                {file.tags && file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {file.tags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs bg-indigo-100/70 text-indigo-700 px-1.5 py-0.5 rounded-full backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                    {file.tags.length > 2 && (
                      <span className="text-xs text-slate-500">+{file.tags.length - 2}</span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{Math.round(file.file_size / 1024)}KB</span>
                  <span>{format(new Date(file.created_at), 'MMM d')}</span>
                </div>
              </div>

              {/* Quick Actions - Show on hover */}
              <div className="mt-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(file);
                  }}
                  className="flex-1 bg-indigo-100/70 text-indigo-700 p-1.5 rounded-lg text-xs hover:bg-indigo-200/70 transition-colors flex items-center justify-center backdrop-blur-sm"
                  title="Preview"
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="flex-1 bg-emerald-100/70 text-emerald-700 p-1.5 rounded-lg text-xs hover:bg-emerald-200/70 transition-colors flex items-center justify-center backdrop-blur-sm"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(file.id);
                  }}
                  className="flex-1 bg-red-100/70 text-red-700 p-1.5 rounded-lg text-xs hover:bg-red-200/70 transition-colors flex items-center justify-center backdrop-blur-sm"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && files.length > 0 && filesPagination.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={filesPagination.currentPage}
            totalPages={filesPagination.totalPages}
            totalItems={filesPagination.totalItems}
            itemsPerPage={filesPagination.itemsPerPage}
            onPageChange={filesPagination.goToPage}
            className="justify-center"
          />
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-4xl max-h-[90vh] overflow-hidden border border-white/50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">{selectedFile.name}</h3>
                  {selectedFile.description && (
                    <p className="text-sm text-slate-700 mt-2">{selectedFile.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-slate-600 mt-2">
                    <span>{Math.round(selectedFile.file_size / 1024)}KB</span>
                    <span>{format(new Date(selectedFile.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  {selectedFile.tags && selectedFile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedFile.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <button
                    onClick={() => handleDownload(selectedFile)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 flex items-center space-x-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-600 hover:text-slate-800 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                {selectedFile.file_type === 'image' ? (
                  <img 
                    src={previewUrl} 
                    alt={selectedFile.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video 
                    src={previewUrl} 
                    controls
                    className="w-full h-full"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setFileToUpload(null);
        }}
        onUpload={handleUploadWithMetadata}
        selectedFile={fileToUpload}
      />
    </div>
  );
};

export default Files;