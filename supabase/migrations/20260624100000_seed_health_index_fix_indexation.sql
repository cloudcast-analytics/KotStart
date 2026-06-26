-- Seed health_index with gezondheidsindex (basis 2013=100) augustuswaarden
-- Bron: Statbel (approximatieve waarden voor staging)
INSERT INTO health_index (year, month, value) VALUES
  (2018, 8, 104.42),
  (2019, 8, 106.21),
  (2020, 8, 107.89),
  (2021, 8, 110.35),
  (2022, 8, 119.42),
  (2023, 8, 124.15),
  (2024, 8, 126.08),
  (2025, 8, 129.42),
  (2026, 8, 132.10)
ON CONFLICT (year, month) DO UPDATE SET value = EXCLUDED.value;

-- Fix base_rent_year: use earliest contract year for each room, fallback to 2024
UPDATE rooms r
SET base_rent_year = COALESCE(
  (SELECT MIN(EXTRACT(YEAR FROM c.created_at)::int)
   FROM contracts c WHERE c.room_id = r.id),
  2024
)
WHERE base_rent_year IS NULL OR base_rent_year >= EXTRACT(YEAR FROM CURRENT_DATE)::int;

-- Ensure base_rent is set (= monthly_rent if not yet filled)
UPDATE rooms
SET base_rent = monthly_rent
WHERE base_rent IS NULL;

-- Enable indexation for all properties (staging data)
UPDATE properties
SET indexation_enabled = true
WHERE indexation_enabled IS NOT TRUE;
