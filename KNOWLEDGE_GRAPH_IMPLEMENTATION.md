# 🕸️ Knowledge Graph Implementation

## Overview
The Knowledge Graph feature visualizes connections between memories, files, and folders in your Memory Vault, creating an interactive network that reveals hidden relationships and patterns in your knowledge.

## ✨ Features

### 🎯 **Smart Connection Detection**
- **Similarity Connections**: AI-powered semantic similarity using embeddings
- **Tag Connections**: Shared tags between memories and files
- **Folder Connections**: Items within the same organizational folder
- **Reference Connections**: When memories reference other memories by title

### 🎨 **Interactive Visualization**
- **Force-Directed Layout**: Nodes naturally arrange based on connections
- **Node Types**: Visual distinction between memories (📝), files (📄), and folders (📁)
- **Connection Types**: Color-coded edges showing relationship types
- **Interactive Controls**: Click, drag, pin, and explore nodes

### ⚙️ **Customizable Settings**
- **Connection Filters**: Toggle different connection types on/off
- **Similarity Threshold**: Adjust how similar items need to be to connect
- **Node Size**: Small, medium, or large node display
- **Max Connections**: Limit connections for cleaner visualization

### 🔍 **Advanced Filtering**
- **Node Type Filter**: Show only memories, files, or folders
- **Tag Filter**: Focus on specific tags
- **Date Range**: Filter by creation date
- **Folder Filter**: Limit to specific folders

## 🏗️ **Architecture**

### **Modular Components**
```
src/components/KnowledgeGraph/
├── KnowledgeGraphView.tsx      # Main container component
├── GraphVisualization.tsx      # D3.js force simulation
├── GraphControls.tsx           # Settings and filters UI
├── NodeDetails.tsx             # Node information modal
├── GraphPreview.tsx            # Dashboard preview widget
└── index.ts                    # Clean exports
```

### **Service Layer**
```
src/services/knowledgeGraphService.ts
- Graph data generation
- Connection algorithms
- Caching and performance
- Database persistence
```

### **State Management**
```
src/stores/knowledgeGraphStore.ts
- Graph data state
- Settings and filters
- Loading states
- User interactions
```

### **Type Definitions**
```
src/types/knowledgeGraph.ts
- GraphNode, GraphEdge interfaces
- Settings and filters types
- Database connection types
```

## 🗄️ **Database Schema**

### **New Table: `graph_connections`**
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- source_id: UUID (Source node ID)
- target_id: UUID (Target node ID)
- connection_type: ENUM ('similarity', 'tag', 'folder', 'reference')
- weight: DECIMAL (Connection strength 0-1)
- created_at: TIMESTAMP
```

### **Security & Performance**
- **Row Level Security**: Users only see their own connections
- **Optimized Indexes**: Fast queries on user_id, source_id, target_id
- **Unique Constraints**: Prevent duplicate connections

## 🚀 **Usage Guide**

### **Accessing the Graph**
1. **Navigation**: Click "Knowledge Graph" in the sidebar
2. **Dashboard Preview**: Quick stats and access from dashboard
3. **Direct URL**: `/knowledge-graph`

### **Exploring Connections**
1. **View Graph**: Automatic layout of your content
2. **Interact**: Click nodes to select, drag to move
3. **Pin Nodes**: Double-click to pin/unpin nodes
4. **Node Details**: Click selected nodes for more info

### **Customizing the View**
1. **Settings Panel**: Click settings icon for options
2. **Filter Panel**: Click filter icon to narrow focus
3. **Connection Types**: Toggle similarity, tags, folders, references
4. **Similarity Threshold**: Adjust from 10% to 100%

### **Fullscreen Mode**
- Click fullscreen icon for immersive exploration
- Better for large graphs with many connections
- All controls remain available

## 🎯 **Connection Algorithms**

### **Similarity Connections**
```typescript
// Uses cosine similarity on embeddings
similarity = dotProduct(embedding1, embedding2) / 
            (norm(embedding1) * norm(embedding2))

