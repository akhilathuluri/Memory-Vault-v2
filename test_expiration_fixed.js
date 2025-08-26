// Simple test for the fixed expiration feature
// Run this in the browser console after the app loads

async function testExpirationFixed() {
  console.log('🧪 Testing Fixed Expiration Feature...');
  
  try {
    // Test 1: Check if services are available
    console.log('1. Checking if services are available...');
    
    if (window.MemoryExpirationService && window.useMemoryStore) {
      console.log('✅ Services are available in development mode');
    } else {
      console.log('⚠️ Services not exposed (might be production mode)');
    }
    
    // Test 2: Test the fixed cleanup function
    console.log('2. Testing fixed cleanup function...');
    
    const { data, error } = await supabase.rpc('cleanup_expired_memories');
    
    if (error) {
      console.error('❌ Cleanup function still has errors:', error);
      return;
    }
    
    console.log('✅ Cleanup function works! Deleted:', data, 'memories');
    
    // Test 3: Create a test memory that expires immediately
    console.log('3. Creating immediately expiring test memory...');
    
    const { data: testMemory, error: createError } = await supabase
      .from('memories')
      .insert([{
        title: 'Test Auto-Delete Memory',
        content: 'This memory should be deleted immediately by the cleanup',
        tags: ['test', 'auto-delete'],
        auto_delete_enabled: true,
        expires_at: new Date(Date.now() - 1000).toISOString() // Already expired
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create test memory:', createError);
      return;
    }
    
    console.log('✅ Created test memory:', testMemory.title);
    
    // Test 4: Run cleanup to delete the expired memory
    console.log('4. Running cleanup to delete expired memory...');
    
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_expired_memories');
    
    if (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError);
      return;
    }
    
    console.log('✅ Cleanup successful! Deleted:', cleanupResult, 'memories');
    
    // Test 5: Verify the memory was deleted
    console.log('5. Verifying memory was deleted...');
    
    const { data: checkMemory, error: checkError } = await supabase
      .from('memories')
      .select('*')
      .eq('id', testMemory.id)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Memory was successfully deleted!');
    } else if (checkMemory) {
      console.log('⚠️ Memory still exists:', checkMemory.title);
    } else {
      console.log('❓ Unexpected result:', checkErro