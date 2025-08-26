import { create } from 'zustand';
import { GraphData, GraphSettings, GraphFilters, GraphNode, GraphEdge } from '../types/knowledgeGraph';
import { KnowledgeGraphService } from '../services/knowledgeGraphService';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface KnowledgeGraphState {
  graphData: GraphData | null;
  loading: boolean;
  selectedNode: GraphNode | null;
  settings: GraphSettings;
  filters: GraphFilters;
  
  // Actions
  loadGraphData: () => Promise<void>;
  updateSettings: (settings: Partial<GraphSettings>) => void;
  updateFilters: (filters: Partial<GraphFilters>) => void;
  selectNode: (node: GraphNode | null) => void;
  refreshGraph: () => Promise<void>;
}

const defaultSettings: GraphSettings = {
  showSimilarityConnections: true,
  showTagConnections: true,
  showFolderConnections: true,
  showReferenceConnections: true,
  similarityThreshold: 0.7,
  maxConnections: 100,
  nodeSize: 'medium',
  layoutType: 'force'
};

const defaultFilters: GraphFilters = {
  nodeTypes: ['memory', 'file', 'folder'],
  tags: [],
  folders: []
};

export const useKnowledgeGraphStore = create<KnowledgeGraphState>((set, get) => ({
  graphData: null,
  loading: false,
  selectedNode: null,
  settings: defaultSettings,
  filters: defaultFilters,

  loadGraphData: async () => {
    set({ loading: true });
    
    try {
      const graphService = KnowledgeGraphService.getInstance();
      const { settings, filters } = get();
      
      const graphData = await graphService.generateGraphData(filters, settings);
      
      set({ graphData, loading: false });
      
      console.log('✅ Knowledge graph loaded:', {
        nodes: graphData.nodes.length,
        edges: graphData.edges.length
      });
      
    } catch (error) {
      console.error('Error loading graph data:', error);
      toast.error('Failed to load knowledge graph');
      set({ loading: false });
    }
  },

  updateSettings: (newSettings) => {
    const currentSettings = get().settings;
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    set({ settings: updatedSettings });
    
    // Reload graph if settings affect the data
    const affectsData = [
      'showSimilarityConnections',
      'showTagConnections', 
      'showFolderConnections',
      'showReferenceConnections',
      'similarityThreshold',
      'maxConnections'
    ].some(key => key in newSettings);
    
    if (affectsData) {
      get().loadGraphData();
    }
  },

  updateFilters: (newFilters) => {
    const currentFilters = get().filters;
    const updatedFilters = { ...currentFilters, ...newFilters };
    
    set({ filters: updatedFilters });
    
    // Reload graph with new filters
    get().loadGraphData();
  },

  selectNode: (node) => {
    set({ selectedNode: node });
  },

  refreshGraph: async () => {
    // Clear any cached data and reload
    const graphService = KnowledgeGraphService.getInstance();
    const { user } = useAuthStore.getState();
    if (user) {
      graphService.clearCache(user.id);
    }
    await get().loadGraphData();
    toast.success('Knowledge graph refreshed');
  }
}));