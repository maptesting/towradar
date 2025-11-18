-- TowRadar Database Schema Updates (Safe version - only adds missing pieces)
-- Run this if the main migration partially succeeded

-- Check if tables exist, only add missing columns
DO $$ 
BEGIN
  -- Add owner_user_id to companies if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN owner_user_id UUID REFERENCES auth.users(id);
  END IF;

  -- Add truck_id to company_incident_claims if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_incident_claims' AND column_name = 'truck_id'
  ) THEN
    ALTER TABLE company_incident_claims ADD COLUMN truck_id UUID REFERENCES trucks(id);
  END IF;

  -- Add driver_user_id to company_incident_claims if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_incident_claims' AND column_name = 'driver_user_id'
  ) THEN
    ALTER TABLE company_incident_claims ADD COLUMN driver_user_id UUID REFERENCES auth.users(id);
  END IF;

  -- Add claimed_at to company_incident_claims if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_incident_claims' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE company_incident_claims ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add completed_at to company_incident_claims if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_incident_claims' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE company_incident_claims ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Backfill existing companies with owner records (safely)
INSERT INTO company_users (company_id, user_id, role)
SELECT id, user_id, 'owner'
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM company_users
  WHERE company_users.company_id = companies.id
  AND company_users.user_id = companies.user_id
)
ON CONFLICT DO NOTHING;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END $$;
