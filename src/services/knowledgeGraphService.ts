import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Memory, FileRecord } from '../types';
import { GraphNode, GraphEdge, GraphData, GraphConnection, GraphSettings, GraphFilters } from '../types/knowledgeGraph';
import { generateEmbedding } from './aiService';
interface GraphCacheEntry<T> {
  data: T;
  timestamp: number;
}

class KnowledgeGraphService {
  private static instance: KnowledgeGraphService;
  private graphCache: Map<string, GraphCacheEntry<GraphData>> = new Map();

  static getInstance(): KnowledgeGraphService {
    if (!KnowledgeGraphService.instance) {
      KnowledgeGraphService.instance = new KnowledgeGraphService();
    }
    return KnowledgeGraphService.instance;
  }

  /**
   * Generate graph data from memories and files
   */
  async generateGraphData(filters?: GraphFilters, settings?: GraphSettings): Promise<GraphData> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const cacheKey = `graph_data_${user.id}_${JSON.stringify(filters)}_${JSON.stringify(settings)}`;
    
    // Try cache first (5 minute expiration for graph data)
    const cached = this.graphCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }

    try {
      // Fetch memories and files
      const [memories, files, folders] = await Promise.all([
        this.fetchFilteredMemories(filters),
        this.fetchFilteredFiles(filters),
        this.fetchFolders()
      ]);

      console.log('📊 Graph data fetched:', {
        memories: memories.length,
        files: files.length,
        folders: folders.length
      });

      // Create nodes
      const nodes = this.createNodes(memories, files, folders, settings);
      
      // Create edges based on connections
      const edges = await this.createEdges(memories, files, nodes, settings);

      const graphData: GraphData = { nodes, edges };
      
      console.log('🕸️ Graph generated:', {
        nodes: nodes.length,
        edges: edges.length
      });
      
      // Cache the result
      this.graphCache.set(cacheKey, {
        data: graphData,
        timestamp: Date.now()
      });
      
      return graphData;
    } catch (error) {
      console.error('Error generating graph data:', error);
      // Return empty graph data instead of throwing
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Calculate similarity connections between memories using embeddings
   */
  async calculateSimilarityConnections(memories: Memory[], threshold: number = 0.7): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];
    
    if (!memories || memories.length === 0) return edges;
    
    // Only calculate if we have embeddings
    const memoriesWithEmbeddings = memories.filter(m => m.embedding && Array.isArray(m.embedding) && m.embedding.length > 0);
    
    console.log('🧠 Calculating similarity for', memoriesWithEmbeddings.length, 'memories with embeddings');
    
    for (let i = 0; i < memoriesWithEmbeddings.length; i++) {
      for (let j = i + 1; j < memoriesWithEmbeddings.length; j++) {
        const memory1 = memoriesWithEmbeddings[i];
        const memory2 = memoriesWithEmbeddings[j];
        
        try {
          const similarity = this.cosineSimilarity(memory1.embedding!, memory2.embedding!);
          
          if (similarity >= threshold) {
            edges.push({
              id: `similarity_${memory1.id}_${memory2.id}`,
              source: memory1.id,
              target: memory2.id,
              weight: similarity,
              type: 'similarity',
              label: `${Math.round(similarity * 100)}% similar`
            });
          }
        } catch (error) {
          console.warn('Error calculating similarity between memories:', error);
        }
      }
    }
    
    console.log('🔗 Generated', edges.length, 'similarity connections');
    return edges;
  }

  /**
   * Create tag-based connections
   */
  createTagConnections(memories: Memory[], files: FileRecord[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    if (!memories && !files) return edges;
    
    const allItems = [...(memories || []), ...(files || [])];
    
    for (let i = 0; i < allItems.length; i++) {
      for (let j = i + 1; j < allItems.length; j++) {
        const item1 = allItems[i];
        const item2 = allItems[j];
        
        if (!item1.tags || !item2.tags || !Array.isArray(item1.tags) || !Array.isArray(item2.tags)) {
          continue;
        }
        
        const commonTags = item1.tags.filter(tag => item2.tags.includes(tag));
        
        if (commonTags.length > 0) {
          const weight = commonTags.length / Math.max(item1.tags.length, item2.tags.length);
          
          edges.push({
            id: `tag_${item1.id}_${item2.id}`,
            source: item1.id,
            target: item2.id,
            weight,
            type: 'tag',
            label: `Tags: ${commonTags.join(', ')}`
          });
        }
      }
    }
    
    console.log('🏷️ Generated', edges.length, 'tag connections');
    return edges;
  }

  /**
   * Create folder-based connections
   */
  createFolderConnections(memories: Memory[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    if (!memories || memories.length === 0) return edges;
    
    const folderGroups = new Map<string, Memory[]>();
    
    // Group memories by folder
    memories.forEach(memory => {
      const folderId = memory.folder_id || 'root';
      if (!folderGroups.has(folderId)) {
        folderGroups.set(folderId, []);
      }
      folderGroups.get(folderId)!.push(memory);
    });
    
    // Create connections within each folder
    folderGroups.forEach((folderMemories, folderId) => {
      if (folderMemories.length > 1) {
        for (let i = 0; i < folderMemories.length; i++) {
          for (let j = i + 1; j < folderMemories.length; j++) {
            edges.push({
              id: `folder_${folderMemories[i].id}_${folderMemories[j].id}`,
              source: folderMemories[i].id,
              target: folderMemories[j].id,
              weight: 0.5,
              type: 'folder',
              label: folderId === 'root' ? 'Same folder' : 'Same folder'
            });
          }
        }
      }
    });
    
    console.log('📁 Generated', edges.length, 'folder connections');
    return edges;
  }

  /**
   * Detect reference connections (when one memory mentions another)
   */
  createReferenceConnections(memories: Memory[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    if (!memories || memories.length === 0) return edges;
    
    memories.forEach(memory => {
      if (!memory.content || !memory.title) return;
      
      const content = memory.content.toLowerCase();
      const title = memory.title.toLowerCase();
      
      memories.forEach(otherMemory => {
        if (memory.id !== otherMemory.id && otherMemory.title) {
          const otherTitle = otherMemory.title.toLowerCase();
          
          // Check if this memory references another by title (only if title is meaningful length)
          if (otherTitle.length > 3 && (content.includes(otherTitle) || title.includes(otherTitle))) {
            edges.push({
              id: `reference_${memory.id}_${otherMemory.id}`,
              source: memory.id,
              target: otherMemory.id,
              weight: 0.8,
              type: 'reference',
              label: 'References'
            });
          }
        }
      });
    });
    
    console.log('🔗 Generated', edges.length, 'reference connections');
    return edges;
  }

  /**
   * Save graph connections to database for persistence
   */
  async saveConnections(connections: GraphConnection[]): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const connectionsWithUser = connections.map(conn => ({
      ...conn,
      user_id: user.id
    }));

    const { error } = await supabase
      .from('graph_connections')
      .upsert(connectionsWithUser, { onConflict: 'source_id,target_id,connection_type' });

    if (error) throw error;
  }

  /**
   * Load saved connections from database
   */
  async loadConnections(): Promise<GraphConnection[]> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('graph_connections')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  }

  // Private helper methods
  private async fetchFilteredMemories(filters?: GraphFilters): Promise<Memory[]> {
    try {
      let query = supabase.from('memories').select('*');
      
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      
      if (filters?.folders && filters.folders.length > 0) {
        query = query.in('folder_id', filters.folders);
      }
      
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching memories for graph:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in fetchFilteredMemories:', error);
      return [];
    }
  }

  private async fetchFilteredFiles(filters?: GraphFilters): Promise<FileRecord[]> {
    try {
      if (filters?.nodeTypes && !filters.nodeTypes.includes('file')) {
        return [];
      }
      
      let query = supabase.from('files').select('*');
      
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching files for graph:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in fetchFilteredFiles:', error);
      return [];
    }
  }

  private async fetchFolders(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('memory_folders')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching folders for graph:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in fetchFolders:', error);
      return [];
    }
  }

  private createNodes(memories: Memory[], files: FileRecord[], folders: any[], settings?: GraphSettings): GraphNode[] {
    const nodes: GraphNode[] = [];
    
    // Add memory nodes
    memories.forEach(memory => {
      nodes.push({
        id: memory.id,
        title: memory.title || 'Untitled Memory',
        type: 'memory',
        tags: memory.tags || [],
        folder_id: memory.folder_id,
        size: this.getNodeSize(settings?.nodeSize),
        color: this.getNodeColor('memory')
      });
    });
    
    // Add file nodes
    files.forEach(file => {
      nodes.push({
        id: file.id,
        title: file.name || 'Untitled File',
        type: 'file',
        tags: file.tags || [],
        size: this.getNodeSize(settings?.nodeSize),
        color: this.getNodeColor('file')
      });
    });
    
    // Add folder nodes if they have content
    folders.forEach(folder => {
      const hasMemories = memories.some(m => m.folder_id === folder.id);
      const hasFiles = files.some(f => f.folder_id === folder.id); // If files can be in folders
      
      if (hasMemories || hasFiles) {
        nodes.push({
          id: folder.id,
          title: folder.name || 'Untitled Folder',
          type: 'folder',
          tags: [],
          size: this.getNodeSize(settings?.nodeSize, 'large'),
          color: folder.color || this.getNodeColor('folder')
        });
      }
    });
    
    console.log('📊 Created nodes:', {
      memories: memories.length,
      files: files.length,
      folders: folders.filter(f => memories.some(m => m.folder_id === f.id)).length,
      total: nodes.length
    });
    
    return nodes;
  }

  private async createEdges(memories: Memory[], files: FileRecord[], nodes: GraphNode[], settings?: GraphSettings): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];
    
    if (settings?.showSimilarityConnections !== false) {
      const similarityEdges = await this.calculateSimilarityConnections(
        memories, 
        settings?.similarityThreshold || 0.7
      );
      edges.push(...similarityEdges);
    }
    
    if (settings?.showTagConnections !== false) {
      const tagEdges = this.createTagConnections(memories, files);
      edges.push(...tagEdges);
    }
    
    if (settings?.showFolderConnections !== false) {
      const folderEdges = this.createFolderConnections(memories);
      edges.push(...folderEdges);
    }
    
    if (settings?.showReferenceConnections !== false) {
      const referenceEdges = this.createReferenceConnections(memories);
      edges.push(...referenceEdges);
    }
    
    // Only create basic connections if we have very few connections
    if (edges.length < Math.max(3, nodes.length * 0.2) && nodes.length > 1) {
      const basicEdges = this.createBasicConnections(nodes);
      edges.push(...basicEdges);
    }
    
    // Remove duplicate edges
    const uniqueEdges = this.removeDuplicateEdges(edges);
    
    // Limit connections if specified
    if (settings?.maxConnections && uniqueEdges.length > settings.maxConnections) {
      uniqueEdges.sort((a, b) => b.weight - a.weight);
      return uniqueEdges.slice(0, settings.maxConnections);
    }
    
    console.log('🔗 Total edges created:', uniqueEdges.length);
    return uniqueEdges;
  }

  /**
   * Create basic connections when other methods don't produce enough
   */
  private createBasicConnections(nodes: GraphNode[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    // Connect nodes of the same type
    const nodesByType = new Map<string, GraphNode[]>();
    nodes.forEach(node => {
      if (!nodesByType.has(node.type)) {
        nodesByType.set(node.type, []);
      }
      nodesByType.get(node.type)!.push(node);
    });
    
    nodesByType.forEach((typeNodes, type) => {
      if (typeNodes.length > 1) {
        // Connect first few nodes of each type
        for (let i = 0; i < Math.min(typeNodes.length - 1, 3); i++) {
          edges.push({
            id: `basic_${typeNodes[i].id}_${typeNodes[i + 1].id}`,
            source: typeNodes[i].id,
            target: typeNodes[i + 1].id,
            weight: 0.3,
            type: 'folder', // Use folder type for basic connections
            label: `Same type (${type})`
          });
        }
      }
    });
    
    console.log('🔗 Generated', edges.length, 'basic connections');
    return edges;
  }

  /**
   * Remove duplicate edges
   */
  private removeDuplicateEdges(edges: GraphEdge[]): GraphEdge[] {
    const seen = new Set<string>();
    return edges.filter(edge => {
      const key1 = `${edge.source}_${edge.target}_${edge.type}`;
      const key2 = `${edge.target}_${edge.source}_${edge.type}`;
      
      if (seen.has(key1) || seen.has(key2)) {
        return false;
      }
      
      seen.add(key1);
      return true;
    });
  }

  private getNodeSize(size?: 'small' | 'medium' | 'large', override?: 'small' | 'medium' | 'large'): number {
    const actualSize = override || size || 'medium';
    switch (actualSize) {
      case 'small': return 8;
      case 'large': return 16;
      default: return 12;
    }
  }

  private getNodeColor(type: 'memory' | 'file' | 'folder'): string {
    switch (type) {
      case 'memory': return '#3B82F6';
      case 'file': return '#10B981';
      case 'folder': return '#F59E0B';
      default: return '#6B7280';
    }
  }

  /**
   * Clear graph cache for a user
   */
  clearCache(userId?: string): void {
    if (userId) {
      // Clear cache entries for specific user
      for (const [key] of this.graphCache.entries()) {
        if (key.includes(`graph_data_${userId}_`)) {
          this.graphCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.graphCache.clear();
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export { KnowledgeGraphService };