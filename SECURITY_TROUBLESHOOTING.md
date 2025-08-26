# 🔧 Security Feature Troubleshooting Guide

## 🚨 **Current Issue: 406 Not Acceptable Error**

You're seeing this error when trying to access the `security_settings` table:
```
GET https://ihogjdcxqilbwnmztszq.supabase.co/rest/v1/security_settings?select=*&user_id=eq.b62849f5-1605-47cd-91b0-bcaad32a7229 406 (Not Acceptable)
```

This indicates an issue with the database table or RLS policies.

## 🔧 **Quick Fix Steps**

### **Step 1: Fix the Database Table**
1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `fix_security_settings.sql`
4. Click **Run** to execute the script

### **Step 2: Test the Fix**
Run the test script to verify everything is working:
```bash
node test_security_table.js
```

### **Step 3: Restart Your App**
After fixing the database:
1. Stop your development server (Ctrl+C)
2. Restart with `npm run dev`
3. Navigate to Settings to test the security features

## 🔍 **Detailed Troubleshooting**

### **Issue 1: Table Doesn't Exist**
**Symptoms**: 406 errors, table not found
**Solution**: Run `fix_security_settings.sql` in Supabase SQL Editor

### **Issue 2: RLS Policy Problems**
**Symptoms**: Permission denied, authentication errors
**Solution**: The fix script recreates all RLS policies with correct syntax

### **Issue 3: Trigger Function Issues**
**Symptoms**: Database errors when updating records
**Solution**: The fix script uses proper PostgreSQL function syntax

### **Issue 4: No Unlock Methods Available**
**Symptoms**: Lock screen shows "No unlock methods configured"
**Causes**:
- Vault lock enabled but no PIN or biometric setup
- Database connection issues preventing settings load
**Solution**: 
- Disable vault lock in Settings, or
- Set up PIN/biometric authentication

## 🧪 **Testing Checklist**

After applying the fix, test these scenarios:

### **✅ Database Tests**
- [ ] Table exists and is accessible
- [ ] RLS policies allow authenticated users
- [ ] Settings can be created and updated
- [ ] Triggers work for updated_at field

### **✅ App Integration Tests**
- [ ] Settings page loads without errors
- [ ] Security settings section appears
- [ ] Biometric capability detection works
- [ ] PIN setup and validation works
- [ ] Vault lock toggle functions properly

### **✅ Lock Screen Tests**
- [ ] Lock screen appears when vault is locked
- [ ] Biometric unlock works (if available)
- [ ] PIN unlock works correctly
- [ ] Failed attempts are tracked
- [ ] Lock screen dismisses after successful unlock

## 🔧 **Manual Database Setup**

If the automated scripts don't work, you can manually create the table:

### **1. Create Table**
```sql
CREATE TABLE security_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vault_lock_enabled BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    pin_enabled BOOLEAN DEFAULT FALSE,
    pin_hash TEXT,
    lock_timeout INTEGER DEFAULT 15,
    auto_lock_on_minimize BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

### **2. Enable RLS**
```sql
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
```

### **3. Create Policies**
```sql
CREATE POLICY "security_settings_select" ON security_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "security_settings_insert" ON security_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "security_settings_update" ON security_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "security_settings_delete" ON security_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### **4. Create Indexes**
```sql
CREATE INDEX idx_security_settings_user_id ON security_settings(user_id);
CREATE INDEX idx_security_settings_vault_lock_enabled ON security_settings(vault_lock_enabled);
```

## 🚨 **Common Error Messages**

### **"406 Not Acceptable"**
- **Cause**: Table doesn't exist or RLS policies are incorrect
- **Fix**: Run `fix_security_settings.sql`

### **"JWT expired" or "Invalid JWT"**
- **Cause**: Authentication token issues
- **Fix**: Refresh the page or re-login

### **"No unlock methods configured"**
- **Cause**: Vault lock enabled without authentication setup
- **Fix**: Set up PIN or biometric, or disable vault lock

### **"WebAuthn not supported"**
- **Cause**: Browser doesn't support biometric authentication
- **Fix**: Use PIN authentication or upgrade browser

### **"Failed to generate embedding"** (unrelated but common)
- **Cause**: AI service configuration issues
- **Fix**: Check API keys in Settings

## 🔄 **Reset Security Settings**

If you need to completely reset the security configuration:

### **Option 1: Through App**
1. Go to Settings → Vault Security
2. Disable vault lock
3. This will reset all security settings

### **Option 2: Database Reset**
```sql
DELETE FROM security_settings WHERE user_id = auth.uid();
```

## 📞 **Getting Help**

If you're still experiencing issues:

1. **Check Browser Console**: Look for specific error messages
2. **Test Different Browsers**: Try Chrome, Safari, Edge
3. **Verify Supabase Connection**: Ensure your project is accessible
4. **Check Environment Variables**: Verify SUPABASE_URL and keys are correct

## 🎯 **Expected Behavior After Fix**

Once everything is working correctly:

1. **Settings Page**: Security section appears without errors
2. **Biometric Detection**: Shows available biometric methods
3. **PIN Setup**: Allows creating and testing PIN
4. **Vault Lock**: Can be enabled/disabled smoothly
5. **Lock Screen**: Appears when vault is locked with proper unlock options

The security feature should integrate seamlessly with your existing Memory Vault experience! 🔐✨