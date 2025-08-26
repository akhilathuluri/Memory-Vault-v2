-- Create memory_locations table
CREATE TABLE IF NOT EXISTS memory_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    address TEXT,
    city TEXT,
    country TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_locations_memory_id ON memory_locations(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_locations_coordinates ON memory_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_memory_locations_city ON memory_locations(city);
CREATE INDEX IF NOT EXISTS idx_memory_locations_recorded_at ON memory_locations(recorded_at);

-- Create spatial index for efficient location queries (if PostGIS is available)
-- Note: This will only work if PostGIS extension is enabled
DO $$
BEGIN
    -- Try to create a spatial column and index
    BEGIN
        ALTER TABLE memory_locations ADD COLUMN IF NOT EXISTS location_point GEOMETRY(POINT, 4326);
        
        -- Create trigger to automatically update the spatial column
        CREATE OR REPLACE FUNCTION update_location_point()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
            RETURN NEW;
        END
        $func$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS trigger_update_location_point ON memory_locations;
        CREATE TRIGGER trigger_update_location_point
            BEFORE INSERT OR UPDATE ON memory_locations
            FOR EACH ROW
            EXECUTE FUNCTION update_location_point();
            
        -- Create spatial index
        CREATE INDEX IF NOT EXISTS idx_memory_locations_spatial ON memory_locations USING GIST(location_point);
        
    EXCEPTION WHEN OTHERS THEN
        -- PostGIS not available, skip spatial features
        NULL;
    END;
END
$$;

-- Enable Row Level Security
ALTER TABLE memory_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own memory locations" ON memory_locations
    FOR SELECT USING (
        memory_id IN (
            SELECT id FROM memories WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own memory locations" ON memory_locations
    FOR INSERT WITH CHECK (
        memory_id IN (
            SELECT id FROM memories WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own memory locations" ON memory_locations
    FOR UPDATE USING (
        memory_id IN (
            SELECT id FROM memories WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own memory locations" ON memory_locations
    FOR DELETE USING (
        memory_id IN (
            SELECT id FROM memories WHERE user_id = auth.uid()
        )
    );

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(11, 8)
) RETURNS DECIMAL(8, 3) AS $$
DECLARE
    earth_radius CONSTANT DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    
    a := SIN(dlat/2) * SIN(dlat/2) + 
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
         SIN(dlon/2) * SIN(dlon/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to find memories within radius
CREATE OR REPLACE FUNCTION find_memories_within_radius(
    center_lat DECIMAL(10, 8),
    center_lon DECIMAL(11, 8),
    radius_km DECIMAL(8, 3) DEFAULT 1.0,
    user_uuid UUID DEFAULT auth.uid()
) RETURNS TABLE (
    memory_id UUID,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    tags TEXT[],
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    city TEXT,
    country TEXT,
    distance_km DECIMAL(8, 3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.content,
        m.created_at,
        m.tags,
        ml.latitude,
        ml.longitude,
        ml.address,
        ml.city,
        ml.country,
        calculate_distance(center_lat, center_lon, ml.latitude, ml.longitude) as distance_km
    FROM memories m
    JOIN memory_locations ml ON m.id = ml.memory_id
    WHERE m.user_id = user_uuid
    AND calculate_distance(center_lat, center_lon, ml.latitude, ml.longitude) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search memories by place name
CREATE OR REPLACE FUNCTION search_memories_by_place(
    place_name TEXT,
    user_uuid UUID DEFAULT auth.uid()
) RETURNS TABLE (
    memory_id UUID,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    tags TEXT[],
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    city TEXT,
    country TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.content,
        m.created_at,
        m.tags,
        ml.latitude,
        ml.longitude,
        ml.address,
        ml.city,
        ml.country
    FROM memories m
    JOIN memory_locations ml ON m.id = ml.memory_id
    WHERE m.user_id = user_uuid
    AND (
        ml.city ILIKE '%' || place_name || '%' OR
        ml.address ILIKE '%' || place_name || '%' OR
        ml.country ILIKE '%' || place_name || '%'
    )
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger for memory_locations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_memory_locations_updated_at ON memory_locations;
CREATE TRIGGER update_memory_locations_updated_at
    BEFORE UPDATE ON memory_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON memory_locations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated;
GRANT EXECUTE ON FUNCTION find_memories_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION search_memories_by_place TO authenticated;