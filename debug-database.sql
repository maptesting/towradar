-- Debug: Check what's in your database

-- 1. Check your companies table
SELECT id, user_id, name, created_at 
FROM companies 
LIMIT 5;

-- 2. Check company_users table
SELECT * FROM company_users;

-- 3. Check if the trigger exists
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_company_created';

-- 4. Check if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'create_company_owner';
