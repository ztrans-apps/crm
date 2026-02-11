-- Reset Chat Data Script
-- WARNING: This will delete ALL chat data including conversations, messages, contacts, notes, and labels
-- Use with caution!

-- Disable foreign key checks temporarily (if needed)
-- SET session_replication_role = 'replica';

-- Delete in order to respect foreign key constraints

-- 1. Delete conversation notes
DELETE FROM conversation_notes;

-- 2. Delete conversation labels
DELETE FROM conversation_labels;

-- 3. Delete messages
DELETE FROM messages;

-- 4. Delete conversations
DELETE FROM conversations;

-- 5. Delete contacts
DELETE FROM contacts;

-- 6. Delete labels (optional - uncomment if you want to delete labels too)
-- DELETE FROM labels;

-- 7. Delete quick replies (optional - uncomment if you want to delete quick replies too)
-- DELETE FROM quick_replies;

-- 8. Delete chatbot sessions (optional)
-- DELETE FROM chatbot_sessions;

-- Re-enable foreign key checks
-- SET session_replication_role = 'origin';

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM conversation_notes) as notes_count,
  (SELECT COUNT(*) FROM conversation_labels) as labels_count,
  (SELECT COUNT(*) FROM messages) as messages_count,
  (SELECT COUNT(*) FROM conversations) as conversations_count,
  (SELECT COUNT(*) FROM contacts) as contacts_count;

-- Success message
SELECT 'All chat data has been deleted successfully!' as status;
