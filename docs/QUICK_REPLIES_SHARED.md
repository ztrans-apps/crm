# Quick Replies - Shared System

## Overview
Quick replies are now SHARED across all users. Any user can view and use all quick replies in the system.

## Access Control

### All Users (Owner, Supervisor, Agent)
- ✅ Can VIEW all quick replies
- ✅ Can USE all quick replies in chat
- ✅ Can search and filter quick replies
- ✅ Can use quick replies via:
  - ⚡ icon in chat input
  - Type `/` in message input for inline dropdown

### Owner Only
- ✅ Can CREATE new quick replies
- ✅ Can EDIT existing quick replies
- ✅ Can DELETE quick replies
- ✅ Access via `/quick-replies` page

## Implementation

### Database
- Table: `quick_replies`
- Columns: `id`, `user_id`, `title`, `content`, `category`, `variables`, `created_at`
- RLS Policy: All authenticated users can SELECT (read)
- RLS Policy: Only owner can INSERT, UPDATE, DELETE

### Code Changes

#### 1. Chat Service (`features/chat/services/chat.service.ts`)
```typescript
// OLD - Filter by user ❌
async getQuickReplies(userId: string) {
  .eq('user_id', userId)
}

// NEW - Load all (shared) ✅
async getAllQuickReplies() {
  // No user filter - all users can use all quick replies
  .select('*')
  .order('title')
}
```

#### 2. Chats Page (`app/(app)/chats/page.tsx`)
```typescript
// Load quick replies on mount (no user dependency)
useEffect(() => {
  loadQuickReplies()
}, [])

const loadQuickReplies = async () => {
  const data = await chatService.getAllQuickReplies()
  setQuickReplies(data)
}
```

#### 3. Quick Reply Dropdowns
- `QuickReplyDropdownSimple.tsx` - No user filter
- `QuickReplyDropdown.tsx` - No user filter

Both components now load ALL quick replies:
```typescript
const { data } = await supabase
  .from('quick_replies')
  .select('*')
  .order('title')
// No .eq('user_id', userId) ✅
```

## Setup Instructions

### 1. Fix RLS Policies
```bash
psql -d your_database -f scripts/simple-fix-quick-replies.sql
```

This will:
- Enable RLS on `quick_replies` table
- Create policy for all users to SELECT (read)
- Create policies for owner to INSERT, UPDATE, DELETE

### 2. Create Default Quick Replies
```bash
psql -d your_database -f scripts/create-default-quick-replies.sql
```

This will create 8 default quick replies for the owner.

### 3. Verify
1. Login as agent
2. Open chat
3. Click ⚡ icon or type `/` in message input
4. Should see all quick replies (not filtered by user)

## Benefits

1. **Consistency** - All users see the same quick replies
2. **Centralized Management** - Owner manages one set of quick replies for everyone
3. **Easier Onboarding** - New agents immediately have access to all quick replies
4. **No Duplication** - No need to create same quick replies for each user

## Migration Notes

If you have existing quick replies per user:
1. Decide which set to keep (usually owner's)
2. Delete duplicates
3. All users will now see the remaining quick replies

## Testing

### Test as Agent
1. Login as agent
2. Open any conversation
3. Click ⚡ icon
4. Should see all quick replies
5. Select one - should insert into message input

### Test as Owner
1. Login as owner
2. Go to `/quick-replies` page
3. Create/Edit/Delete quick replies
4. Changes should be visible to all users immediately

## Troubleshooting

### Quick replies not showing
1. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'quick_replies'`
2. Check if data exists: `SELECT COUNT(*) FROM quick_replies`
3. Check browser console for errors
4. Run `scripts/simple-fix-quick-replies.sql`

### "No quick replies yet" message
- No data in database
- Run `scripts/create-default-quick-replies.sql`

### Permission denied error
- RLS policy blocking access
- Run `scripts/simple-fix-quick-replies.sql`
