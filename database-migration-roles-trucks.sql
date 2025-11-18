-- TowRadar Database Schema Updates
-- Add role-based users, trucks, and driver assignments

-- 1. Add role column to track user types
-- Note: Run this in your Supabase SQL Editor

-- Add role to companies table (each user's role within their company)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- 2. Create company_users table for team members
CREATE TABLE IF NOT EXISTS company_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'driver', 'dispatcher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- 3. Create trucks table
CREATE TABLE IF NOT EXISTS trucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license_plate TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_job', 'maintenance', 'out_of_service')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update company_incident_claims to include truck and driver assignment
ALTER TABLE company_incident_claims ADD COLUMN IF NOT EXISTS truck_id UUID REFERENCES trucks(id);
ALTER TABLE company_incident_claims ADD COLUMN IF NOT EXISTS driver_user_id UUID REFERENCES auth.users(id);
ALTER TABLE company_incident_claims ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE company_incident_claims ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_trucks_company ON trucks(company_id);
CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);
CREATE INDEX IF NOT EXISTS idx_claims_truck ON company_incident_claims(truck_id);
CREATE INDEX IF NOT EXISTS idx_claims_driver ON company_incident_claims(driver_user_id);

-- 6. Enable RLS (Row Level Security)
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for company_users
-- Users can view members of their own company
CREATE POLICY "Users can view company members"
  ON company_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu2
      WHERE cu2.user_id = auth.uid()
      AND cu2.company_id = company_users.company_id
    )
  );

-- Only owners can insert/update/delete team members
CREATE POLICY "Owners can manage team members"
  ON company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users cu2
      WHERE cu2.user_id = auth.uid()
      AND cu2.company_id = company_users.company_id
      AND cu2.role = 'owner'
    )
  );

-- 8. RLS Policies for trucks
-- Users can view trucks in their company
CREATE POLICY "Users can view company trucks"
  ON trucks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.user_id = auth.uid()
      AND company_users.company_id = trucks.company_id
    )
  );

-- Only owners can manage trucks
CREATE POLICY "Owners can manage trucks"
  ON trucks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.user_id = auth.uid()
      AND company_users.company_id = trucks.company_id
      AND company_users.role = 'owner'
    )
  );

-- 9. Function to automatically create owner record when company is created
CREATE OR REPLACE FUNCTION create_company_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_users (company_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_company_created
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_company_owner();

-- 10. Backfill existing companies with owner records
INSERT INTO company_users (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM company_users
  WHERE company_users.company_id = companies.id
  AND company_users.user_id = companies.user_id
);
