-- Quick way to test driver dashboard
-- Option 1: Temporarily change YOUR role to driver (you can change it back)

-- See your current role
SELECT role, company_id FROM company_users WHERE user_id = auth.uid();

-- Change your role to driver temporarily (to test driver dashboard)
UPDATE company_users SET role = 'driver' WHERE user_id = auth.uid();

-- When done testing, change back to owner
-- UPDATE company_users SET role = 'owner' WHERE user_id = auth.uid();


-- Option 2: If you have another email/account, sign them up and add them as driver
-- After they sign up and create their company, you can run:
-- INSERT INTO company_users (company_id, user_id, role)
-- VALUES ('YOUR_COMPANY_ID', 'THEIR_USER_ID', 'driver');
