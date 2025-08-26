import React from 'react';
import { Settings, Filter, RefreshCw, Download, Maximize2 } from 'lucide-react';
import { GraphSettings, GraphFilters } from '../../types/knowledgeGraph';

interface GraphControlsProps {
  settings: GraphSettings;
  filters: GraphFilters;
  onSettingsChange: (settings: Partial<GraphSettings>) => void;
  onFiltersChange: (filters: Partial<GraphFilters>) => void;
  onRefresh: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  loading?: boolean;
}

const GraphControls: React.FC<GraphControlsProps> = ({
  settings,
  filters,
  onSettingsChange,
  onFiltersChange,
  onRefresh,
  onExport,
  onFullscreen,
  loading = false
}) => {
  const [showSettings, setShowSettings] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile device
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {/* Backdrop for mobile panels */}
      {(showSettings || showFilters) && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowSettings(false);
            setShowFilters(false);
          }}
        />
      )}
      
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 relative">
      <div className="flex items-center space-x-2">
        <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
          Knowledge Graph
        </h2>
        {!isMobile && (
          <span className="text-sm text-gray-500">
            Visual connections between your memories
          </span>
        )}
      </div>

      <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
        {/* Filters */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFilters(!showFilters);
              setShowSettings(false); // Close settings when opening filters
            }}
            className={`rounded-lg border transition-colors ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            } ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Filters"
          >
            <Filter className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>

          {showFilters && (
            <div className={`absolute top-12 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20 ${
              isMobile 
                ? 'left-0 right-4 w-auto max-h-96 overflow-y-auto' 
                : 'right-0 w-80'
            }`}>
              <h3 className="font-medium text-gray-900 mb-3">Filters</h3>
              
              {/* Node Types */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Show Node Types
                </label>
                <div className={`space-y-2 ${isMobile ? 'grid grid-cols-3 gap-2' : ''}`}>
                  {(['memory', 'file', 'folder'] as const).map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.nodeTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.nodeTypes, type]
                            : filters.nodeTypes.filter(t => t !== type);
                          onFiltersChange({ nodeTypes: newTypes });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{type}s</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.dateRange?.start || ''}
                    onChange={(e) => onFiltersChange({
                      dateRange: { ...filters.dateRange, start: e.target.value, end: filters.dateRange?.end || '' }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={filters.dateRange?.end || ''}
                    onChange={(e) => onFiltersChange({
                      dateRange: { ...filters.dateRange, start: filters.dateRange?.start || '', end: e.target.value }
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="End date"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowFilters(false); // Close filters when opening settings
            }}
            className={`rounded-lg border transition-colors ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            } ${
              showSettings 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Settings"
          >
            <Settings className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>

          {showSettings && (
            <div className={`absolute top-12 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20 ${
              isMobile 
                ? 'left-0 right-4 w-auto max-h-96 overflow-y-auto' 
                : 'right-0 w-80'
            }`}>
              <h3 className="font-medium text-gray-900 mb-3">Graph Settings</h3>
              
              {/* Connection Types */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Show Connections
                </label>
                <div className={`space-y-2 ${isMobile ? 'grid grid-cols-2 gap-2' : ''}`}>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.showSimilarityConnections}
                      onChange={(e) => onSettingsChange({ showSimilarityConnections: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Similarity</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.showTagConnections}
                      onChange={(e) => onSettingsChange({ showTagConnections: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Tags</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.showFolderConnections}
                      onChange={(e) => onSettingsChange({ showFolderConnections: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Folders</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.showReferenceConnections}
                      onChange={(e) => onSettingsChange({ showReferenceConnections: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">References</span>
                  </label>
                </div>
              </div>

              {/* Similarity Threshold */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Similarity Threshold: {Math.round(settings.similarityThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.similarityThreshold}
                  onChange={(e) => onSettingsChange({ similarityThreshold: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Node Size */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Node Size
                </label>
                <select
                  value={settings.nodeSize}
                  onChange={(e) => onSettingsChange({ nodeSize: e.target.value as 'small' | 'medium' | 'large' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Max Connections */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Connections: {settings.maxConnections}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={settings.maxConnections}
                  onChange={(e) => onSettingsChange({ maxConnections: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 ${
            isMobile ? 'p-3 touch-manipulation' : 'p-2'
          }`}
          title="Refresh Graph"
        >
          <RefreshCw className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Export - Hide on mobile to save space */}
        {onExport && !isMobile && (
          <button
            onClick={onExport}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="Export Graph"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen */}
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className={`rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            }`}
            title="Fullscreen"
          >
            <Maximize2 className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        )}
      </div>
      </div>
    </>
  );
};

export default GraphControls;