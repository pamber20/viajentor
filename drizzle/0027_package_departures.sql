ALTER TABLE "travel_package" ADD COLUMN IF NOT EXISTS "departures" jsonb DEFAULT '[]'::jsonb NOT NULL;
