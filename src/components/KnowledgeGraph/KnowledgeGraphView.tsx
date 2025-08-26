import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';
import GraphVisualization from './GraphVisualization';
import GraphControls from './GraphControls';
import NodeDetails from './NodeDetails';
import { GraphNode } from '../../types/knowledgeGraph';

const KnowledgeGraphView: React.FC = () => {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const {
    graphData,
    loading,
    selectedNode,
    settings,
    filters,
    loadGraphData,
    updateSettings,
    updateFilters,
    selectNode,
    refreshGraph
  } = useKnowledgeGraphStore();

  // Load graph data on mount
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  const handleNodeClick = (node: GraphNode) => {
    selectNode(node);
    setShowNodeDetails(true);
  };

  const handleNodeHover = (node: GraphNode | null) => {
    // Could add hover effects here
  };

  const handleNavigate = (type: 'memory' | 'file', id: string) => {
    if (type === 'memory') {
      navigate('/memories', { state: { selectedMemoryId: id } });
    } else if (type === 'file') {
      navigate('/files', { state: { selectedFileId: id } });
    }
  };

  const handleExport = () => {
    if (!graphData) return;
    
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge-graph-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading && !graphData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (!graphData || (graphData.nodes.length === 0 && graphData.edges.length === 0)) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Graph Data</h3>
        <p className="text-gray-600 mb-4">
          Create some memories and files to see connections in your knowledge graph.
        </p>
        <button
          onClick={() => navigate('/memories')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Your First Memory
        </button>
      </div>
    );
  }

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-white"
    : "h-full";

  return (
    <div className={containerClass}>
      <div className="h-full flex flex-col">
        <GraphControls
          settings={settings}
          filters={filters}
          onSettingsChange={updateSettings}
          onFiltersChange={updateFilters}
          onRefresh={refreshGraph}
          onExport={handleExport}
          onFullscreen={toggleFullscreen}
          loading={loading}
        />
        
        <div className="flex-1 relative">
          <GraphVisualization
            data={graphData}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            selectedNode={selectedNode}
            width={isFullscreen ? window.innerWidth : (isMobile ? window.innerWidth - 32 : 800)}
            height={isFullscreen ? window.innerHeight - 80 : (isMobile ? window.innerHeight - 200 : 600)}
          />
        </div>
      </div>

      {/* Node Details Modal */}
      {showNodeDetails && (
        <NodeDetails
          node={selectedNode}
          onClose={() => {
            setShowNodeDetails(false);
            selectNode(null);
          }}
          onNavigate={handleNavigate}
        />
      )}

      {/* Fullscreen Exit Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-60 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
          title="Exit Fullscreen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default KnowledgeGraphView;