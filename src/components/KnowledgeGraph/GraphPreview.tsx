import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowRight } from 'lucide-react';
import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';

const GraphPreview: React.FC = () => {
  const navigate = useNavigate();
  const { graphData, loading, loadGraphData } = useKnowledgeGraphStore();
  const [stats, setStats] = useState({ nodes: 0, connections: 0 });

  useEffect(() => {
    // Load graph data for preview
    loadGraphData();
  }, [loadGraphData]);

  useEffect(() => {
    if (graphData) {
      setStats({
        nodes: graphData.nodes.length,
        connections: graphData.edges.length
      });
    }
  }, [graphData]);

  const handleViewGraph = () => {
    navigate('/knowledge-graph');
  };

  return (
    <div className="glass-card rounded-2xl p-6 hover:glass-card-strong transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Knowledge Graph</h3>
            <p className="text-sm text-gray-600">Visual connections</p>
          </div>
        </div>
        <button
          onClick={handleViewGraph}
          className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
          title="View Knowledge Graph"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-200 border-t-pink-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl">
              <div className="text-2xl font-bold text-pink-600">{stats.nodes}</div>
              <div className="text-sm text-gray-600">Nodes</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl">
              <div className="text-2xl font-bold text-rose-600">{stats.connections}</div>
              <div className="text-sm text-gray-600">Connections</div>
            </div>
          </div>

          {/* Mini visualization preview */}
          <div className="relative h-24 bg-gradient-to-br from-pink-50/50 to-rose-50/50 rounded-xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {stats.nodes > 0 ? (
                <div className="flex items-center space-x-2">
                  {/* Simple node representation */}
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="w-8 h-0.5 bg-pink-300"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="w-8 h-0.5 bg-pink-300"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No connections yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleViewGraph}
            className="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 text-sm font-medium group-hover:shadow-lg"
          >
            Explore Graph
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphPreview;