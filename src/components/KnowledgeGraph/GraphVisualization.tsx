import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Focus } from 'lucide-react';
import { GraphData, GraphNode } from '../../types/knowledgeGraph';

interface GraphVisualizationProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  selectedNode?: GraphNode | null;
  width?: number;
  height?: number;
}

interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

interface SimulationEdge {
  id: string;
  source: SimulationNode;
  target: SimulationNode;
  weight: number;
  type: 'similarity' | 'tag' | 'folder' | 'reference';
  label?: string;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  onNodeClick,
  onNodeHover,
  selectedNode,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [edges, setEdges] = useState<SimulationEdge[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isMultiTouch, setIsMultiTouch] = useState(false);

  // Restart simulation with better layout
  const restartSimulation = useCallback(() => {
    if (!simulation || !data) return;
    
    // Reset all node positions and constraints
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.25;
      node.x = width / 2 + Math.cos(angle) * radius;
      node.y = height / 2 + Math.sin(angle) * radius;
      node.fx = null;
      node.fy = null;
      node.vx = 0;
      node.vy = 0;
    });
    
    simulation.alpha(1).restart();
  }, [simulation, nodes, data, width, height]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Focus on selected node
  const focusOnNode = useCallback((node: SimulationNode) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const newPanX = centerX - node.x;
    const newPanY = centerY - node.y;
    
    setPan({ x: newPanX, y: newPanY });
    setZoom(1.5);
  }, [width, height]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate optimal forces based on graph size
  const calculateForces = useCallback((nodeCount: number, edgeCount: number) => {
    const density = edgeCount / Math.max(nodeCount * (nodeCount - 1) / 2, 1);
    
    return {
      linkDistance: Math.max(50, Math.min(150, 100 - density * 50)),
      chargeStrength: Math.max(-800, -200 - nodeCount * 10),
      collisionRadius: Math.max(25, Math.min(50, 30 + nodeCount / 10)),
      centerStrength: Math.max(0.1, Math.min(1, 0.3 + density * 0.5))
    };
  }, []);

  // Initialize D3 simulation with improved parameters
  useEffect(() => {
    if (!data || !svgRef.current || data.nodes.length === 0) return;

    // Import D3 dynamically to avoid SSR issues
    import('d3-force').then((d3Force) => {
      // Create simulation nodes with better initial positioning
      const simulationNodes: SimulationNode[] = data.nodes.map((node, index) => {
        // Use circular initial layout for better distribution
        const angle = (index / data.nodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.3;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          index
        };
      });

      // Create simulation edges
      const simulationEdges: SimulationEdge[] = data.edges.map(edge => {
        const source = simulationNodes.find(n => n.id === edge.source);
        const target = simulationNodes.find(n => n.id === edge.target);
        if (!source || !target) {
          console.warn('Edge references non-existent node:', edge);
          return null;
        }
        return {
          id: edge.id,
          source,
          target,
          weight: edge.weight,
          type: edge.type,
          label: edge.label
        };
      }).filter(Boolean) as SimulationEdge[];

      // Calculate optimal force parameters
      const forces = calculateForces(simulationNodes.length, simulationEdges.length);

      // Create simulation with better spacing and readability
      const sim = d3Force.forceSimulation(simulationNodes)
        .force('link', d3Force.forceLink(simulationEdges)
          .id((d: any) => d.id)
          .distance(80) // Fixed distance for better readability
          .strength(0.6)
        )
        .force('charge', d3Force.forceManyBody()
          .strength(-400) // Stronger repulsion for better spacing
          .distanceMax(300)
        )
        .force('center', d3Force.forceCenter(width / 2, height / 2)
          .strength(0.2)
        )
        .force('collision', d3Force.forceCollide()
          .radius(25) // Fixed collision radius
          .strength(0.8)
        )
        .force('x', d3Force.forceX(width / 2).strength(0.05))
        .force('y', d3Force.forceY(height / 2).strength(0.05));

      // Optimize simulation parameters
      sim.alpha(1)
        .alphaDecay(0.02)
        .alphaMin(0.001)
        .velocityDecay(0.4);

      let tickCount = 0;
      sim.on('tick', () => {
        tickCount++;
        // Constrain nodes to viewport with padding
        const padding = 50;
        simulationNodes.forEach(node => {
          node.x = Math.max(padding, Math.min(width - padding, node.x));
          node.y = Math.max(padding, Math.min(height - padding, node.y));
        });

        setNodes([...simulationNodes]);
        setEdges([...simulationEdges]);

        // Auto-stop after reasonable number of ticks for performance
        if (tickCount > 300) {
          sim.stop();
        }
      });

      setSimulation(sim);
      setNodes(simulationNodes);
      setEdges(simulationEdges);

      return () => {
        sim.stop();
      };
    }).catch((error) => {
      console.error('Failed to load D3 force simulation:', error);
    });
  }, [data, width, height, calculateForces]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target !== document.body) return; // Only when not in input fields
      
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
          event.preventDefault();
          handleResetView();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          restartSimulation();
          break;
        case 'f':
        case 'F':
          if (selectedNode) {
            event.preventDefault();
            focusOnNode(selectedNode as SimulationNode);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleZoomIn, handleZoomOut, handleResetView, restartSimulation, selectedNode, focusOnNode]);

  // Enhanced drag behavior with touch support
  const handleNodeMouseDown = useCallback((node: SimulationNode, event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    
    if (!simulation) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      node.fx = x;
      node.fy = y;
      simulation.alpha(0.3).restart();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [simulation]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch - potential drag
      setTouchStart({ x: touches[0].clientX, y: touches[0].clientY });
      setIsMultiTouch(false);
    } else if (touches.length === 2) {
      // Multi-touch - zoom gesture
      setIsMultiTouch(true);
      const distance = Math.sqrt(
        Math.pow(touches[0].clientX - touches[1].clientX, 2) +
        Math.pow(touches[0].clientY - touches[1].clientY, 2)
      );
      setLastTouchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent scrolling
    const touches = event.touches;
    
    if (touches.length === 2 && isMultiTouch && lastTouchDistance) {
      // Pinch to zoom
      const distance = Math.sqrt(
        Math.pow(touches[0].clientX - touches[1].clientX, 2) +
        Math.pow(touches[0].clientY - touches[1].clientY, 2)
      );
      
      const scale = distance / lastTouchDistance;
      setZoom(prev => Math.max(0.3, Math.min(3, prev * scale)));
      setLastTouchDistance(distance);
    } else if (touches.length === 1 && touchStart && !isMultiTouch) {
      // Pan gesture
      const deltaX = touches[0].clientX - touchStart.x;
      const deltaY = touches[0].clientY - touchStart.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setTouchStart({ x: touches[0].clientX, y: touches[0].clientY });
    }
  }, [touchStart, lastTouchDistance, isMultiTouch]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setLastTouchDistance(null);
    setIsMultiTouch(false);
  }, []);

  // Touch drag for nodes
  const handleNodeTouchStart = useCallback((node: SimulationNode, event: React.TouchEvent) => {
    event.stopPropagation();
    if (!simulation) return;
    
    const touch = event.touches[0];
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = touch.clientX - rect.left;
    const startY = touch.clientY - rect.top;
    
    node.fx = startX;
    node.fy = startY;
    simulation.alpha(0.3).restart();
  }, [simulation]);

  const handleNodeClick = (node: SimulationNode, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isDragging) return;
    
    onNodeClick?.(node);
    
    // Pin/unpin node on double click
    if (event.detail === 2 && simulation) {
      if (node.fx !== null && node.fx !== undefined) {
        node.fx = null;
        node.fy = null;
      } else {
        node.fx = node.x;
        node.fy = node.y;
      }
      simulation.alpha(0.3).restart();
    }
  };

  const handleNodeMouseEnter = (node: SimulationNode, event: React.MouseEvent) => {
    if (!isDragging && !isMobile) { // Disable hover on mobile
      setHoveredNode(node);
      onNodeHover?.(node);
      
      // Show tooltip
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
        setTooltipContent(`${node.title} (${node.type})`);
        setShowTooltip(true);
      }
    }
  };

  const handleNodeMouseLeave = () => {
    if (!isDragging && !isMobile) {
      setHoveredNode(null);
      onNodeHover?.(null);
      setShowTooltip(false);
    }
  };

  // Mobile-specific node interaction
  const handleNodeTouch = (node: SimulationNode) => {
    if (selectedNode?.id === node.id) {
      // Double tap to pin/unpin
      if (node.fx !== null && node.fx !== undefined) {
        node.fx = null;
        node.fy = null;
      } else {
        node.fx = node.x;
        node.fy = node.y;
      }
      simulation?.alpha(0.3).restart();
    } else {
      // Single tap to select
      onNodeClick?.(node);
    }
  };

  const getNodeColor = (node: SimulationNode) => {
    if (selectedNode?.id === node.id) return '#EF4444';
    if (hoveredNode?.id === node.id) return '#F59E0B';
    
    // Enhanced colors based on node type
    switch (node.type) {
      case 'memory': return '#3B82F6';
      case 'file': return '#10B981';
      case 'folder': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getNodeSize = (node: SimulationNode) => {
    const baseSize = isMobile ? 16 : 12; // Larger on mobile for touch
    const connectionCount = edges.filter(e => 
      e.source.id === node.id || e.target.id === node.id
    ).length;
    
    // Minimal size scaling - keep nodes small and readable
    const minSize = isMobile ? 12 : 8;
    const maxSize = isMobile ? 24 : 18;
    return Math.max(minSize, Math.min(maxSize, baseSize + connectionCount * 1));
  };

  const getEdgeOpacity = (edge: SimulationEdge) => {
    if (!hoveredNode && !selectedNode) return 0.6; // Always visible
    
    const relevantNode = hoveredNode || selectedNode;
    if (relevantNode && (edge.source.id === relevantNode.id || edge.target.id === relevantNode.id)) {
      return 1.0; // Full opacity for connected edges
    }
    
    return 0.3; // Dimmed but still visible
  };

  const getEdgeWidth = (edge: SimulationEdge) => {
    const relevantNode = hoveredNode || selectedNode;
    const isHighlighted = relevantNode && (edge.source.id === relevantNode.id || edge.target.id === relevantNode.id);
    
    // Thinner lines, with slight emphasis on hover
    return isHighlighted ? 2 : 1;
  };

  const getEdgeColor = (edge: SimulationEdge) => {
    const relevantNode = hoveredNode || selectedNode;
    const isHighlighted = relevantNode && (edge.source.id === relevantNode.id || edge.target.id === relevantNode.id);
    
    const baseColors = {
      similarity: '#3B82F6',
      tag: '#10B981', 
      folder: '#F59E0B',
      reference: '#8B5CF6'
    };
    
    const color = baseColors[edge.type] || '#6B7280';
    return isHighlighted ? color : '#94A3B8'; // Neutral gray when not highlighted
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-white rounded-lg border border-gray-200 overflow-hidden shadow-inner">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full touch-none" // Prevent default touch behaviors
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${width / zoom} ${height / zoom}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background pattern */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" opacity="0.5"/>
          </pattern>
          
          {/* Glow filter for selected nodes */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges */}
        <g className="edges">
          {edges.map((edge) => (
            <g key={edge.id}>
              {/* Main edge - clean and simple */}
              <line
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={getEdgeColor(edge)}
                strokeWidth={getEdgeWidth(edge)}
                strokeOpacity={getEdgeOpacity(edge)}
                className="transition-all duration-200"
                strokeDasharray={edge.type === 'reference' ? '3,3' : 'none'}
                strokeLinecap="round"
              />
              
              {/* Edge label on hover - smaller and cleaner */}
              {(hoveredNode?.id === edge.source.id || hoveredNode?.id === edge.target.id) && edge.label && (
                <g>
                  {/* Label background */}
                  <rect
                    x={(edge.source.x + edge.target.x) / 2 - 25}
                    y={(edge.source.y + edge.target.y) / 2 - 8}
                    width="50"
                    height="16"
                    fill="rgba(255,255,255,0.9)"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="0.5"
                    rx="8"
                    className="pointer-events-none"
                  />
                  <text
                    x={(edge.source.x + edge.target.x) / 2}
                    y={(edge.source.y + edge.target.y) / 2 + 3}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize="9"
                    className="pointer-events-none select-none font-medium"
                  >
                    {edge.type}
                  </text>
                </g>
              )}
            </g>
          ))}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {nodes.map((node) => {
            const nodeSize = getNodeSize(node);
            const isHighlighted = hoveredNode?.id === node.id || selectedNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            
            return (
              <g key={node.id}>
                {/* Node outer ring for selection */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize + 4}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}
                
                {/* Main node - clean and minimal */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeSize}
                  fill={getNodeColor(node)}
                  stroke="#fff"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200 hover:stroke-4"
                  onClick={isMobile ? () => handleNodeTouch(node) : (e) => handleNodeClick(node, e)}
                  onMouseDown={isMobile ? undefined : (e) => handleNodeMouseDown(node, e)}
                  onTouchStart={isMobile ? (e) => handleNodeTouchStart(node, e) : undefined}
                  onMouseEnter={isMobile ? undefined : (e) => handleNodeMouseEnter(node, e)}
                  onMouseLeave={isMobile ? undefined : handleNodeMouseLeave}
                  style={{
                    filter: isHighlighted ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                  }}
                />
                
                {/* Simple node indicator instead of emoji */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeSize * 0.4}
                  fill="rgba(255,255,255,0.8)"
                  className="pointer-events-none"
                />
                
                {/* Node type indicator */}
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={getNodeColor(node)}
                  fontSize="8"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {node.type === 'memory' ? 'M' : node.type === 'file' ? 'F' : 'D'}
                </text>
                
                {/* Compact node label */}
                {isHighlighted && (
                  <g>
                    {/* Compact label background */}
                    <rect
                      x={node.x - 40}
                      y={node.y + nodeSize + 6}
                      width="80"
                      height="16"
                      fill="rgba(255,255,255,0.95)"
                      stroke="rgba(0,0,0,0.15)"
                      strokeWidth="0.5"
                      rx="8"
                      className="pointer-events-none"
                    />
                    
                    {/* Compact label text */}
                    <text
                      x={node.x}
                      y={node.y + nodeSize + 15}
                      textAnchor="middle"
                      fill="#374151"
                      fontSize="10"
                      className="pointer-events-none select-none font-medium"
                    >
                      {node.title.length > 12 ? `${node.title.substring(0, 12)}...` : node.title}
                    </text>
                  </g>
                )}
                
                {/* Minimal pin indicator */}
                {node.fx !== null && node.fx !== undefined && (
                  <circle
                    cx={node.x + nodeSize * 0.6}
                    cy={node.y - nodeSize * 0.6}
                    r="2"
                    fill="#EF4444"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Responsive Legend */}
      <div className={`absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg ${
        isMobile ? 'p-2' : 'p-3'
      }`}>
        <h4 className={`font-semibold text-gray-900 mb-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>
          {isMobile ? 'Key' : 'Legend'}
        </h4>
        
        {/* Node Types - Mobile Optimized */}
        <div className={`space-y-1 mb-3 ${isMobile ? 'text-xs' : 'text-xs'}`}>
          <div className="flex items-center space-x-2">
            <div className={`rounded-full bg-blue-500 flex items-center justify-center ${
              isMobile ? 'w-4 h-4' : 'w-3 h-3'
            }`}>
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-gray-700">Memory</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`rounded-full bg-green-500 flex items-center justify-center ${
              isMobile ? 'w-4 h-4' : 'w-3 h-3'
            }`}>
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-gray-700">File</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`rounded-full bg-yellow-500 flex items-center justify-center ${
              isMobile ? 'w-4 h-4' : 'w-3 h-3'
            }`}>
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <span className="text-gray-700">Folder</span>
          </div>
        </div>
        
        {/* Connection Types - Mobile Optimized */}
        {!isMobile && (
          <div className="pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-blue-500"></div>
                <span className="text-gray-600">Similar</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span className="text-gray-600">Tags</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-yellow-500"></div>
                <span className="text-gray-600">Folder</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-purple-500" style={{background: 'repeating-linear-gradient(to right, #8B5CF6 0, #8B5CF6 2px, transparent 2px, transparent 4px)'}}></div>
                <span className="text-gray-600">Ref</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-Responsive Instructions */}
      <div className={`absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg ${
        isMobile ? 'p-2' : 'p-2'
      }`}>
        <div className="text-xs text-gray-700 space-y-1">
          {isMobile ? (
            <>
              <div>Tap: Select • Drag: Move • Double-tap: Pin</div>
              <div>Pinch: Zoom • Two fingers: Pan</div>
            </>
          ) : (
            <>
              <div>Click: Select • Drag: Move • Double-click: Pin</div>
              <div>Keys: +/- Zoom • R Restart • F Focus</div>
            </>
          )}
        </div>
      </div>

      {/* Mobile-Optimized Graph Stats */}
      {(hoveredNode || selectedNode) && (
        <div className={`absolute bg-white bg-opacity-95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg ${
          isMobile ? 'top-4 left-4 right-4 p-2' : 'top-4 left-4 p-3'
        }`}>
          <div className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-xs'}`}>
            <div className="font-medium mb-1">
              {(hoveredNode || selectedNode)?.title}
            </div>
            <div className={`text-gray-500 ${isMobile ? 'flex justify-between' : ''}`}>
              <span>Type: {(hoveredNode || selectedNode)?.type}</span>
              <span>
                Connections: {edges.filter(e => 
                  e.source.id === (hoveredNode || selectedNode)?.id || 
                  e.target.id === (hoveredNode || selectedNode)?.id
                ).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-Optimized Control Panel */}
      <div className={`absolute bottom-4 right-4 ${isMobile ? 'flex flex-row space-x-2' : 'flex flex-col space-y-2'}`}>
        {/* Zoom Controls */}
        <div className={`flex bg-white bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg ${
          isMobile ? 'flex-row space-x-1 p-1' : 'space-x-1 p-1'
        }`}>
          <button
            onClick={handleZoomIn}
            className={`hover:bg-gray-100 rounded transition-colors ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            }`}
            title="Zoom In"
          >
            <ZoomIn className={`text-gray-600 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </button>
          <button
            onClick={handleZoomOut}
            className={`hover:bg-gray-100 rounded transition-colors ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className={`text-gray-600 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </button>
          <button
            onClick={handleResetView}
            className={`hover:bg-gray-100 rounded transition-colors ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            }`}
            title="Reset View"
          >
            <Maximize2 className={`text-gray-600 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </button>
        </div>

        {/* Layout Controls */}
        <div className={`flex bg-white bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg ${
          isMobile ? 'flex-row space-x-1 p-1' : 'space-x-1 p-1'
        }`}>
          <button
            onClick={restartSimulation}
            className={`hover:bg-gray-100 rounded transition-colors ${
              isMobile ? 'p-3 touch-manipulation' : 'p-2'
            }`}
            title="Restart Layout"
          >
            <RefreshCw className={`text-gray-600 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </button>
          {selectedNode && (
            <button
              onClick={() => focusOnNode(selectedNode as SimulationNode)}
              className={`hover:bg-gray-100 rounded transition-colors ${
                isMobile ? 'p-3 touch-manipulation' : 'p-2'
              }`}
              title="Focus on Selected"
            >
              <Focus className={`text-gray-600 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Tooltip - Desktop Only */}
      {showTooltip && !isMobile && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50"
          style={{
            left: tooltipPos.x + 10,
            top: tooltipPos.y - 30,
            transform: tooltipPos.x > width - 100 ? 'translateX(-100%)' : 'none'
          }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Zoom Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-1 border border-gray-200 shadow-sm">
        <span className="text-xs text-gray-600">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Mini Map - Desktop Only */}
      {nodes.length > 15 && !isMobile && (
        <div className="absolute top-16 right-4 w-24 h-18 bg-white bg-opacity-90 backdrop-blur-sm rounded border border-gray-200 shadow-sm overflow-hidden">
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Mini nodes - very small */}
            {nodes.map((node) => (
              <circle
                key={`mini-${node.id}`}
                cx={node.x}
                cy={node.y}
                r="1"
                fill={getNodeColor(node)}
                opacity="0.8"
              />
            ))}
            
            {/* Mini edges - minimal */}
            {edges.slice(0, 10).map((edge) => (
              <line
                key={`mini-edge-${edge.id}`}
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke="#ddd"
                strokeWidth="0.3"
                opacity="0.6"
              />
            ))}
          </svg>
        </div>
      )}

      {/* Performance Stats */}
      {nodes.length > 50 && (
        <div className="absolute bottom-20 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
          <div className="flex items-center space-x-1">
            <span>⚡</span>
            <span>Large graph detected</span>
          </div>
          <div className="text-yellow-600">
            Performance mode active
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;