-- Fix Duplicate Conversations
-- Finds and removes duplicate open conversations for the same contact

-- 1. Find duplicate conversations (same contact, same session, both open)
SELECT 
    c.contact_id,
    co.name as contact_name,
    co.phone_number,
    COUNT(*) as conversation_count,
    STRING_AGG(c.id::text, ', ') as conversation_ids
FROM conversations c
JOIN contacts co ON c.contact_id = co.id
WHERE c.status = 'open'
GROUP BY c.contact_id, c.whatsapp_session_id, co.name, co.phone_number
HAVING COUNT(*) > 1
ORDER BY conversation_count DESC;

-- 2. For each duplicate, keep the most recent one and close the others
-- This will keep the conversation with the latest last_message_at

WITH ranked_conversations AS (
    SELECT 
        id,
        contact_id,
        whatsapp_session_id,
        last_message_at,
        ROW_NUMBER() OVER (
            PARTITION BY contact_id, whatsapp_session_id 
            ORDER BY last_message_at DESC NULLS LAST, created_at DESC
        ) as rn
    FROM conversations
    WHERE status = 'open'
)
UPDATE conversations
SET 
    status = 'closed',
    workflow_status = 'done',
    closed_at = NOW(),
    updated_at = NOW()
WHERE id IN (
    SELECT id 
    FROM ranked_conversations 
    WHERE rn > 1
);

-- 3. Verify - should show no duplicates now
SELECT 
    c.contact_id,
    co.name as contact_name,
    co.phone_number,
    COUNT(*) as open_conversation_count
FROM conversations c
JOIN contacts co ON c.contact_id = co.id
WHERE c.status = 'open'
GROUP BY c.contact_id, c.whatsapp_session_id, co.name, co.phone_number
HAVING COUNT(*) > 1;

-- 4. Show summary
SELECT 
    status,
    COUNT(*) as count
FROM conversations
GROUP BY status
ORDER BY status;

-- 5. Optional: Delete closed conversations (if you want to clean up completely)
-- Uncomment to use:
-- DELETE FROM conversations WHERE status = 'closed';
