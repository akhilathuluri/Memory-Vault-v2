#!/usr/bin/env node

/**
 * Test Security Settings Table
 * 
 * This script tests the security_settings table and fixes common issues.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Test with anon key (what the app uses)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Test with service key if available
const supabaseService = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function testSecurityTable() {
  console.log('🔐 Testing Security Settings Table...\n');

  try {
    // Test 1: Check if table exists using service key
    if (supabaseService) {
      console.log('📋 Test 1: Checking table existence...');
      const { data: tables, error: tablesError } = await supabaseService
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'security_settings');

      if (tablesError) {
        console.error('❌ Error checking tables:', tablesError);
      } else if (tables && tables.length > 0) {
        console.log('✅ security_settings table exists');
      } else {
        console.log('❌ security_settings table not found');
        console.log('💡 Please run the fix_security_settings.sql script in Supabase SQL Editor');
        return;
      }
    }

    // Test 2: Check RLS policies
    console.log('\n📋 Test 2: Checking RLS policies...');
    if (supabaseService) {
      const { data: policies, error: policiesError } = await supabaseService
        .from('pg_policies')
        .select('policyname, tablename')
        .eq('tablename', 'security_settings');

      if (policiesError) {
        console.error('❌ Error checking policies:', policiesError);
      } else {
        console.log(`✅ Found ${policies?.length || 0} RLS policies for security_settings`);
        policies?.forEach(policy => {
          console.log(`   - ${policy.policyname}`);
        });
      }
    }

    // Test 3: Test anon access (should fail without auth)
    console.log('\n📋 Test 3: Testing anonymous access (should fail)...');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('security_settings')
      .select('id')
      .limit(1);

    if (anonError) {
      if (anonError.code === 'PGRST301' || anonError.message.includes('JWT')) {
        console.log('✅ RLS is working - anonymous access properly blocked');
      } else {
        console.log('⚠️ Unexpected error:', anonError.message);
      }
    } else {
      console.log('⚠️ Anonymous access succeeded (this might be unexpected)');
    }

    // Test 4: Test table structure
    console.log('\n📋 Test 4: Checking table structure...');
    if (supabaseService) {
      const { data: columns, error: columnsError } = await supabaseService
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'security_settings')
        .order('ordinal_position');

      if (columnsError) {
        console.error('❌ Error checking columns:', columnsError);
      } else {
        console.log('✅ Table structure:');
        columns?.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      }
    }

    console.log('\n🎉 Security table testing complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. If table doesn\'t exist: Run fix_security_settings.sql in Supabase SQL Editor');
    console.log('2. If RLS errors persist: Check that auth.users table exists and RLS is properly configured');
    console.log('3. Test the app: Navigate to Settings and try enabling vault lock');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testSecurityTable();