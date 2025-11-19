-- Add job status tracking to company_incident_claims

-- Add status field with more granular options
ALTER TABLE company_incident_claims 
DROP CONSTRAINT IF EXISTS company_incident_claims_status_check;

ALTER TABLE company_incident_claims
ADD CONSTRAINT company_incident_claims_status_check 
CHECK (status IN ('claimed', 'en_route', 'on_scene', 'completed', 'cancelled'));

-- Add timestamps for each status change
ALTER TABLE company_incident_claims 
ADD COLUMN IF NOT EXISTS en_route_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS on_scene_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create status history table for tracking changes
CREATE TABLE IF NOT EXISTS claim_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  CONSTRAINT fk_claim FOREIGN KEY (company_id, incident_id) 
    REFERENCES company_incident_claims(company_id, incident_id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_status_history_claim ON claim_status_history(company_id, incident_id);
CREATE INDEX IF NOT EXISTS idx_status_history_time ON claim_status_history(changed_at);

-- Enable RLS
ALTER TABLE claim_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view company claim history" ON claim_status_history;
DROP POLICY IF EXISTS "Users can create claim history" ON claim_status_history;

-- RLS policy: users can view status history for their company's claims
CREATE POLICY "Users can view company claim history"
  ON claim_status_history FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = claim_status_history.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

-- RLS policy: users can insert status history for their company's claims
CREATE POLICY "Users can create claim history"
  ON claim_status_history FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = claim_status_history.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_claim_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO claim_status_history (
      company_id,
      incident_id,
      status,
      changed_at,
      changed_by
    ) VALUES (
      NEW.company_id,
      NEW.incident_id,
      NEW.status,
      NOW(),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status logging
DROP TRIGGER IF EXISTS trigger_log_claim_status ON company_incident_claims;
CREATE TRIGGER trigger_log_claim_status
  AFTER INSERT OR UPDATE ON company_incident_claims
  FOR EACH ROW
  EXECUTE FUNCTION log_claim_status_change();

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Job status tracking added successfully!';
END $$;
