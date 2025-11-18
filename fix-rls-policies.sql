-- Fix RLS policies to allow company owners to see their team
-- This fixes the chicken-and-egg problem

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view company members" ON company_users;
DROP POLICY IF EXISTS "Owners can manage team members" ON company_users;
DROP POLICY IF EXISTS "Users can view company trucks" ON trucks;
DROP POLICY IF EXISTS "Owners can manage trucks" ON trucks;

-- Better policy for viewing company_users
-- Company owners (from companies table) can view their team
CREATE POLICY "Company owners can view team"
  ON company_users FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- Better policy for managing company_users
-- Only company owners (from companies table) can manage team
CREATE POLICY "Company owners can manage team"
  ON company_users FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Better policy for viewing trucks
-- Company owners can view their trucks
CREATE POLICY "Company owners can view trucks"
  ON trucks FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Better policy for managing trucks
-- Company owners can manage their trucks
CREATE POLICY "Company owners can manage trucks"
  ON trucks FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Now insert you as owner
INSERT INTO company_users (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM companies
WHERE user_id = auth.uid()
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Verify
SELECT 'Success! You are now an owner' as message;
