-- Add yourself as owner to company_users table
-- This will fix "Error loading team members" and give you access

INSERT INTO company_users (company_id, user_id, role)
SELECT c.id, c.user_id, 'owner'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_users cu
  WHERE cu.company_id = c.id AND cu.user_id = c.user_id
);

-- Verify it worked
SELECT cu.*, c.name as company_name
FROM company_users cu
JOIN companies c ON c.id = cu.company_id;
