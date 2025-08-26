import React, { useState, useEffect } from 'react';
import { useFolders, useFolderActions } from '../../stores/folderStore';
import { CreateFolderData } from '../../types/folders';
import { FolderService } from '../../services/folderService';

interface FolderSelectorProps {
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  allowCreateNew?: boolean;
  className?: string;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  selectedFolderId,
  onFolderSelect,
  allowCreateNew = false,
  className = ''
}) => {
  const { folders, isLoading, fetchFolders } = useFolders();
  const { createFolder } = useFolderActions();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const folderService = FolderService.getInstance();

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreateFolder = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const defaultColors = folderService.getDefaultColors();
      const defaultIcons = folderService.getDefaultIcons();
      
      const folderData: CreateFolderData = {
        name: newFolderName.trim(),
        description: '',
        color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
        icon: defaultIcons[Math.floor(Math.random() * defaultIcons.length)]
      };

      const newFolder = await createFolder(folderData);
      if (newFolder) {
        onFolderSelect(newFolder.id);
        setNewFolderName('');
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg h-10 ${className}`} />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Folder Selector */}
      <div className="relative">
        <select
          value={selectedFolderId || ''}
          onChange={(e) => onFolderSelect(e.target.value || null)}
          className="w-full bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent appearance-none"
        >
          <option value="" className="bg-white text-slate-800">
            📁 Root (No Folder)
          </option>
          {folders.map((folder) => (
            <option 
              key={folder.id} 
              value={folder.id}
              className="bg-white text-slate-800"
            >
              📁 {folder.name} {folder.memory_count ? `(${folder.memory_count})` : ''}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Create New Folder */}
      {allowCreateNew && (
        <div>
          {!showCreateForm ? (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg px-3 py-2 text-blue-300 text-sm transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Folder
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateFolder(e as any);
                  }
                  if (e.key === 'Escape') {
                    setShowCreateForm(false);
                    setNewFolderName('');
                  }
                }}
                placeholder="Folder name..."
                className="w-full bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                maxLength={100}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleCreateFolder(e as any)}
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
