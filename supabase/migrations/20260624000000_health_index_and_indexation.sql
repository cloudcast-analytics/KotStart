-- Health index table (gezondheidsindex basis 2013=100)
CREATE TABLE IF NOT EXISTS health_index (
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  value decimal(8,2) NOT NULL,
  PRIMARY KEY (year, month)
);

-- RLS: authenticated users can read
ALTER TABLE health_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read health_index"
  ON health_index FOR SELECT TO authenticated USING (true);

-- Property indexation toggle
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS indexation_enabled boolean DEFAULT false;

-- Room base rent tracking
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS base_rent decimal(10,2),
  ADD COLUMN IF NOT EXISTS base_rent_year int;

-- Backfill existing rooms: base_rent = current monthly_rent, base_rent_year from created_at
UPDATE rooms
SET base_rent = monthly_rent,
    base_rent_year = EXTRACT(YEAR FROM created_at)::int
WHERE base_rent IS NULL;
