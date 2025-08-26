-- Create graph_connections table for storing knowledge graph relationships
CREATE TABLE IF NOT EXISTS graph_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL,
  target_id UUID NOT NULL,
  connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('similarity', 'tag', 'folder', 'reference')),
  weight DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT graph_connections_source_target_type_unique UNIQUE (source_id, target_id, connection_type),
  CONSTRAINT graph_connections_no_self_reference CHECK (source_id != target_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_graph_connections_user_id ON graph_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_connections_source_id ON graph_connections(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_connections_target_id ON graph_connections(target_id);
CREATE INDEX IF NOT EXISTS idx_graph_connections_type ON graph_connections(connection_type);
CREATE INDEX IF NOT EXISTS idx_graph_connections_weight ON graph_connections(weight);

-- Row Level Security (RLS) policies
ALTER TABLE graph_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view their own graph connections" ON graph_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own connections
CREATE POLICY "Users can create their own graph connections" ON graph_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update their own graph connections" ON graph_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete their own graph connections" ON graph_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON graph_connections TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;