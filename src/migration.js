// Migration function to add file metadata support
// Run this in the browser console after logging in

export async function applyFileMetadataMigration() {
  const { supabase } = window;
  
  if (!supabase) {
    console.error('Supabase client not found. Make sure you are on the app page.');
    return;
  }

  console.log('🔄 Starting file metadata migration...');

  try {
    // Step 1: Add description column
    console.log('Adding description column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE files ADD COLUMN IF NOT EXISTS description text;'
    });

    // Step 2: Add tags column
    console.log('Adding tags column...');
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE files ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';`
    });

    // Step 3: Add embedding column
    console.log('Adding embedding column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE files ADD COLUMN IF NOT EXISTS embedding vector(1536);'
    });

    // Step 4: Create indexes
    console.log('Creating indexes...');
    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS files_embedding_idx ON files USING ivfflat (embedding vector_cosine_ops);'
    });

    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS files_tags_idx ON files USING gin(tags);'
    });

    await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS files_text_search_idx ON files USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));`
    });

    // Step 5: Create search function
    console.log('Creating search function...');
    const searchFunction = `
      CREATE OR REPLACE FUNCTION search_files(
        query_embedding vector(1536),
        similarity_threshold float DEFAULT 0.7,
        match_count int DEFAULT 10
      )
      RETURNS TABLE (
        id uuid,
        name text,
        description text,
        tags text[],
        file_path text,
        file_type text,
        file_size integer,
        created_at timestamptz,
        user_id uuid,
        similarity float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          f.id,
          f.name,
          f.description,
          f.tags,
          f.file_path,
          f.file_type,
          f.file_size,
          f.created_at,
          f.user_id,
          (1 - (f.embedding <=> query_embedding)) as similarity
        FROM files f
        WHERE 
          f.user_id = auth.uid()
          AND f.embedding IS NOT NULL
          AND (1 - (f.embedding <=> query_embedding)) > similarity_threshold
        ORDER BY f.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `;

    await supabase.rpc('exec_sql', { sql: searchFunction });

    console.log('✅ Migration completed successfully!');
    console.log('You can now upload files with metadata and search them using embeddings.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Auto-run the migration if called directly
if (typeof window !== 'undefined') {
  // Add to window for easy access
  window.applyFileMetadataMigration = applyFileMetadataMigration;
  console.log('Migration function loaded. Run applyFileMetadataMigration() to apply the migration.');
}
