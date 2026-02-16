# Debug Quick Replies in Browser

## Step 1: Run SQL Fix
```bash
psql -d your_database_name -f scripts/simple-fix-quick-replies.sql
```

## Step 2: Test in Browser Console

Open browser DevTools (F12) and run these commands:

### Test 1: Check Supabase Connection
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()
console.log('Supabase client:', supabase)
```

### Test 2: Try to Query Quick Replies
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()

const { data, error } = await supabase
  .from('quick_replies')
  .select('*')
  .order('title')

console.log('Quick Replies Data:', data)
console.log('Quick Replies Error:', error)
console.log('Count:', data?.length || 0)
```

### Test 3: Check Current User
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()

const { data: { user } } = await supabase.auth.getUser()
console.log('Current User:', user)
console.log('User ID:', user?.id)
```

### Test 4: Check User Profile
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()

const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

console.log('User Profile:', profile)
console.log('User Role:', profile?.role)
```

### Test 5: Test Chat Service Method
```javascript
const { chatService } = await import('@/features/chat/services')
const { data: { user } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()

const quickReplies = await chatService.getOrCreateDefaultQuickReplies(user.id)
console.log('Quick Replies from Service:', quickReplies)
console.log('Count:', quickReplies?.length || 0)
```

## Expected Results

### If Working Correctly:
- Test 2 should return array of quick replies
- Test 5 should return array of quick replies
- No errors in console

### If RLS is Blocking:
- Test 2 returns empty array `[]`
- No error, but data is empty
- Solution: Run the SQL fix script again

### If Table Doesn't Exist:
- Test 2 returns error: `relation "quick_replies" does not exist`
- Solution: Create the table first

### If No Data:
- Test 2 returns empty array `[]`
- No error
- Solution: Run `create-default-quick-replies.sql`

## Common Issues

### Issue 1: Empty Array But No Error
**Cause:** RLS policy is blocking access

**Solution:**
```sql
-- Check RLS status
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'quick_replies';

-- If relrowsecurity is true, check policies
SELECT * FROM pg_policies WHERE tablename = 'quick_replies';

-- Run fix
\i scripts/simple-fix-quick-replies.sql
```

### Issue 2: Error "permission denied"
**Cause:** No SELECT policy exists

**Solution:**
```sql
-- Create simple SELECT policy
CREATE POLICY "allow_all_read" ON quick_replies FOR SELECT TO authenticated USING (true);
```

### Issue 3: Data Exists But Not Showing in UI
**Cause:** Frontend not refreshing or caching

**Solution:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Logout and login again
4. Check Network tab for API calls

## Verification Checklist

After running the fix, verify:

- [ ] SQL script runs without errors
- [ ] At least 1 quick reply exists in database
- [ ] RLS policy "allow_all_read_quick_replies" exists
- [ ] Browser console Test 2 returns data
- [ ] Browser console Test 5 returns data
- [ ] Quick reply dropdown shows replies in UI
- [ ] No errors in browser console

## If Still Not Working

1. Check Supabase dashboard logs
2. Verify database connection
3. Check if user is authenticated
4. Verify table structure matches expected schema
5. Check if there are any JavaScript errors in console
