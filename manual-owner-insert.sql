-- Force insert you as owner (replace with your actual IDs)
-- First, let's see your user_id and company_id

SELECT 
  auth.uid() as your_user_id,
  c.id as your_company_id,
  c.name as company_name
FROM companies c
WHERE c.user_id = auth.uid();

-- After you see the results above, manually run this:
-- INSERT INTO company_users (company_id, user_id, role)
-- VALUES ('YOUR_COMPANY_ID_FROM_ABOVE', 'YOUR_USER_ID_FROM_ABOVE', 'owner');
