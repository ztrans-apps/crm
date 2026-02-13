# Quick Replies Troubleshooting

## Problem: "No quick replies yet" shown in dropdown

### Quick Fix (Run This First)
```bash
psql -d your_database_name -f scripts/complete-quick-replies-setup.sql
```

This will:
1. Fix RLS policies to allow all users to read quick replies
2. Create default quick replies for owner
3. Verify everything is set up correctly

---

## Manual Troubleshooting Steps

### Step 1: Check if Quick Replies Exist
```sql
SELECT COUNT(*) FROM quick_replies;
```

**If count is 0:**
- Run: `psql -d your_database_name -f scripts/create-default-quick-replies.sql`
- Or manually create quick replies via `/quick-replies` page (owner only)

### Step 2: Check RLS Policies
```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'quick_replies';
```

**Expected policies:**
1. `All users can view quick replies` (SELECT)
2. `Owners can create quick replies` (INSERT)
3. `Owners can update quick replies` (UPDATE)
4. `Owners can delete quick replies` (DELETE)

**If policies are missing or wrong:**
```bash
psql -d your_database_name -f scripts/fix-quick-replies-rls.sql
```

### Step 3: Test Query as User
```sql
-- Switch to a specific user context (simulate auth)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "your-user-id"}';

-- Try to select quick replies
SELECT * FROM quick_replies;
```

**If this returns empty or error:**
- RLS policy is blocking access
- Run the fix-quick-replies-rls.sql script

### Step 4: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors related to quick_replies
4. Common errors:
   - `permission denied for table quick_replies` → RLS issue
   - `relation "quick_replies" does not exist` → Table not created
   - Network errors → Check Supabase connection

### Step 5: Verify Supabase Client
Check if the query is being executed correctly:

```typescript
// In browser console
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()
const { data, error } = await supabase
  .from('quick_replies')
  .select('*')

console.log('Data:', data)
console.log('Error:', error)
```

---

## Common Issues and Solutions

### Issue 1: RLS Blocking Access
**Symptom:** Query returns empty even though data exists

**Solution:**
```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'quick_replies';

-- If relrowsecurity is true, check policies
SELECT * FROM pg_policies WHERE tablename = 'quick_replies';

-- Fix: Run the RLS fix script
\i scripts/fix-quick-replies-rls.sql
```

### Issue 2: No Owner User
**Symptom:** Default quick replies not created

**Solution:**
```sql
-- Check if owner exists
SELECT id, email, role FROM profiles WHERE role = 'owner';

-- If no owner, create one or update existing user
UPDATE profiles SET role = 'owner' WHERE email = 'your-email@example.com';
```

### Issue 3: Table Doesn't Exist
**Symptom:** `relation "quick_replies" does not exist`

**Solution:**
```sql
-- Create the table
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_quick_replies_shortcut ON quick_replies(shortcut);
CREATE INDEX IF NOT EXISTS idx_quick_replies_created_by ON quick_replies(created_by);

-- Enable RLS
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
```

### Issue 4: Cached Data
**Symptom:** Changes not reflected in UI

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Logout and login again
4. Check if service worker is caching data

---

## Verification Checklist

After running the setup, verify:

- [ ] Quick replies table exists
- [ ] RLS is enabled on quick_replies table
- [ ] 4 RLS policies exist (SELECT, INSERT, UPDATE, DELETE)
- [ ] At least 1 quick reply exists in database
- [ ] Owner user exists
- [ ] Browser console shows no errors
- [ ] Quick reply dropdown shows replies

---

## Testing Quick Replies

### As Owner:
1. Go to `/quick-replies`
2. Should see list of quick replies
3. Can add/edit/delete quick replies
4. Go to `/chats`
5. Click lightning icon
6. Should see all quick replies

### As Agent:
1. Cannot access `/quick-replies` (permission denied)
2. Go to `/chats`
3. Click lightning icon
4. Should see all quick replies (same as owner)
5. Can select and use quick replies

---

## Debug Mode

Enable debug logging in chat service:

```typescript
// In features/chat/services/chat.service.ts
async getOrCreateDefaultQuickReplies(userId: string) {
  console.log('🔍 Loading quick replies for user:', userId)
  
  const { data, error } = await this.supabase
    .from('quick_replies')
    .select('*')
    .order('shortcut')
  
  console.log('📊 Quick replies data:', data)
  console.log('❌ Quick replies error:', error)
  
  return data || []
}
```

---

## Contact Support

If issues persist after following all steps:
1. Check Supabase dashboard for errors
2. Verify database connection
3. Check if migrations ran successfully
4. Review application logs