// Threshold filtering (default 70%)
if (similarity >= threshold) {
  createConnection(memory1, memory2, similarity)
}
```

### **Tag Connections**
```typescript
// Jaccard similarity for shared tags
commonTags = intersection(tags1, tags2)
weight = commonTags.length / union(tags1, tags2).length
```

### **Reference Detection**
```typescript
// Simple text matching for memory titles
if (memory1.content.includes(memory2.title.toLowerCase())) {
  createConnection(memory1, memory2, 'reference')
}
```

## 📊 **Performance Optimizations**

### **Caching Strategy**
- **5-minute cache**: Graph data cached per user
- **Smart invalidation**: Cache cleared on content changes
- **Background refresh**: Updates when cache nears expiration

### **Connection Limits**
- **Default max**: 100 connections for performance
- **Configurable**: Users can adjust 10-500 connections
- **Smart sorting**: Highest weight connections prioritized

### **Lazy Loading**
- **On-demand calculation**: Connections calculated when needed
- **Progressive enhancement**: Basic graph loads first
- **Background processing**: Complex calculations in background

## 🎨 **Visual Design**

### **Node Colors**
- **Memories**: Blue (#3B82F6) - Primary content
- **Files**: Green (#10B981) - Supporting materials  
- **Folders**: Yellow (#F59E0B) - Organization

### **Edge Colors**
- **Similarity**: Blue - AI-detected relationships
- **Tags**: Green - User-defined categories
- **Folders**: Yellow - Organizational structure
- **References**: Purple - Content relationships

### **Interactive States**
- **Default**: Semi-transparent edges, standard nodes
- **Hover**: Highlighted node, related edges emphasized
- **Selected**: Red node, connected edges highlighted
- **Pinned**: Fixed position, visual indicator

## 🔧 **Technical Implementation**

### **D3.js Force Simulation**
```typescript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width/2, height/2))
  .force('collision', d3.forceCollide().radius(35))
```

### **React Integration**
- **useEffect**: Manages D3 lifecycle
- **useState**: Tracks simulation state
- **Event Handlers**: Bridge D3 events to React

### **Performance Monitoring**
- **Render time**: Track graph generation speed
- **Memory usage**: Monitor large graph performance
- **User interactions**: Optimize for responsiveness

## 🚀 **Future Enhancements**

### **Advanced Algorithms**
- **Community Detection**: Identify clusters of related content
- **Centrality Measures**: Find most important/connected nodes
- **Path Finding**: Shortest paths between concepts

### **Enhanced Visualizations**
- **3D Graph**: Three-dimensional exploration
- **Timeline View**: Temporal connections
- **Hierarchical Layout**: Tree-based organization

### **AI-Powered Features**
- **Concept Extraction**: Automatic concept identification
- **Relationship Suggestions**: AI-suggested connections
- **Knowledge Gaps**: Identify missing connections

## 📈 **Benefits**

### **For Users**
- **Discover Connections**: Find unexpected relationships
- **Visual Learning**: See knowledge structure
- **Navigation Aid**: Visual way to explore content
- **Pattern Recognition**: Identify knowledge clusters

### **For Knowledge Management**
- **Content Organization**: Visual feedback on structure
- **Gap Analysis**: See disconnected content
- **Relationship Mapping**: Understand content relationships
- **Exploration Tool**: New way to browse memories

## 🎊 **Ready to Explore!**

Your Memory Vault now includes a powerful Knowledge Graph that:
- ✅ Visualizes connections between all your content
- ✅ Uses AI to detect semantic relationships  
- ✅ Provides interactive exploration tools
- ✅ Integrates seamlessly with existing features
- ✅ Maintains performance with smart caching
- ✅ Offers customizable views and filters

**Next Steps**:
1. Run the database migration: `node apply_knowledge_graph_migration.js`
2. Create some memories with shared tags
3. Visit the Knowledge Graph page
4. Explore the connections in your knowledge!

The graph becomes more interesting as you add more content with embeddings and shared tags. Start building your knowledge network today! 🚀