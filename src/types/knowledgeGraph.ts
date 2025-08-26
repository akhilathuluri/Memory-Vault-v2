export interface GraphNode {
  id: string;
  title: string;
  type: 'memory' | 'file' | 'folder';
  tags: string[];
  folder_id?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  type: 'similarity' | 'tag' | 'folder' | 'reference';
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphConnection {
  id: string;
  source_id: string;
  target_id: string;
  connection_type: 'similarity' | 'tag' | 'folder' | 'reference';
  weight: number;
  created_at: string;
  user_id: string;
}

export interface GraphSettings {
  showSimilarityConnections: boolean;
  showTagConnections: boolean;
  showFolderConnections: boolean;
  showReferenceConnections: boolean;
  similarityThreshold: number;
  maxConnections: number;
  nodeSize: 'small' | 'medium' | 'large';
  layoutType: 'force' | 'circular' | 'hierarchical';
}

export interface GraphFilters {
  nodeTypes: ('memory' | 'file' | 'folder')[];
  tags: string[];
  folders: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}