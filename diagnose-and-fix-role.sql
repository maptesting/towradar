-- Diagnostic: Check your current setup and fix role issues

-- 1. Check if you're in company_users table
SELECT 'Your record in company_users:' as info;
SELECT * FROM company_users WHERE user_id = auth.uid();

-- 2. Check your company
SELECT 'Your company:' as info;
SELECT id, user_id, name FROM companies WHERE user_id = auth.uid();

-- 3. If the first query shows nothing, add yourself
-- Run this to add yourself as owner:
INSERT INTO company_users (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM companies
WHERE user_id = auth.uid()
ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'owner';

-- 4. Verify it worked
SELECT 'After insert - your role:' as info;
SELECT cu.role, c.name as company_name
FROM company_users cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.user_id = auth.uid();

-- 5. Now change to driver to test driver dashboard
UPDATE company_users SET role = 'driver' WHERE user_id = auth.uid();

-- 6. Confirm you're now a driver
SELECT 'Your new role:' as info;
SELECT role FROM company_users WHERE user_id = auth.uid();
