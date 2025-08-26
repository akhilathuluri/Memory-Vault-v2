import React from 'react';
import { X, Calendar, Tag, Folder, FileText, File, FolderOpen } from 'lucide-react';
import { GraphNode } from '../../types/knowledgeGraph';
import { Memory, FileRecord } from '../../types';

interface NodeDetailsProps {
  node: GraphNode | null;
  onClose: () => void;
  onNavigate?: (type: 'memory' | 'file', id: string) => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose, onNavigate }) => {
  if (!node) return null;

  const handleNavigate = () => {
    if (onNavigate && (node.type === 'memory' || node.type === 'file')) {
      onNavigate(node.type, node.id);
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case 'memory':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'file':
        return <File className="w-5 h-5 text-green-600" />;
      case 'folder':
        return <FolderOpen className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (node.type) {
      case 'memory':
        return 'Memory';
      case 'file':
        return 'File';
      case 'folder':
        return 'Folder';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div>
              <h3 className="font-semibold text-gray-900">{node.title}</h3>
              <p className="text-sm text-gray-500">{getTypeLabel()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {node.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Folder */}
          {node.folder_id && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Folder className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Folder</span>
              </div>
              <p className="text-sm text-gray-600">In folder</p>
            </div>
          )}

          {/* Node Type Specific Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Node Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="capitalize">{node.type}</span>
              </div>
              <div className="flex justify-between">
                <span>ID:</span>
                <span className="font-mono text-xs">{node.id.substring(0, 8)}...</span>
              </div>
              {node.size && (
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{node.size}px</span>
                </div>
              )}
            </div>
          </div>

          {/* Connection Stats */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Connections</h4>
            <p className="text-sm text-blue-600">
              This node appears in the knowledge graph based on its relationships with other content.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
          {(node.type === 'memory' || node.type === 'file') && onNavigate && (
            <button
              onClick={handleNavigate}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              View {getTypeLabel()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeDetails;