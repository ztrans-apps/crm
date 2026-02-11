-- Fix Phone Numbers Script
-- Fixes invalid phone numbers in contacts table

-- 1. Show all contacts with their phone numbers
SELECT 
    id, 
    name, 
    phone_number, 
    LENGTH(phone_number) as length,
    CASE 
        WHEN LENGTH(phone_number) > 15 THEN '❌ TOO LONG'
        WHEN LENGTH(phone_number) < 12 THEN '❌ TOO SHORT'
        WHEN phone_number NOT LIKE '+62%' THEN '❌ WRONG FORMAT'
        ELSE '✅ OK'
    END as status
FROM contacts
ORDER BY LENGTH(phone_number) DESC;

-- 2. Fix specific wrong number
-- Change +62123265695629557 to +6285155046155
UPDATE contacts
SET phone_number = '+6285155046155',
    updated_at = NOW()
WHERE phone_number = '+62123265695629557';

-- 3. Show result
SELECT 
    id, 
    name, 
    phone_number, 
    LENGTH(phone_number) as length
FROM contacts
WHERE phone_number = '+6285155046155';

-- 4. Optional: Delete all invalid phone numbers (they will be recreated on next message)
-- Uncomment to use:
-- DELETE FROM contacts WHERE LENGTH(phone_number) > 15;
-- DELETE FROM contacts WHERE LENGTH(phone_number) < 12;

-- 5. Verify all contacts are now valid
SELECT 
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN LENGTH(phone_number) > 15 THEN 1 END) as too_long,
    COUNT(CASE WHEN LENGTH(phone_number) < 12 THEN 1 END) as too_short,
    COUNT(CASE WHEN phone_number NOT LIKE '+62%' THEN 1 END) as wrong_format,
    COUNT(CASE WHEN LENGTH(phone_number) BETWEEN 12 AND 15 AND phone_number LIKE '+62%' THEN 1 END) as valid
FROM contacts;
