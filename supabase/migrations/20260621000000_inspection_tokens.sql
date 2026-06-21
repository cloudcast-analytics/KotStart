-- Add delegation setting to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS inspection_delegation text NOT NULL DEFAULT 'together'
  CHECK (inspection_delegation IN ('together', 'delegate'));

-- Create inspection_tokens table
CREATE TABLE inspection_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  landlord_items jsonb,
  student_items jsonb,
  student_photo_urls text[],
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_tokens_token ON inspection_tokens(token);
CREATE INDEX idx_inspection_tokens_contract ON inspection_tokens(contract_id);
CREATE INDEX idx_inspection_tokens_owner ON inspection_tokens(owner_id);

-- RLS: only authenticated users can access their own tokens
ALTER TABLE inspection_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inspection tokens"
  ON inspection_tokens FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own inspection tokens"
  ON inspection_tokens FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own inspection tokens"
  ON inspection_tokens FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own inspection tokens"
  ON inspection_tokens FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
