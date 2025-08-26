// Test script for Self-Destruct Memories feature
// Run this in the browser console after logging in

async function testSelfDestructFeature() {
  console.log('🧪 Testing Self-Destruct Memories Feature...');
  
  try {
    // Test 1: Check if the database functions exist
    console.log('1. Testing database functions...');
    
    const { data: functions, error: funcError } = await supabase
      .rpc('cleanup_expired_memories');
    
    if (funcError) {
      console.error('❌ Database functions not available:', funcError);
      return;
    }
    
    console.log('✅ Database functions working, cleaned up:', functions, 'expired memories');
    
    // Test 2: Create a test memory that expires in 1 minute
    console.log('2. Creating test memory with 1-minute expiration...');
    
    // Create a test memory
    const { data: newMemory, error: createError } = await supabase
      .from('memories')
      .insert([{
        title: 'Test Expiring Memory',
        content: 'This memory should auto-delete in 1 minute for testing',
        tags: ['test', 'expiring'],
        auto_delete_enabled: true,
        expires_at: new Date(Date.now() + 60 * 1000).toISOString() // 1 minute from now
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create test memory:', createError);
      return;
    }
    
    console.log('✅ Created test memory:', newMemory.title, 'expires at:', newMemory.expires_at);
    
    // Test 3: Test manual cleanup
    console.log('3. Testing manual cleanup...');
    
    // Wait a bit then test cleanup
    setTimeout(async () => {
      console.log('⏰ Testing cleanup after 1 minute...');
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_expired_memories');
      
      if (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      } else {
        console.log('✅ Manual cleanup completed:', cleanupResult, 'memories deleted');
      }
    }, 65000); // Wait 65 seconds
    
    // Test 4: Test the service
    console.log('4. Testing MemoryExpirationService...');
    
    // Access the service from window if available
    if (window.useMemoryStore) {
      const memoryStore = window.useMemoryStore.getState();
      console.log('✅ Memory store accessible');
    }
    
    console.log('🎉 Test setup completed! Check console in 1 minute for cleanup results.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Quick test for immediate expiration
async function testImmediateExpiration() {
  console.log('🧪 Testing immediate expiration...');
  
  try {
    // Create a memory that expires immediately
    const { data: newMemory, error: createError } = await supabase
      .from('memories')
      .insert([{
        title: 'Immediately Expiring Memory',
        content: 'This memory should be deleted immediately',
        tags: ['test', 'immediate'],
        auto_delete_enabled: true,
        expires_at: new Date(Date.now() - 1000).toISOString() // 1 second ago
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create test memory:', createError);
      return;
    }
    
    console.log('✅ Created immediately expiring memory:', newMemory.id);
    
    // Run cleanup
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_expired_memories');
    
    if (cleanupError) {
      console.error('❌ Cleanup RPC failed:', cleanupError);
      console.log('🔄 Trying fallback cleanup...');
      
      // Try fallback cleanup
      const { data: expiredMemories, error: selectError } = await supabase
        .from('memories')
        .select('id, title')
        .eq('auto_delete_enabled', true)
        .not('expires_at', 'is', null)
        .lte('expires_at', new Date().toISOString());
      
      if (selectError) {
        console.error('❌ Fallback select failed:', selectError);
        return;
      }
      
      console.log('🔍 Found expired memories:', expiredMemories?.length || 0);
      
      if (expiredMemories && expiredMemories.length > 0) {
        const { error: deleteError } = await supabase
          .from('memories')
          .delete()
          .eq('auto_delete_enabled', true)
          .not('expires_at', 'is', null)
          .lte('expires_at', new Date().toISOString());
        
        if (deleteError) {
          console.error('❌ Fallback delete failed:', deleteError);
        } else {
          console.log('✅ Fallback cleanup completed:', expiredMemories.length, 'memories deleted');
        }
      }
    } else {
      console.log('✅ Immediate cleanup completed:', cleanupResult, 'memories deleted');
    }
    
    // Verify the memory was deleted
    const { data: checkMemory, error: checkError } = await supabase
      .from('memories')
      .select('id')
      .eq('id', newMemory.id)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Memory was successfully deleted');
    } else if (checkMemory) {
      console.log('⚠️ Memory still exists - cleanup may not have worked');
    }
    
  } catch (error) {
    console.error('❌ Immediate test failed:', error);
  }
}

// Test the expiration service directly
async function testExpirationService() {
  console.log('🧪 Testing MemoryExpirationService...');
  
  try {
    if (window.MemoryExpirationService) {
      const service = window.MemoryExpirationService.getInstance();
      console.log('✅ Service instance obtained');
      
      // Test manual cleanup
      await service.testCleanup();
      
      // Test presets
      const presets = service.getExpirationPresets();
      console.log('✅ Presets:', presets.length, 'options');
      
    } else {
      console.log('⚠️ MemoryExpirationService not available on window');
    }
  } catch (error) {
    console.error('❌ Service test failed:', error);
  }
}

// Run the tests
console.log('🚀 Running self-destruct tests...');
testSelfDestructFeature();

// Expose test functions to window
window.testImmediateExpiration = testImmediateExpiration;
window.testExpirationService = testExpirationService;

console.log('🧪 Test functions available:');
console.log('- testImmediateExpiration() - Test immediate cleanup');
console.log('- testExpirationService() - Test service methods');