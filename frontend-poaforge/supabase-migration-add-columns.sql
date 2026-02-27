-- Migration: Add missing columns to existing events table
-- Run this in Supabase SQL Editor if you get "column does not exist" errors

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_type') THEN
    ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'online';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_address') THEN
    ALTER TABLE events ADD COLUMN location_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_lat') THEN
    ALTER TABLE events ADD COLUMN location_lat DECIMAL(10, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_lng') THEN
    ALTER TABLE events ADD COLUMN location_lng DECIMAL(11, 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_radius') THEN
    ALTER TABLE events ADD COLUMN location_radius INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'qr_code') THEN
    ALTER TABLE events ADD COLUMN qr_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category') THEN
    ALTER TABLE events ADD COLUMN category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'tags') THEN
    ALTER TABLE events ADD COLUMN tags TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_datetime') THEN
    ALTER TABLE events ADD COLUMN start_datetime TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_datetime') THEN
    ALTER TABLE events ADD COLUMN end_datetime TIMESTAMPTZ;
  END IF;
END $$;

-- Add new columns to claim_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_requests' AND column_name = 'verification_method') THEN
    ALTER TABLE claim_requests ADD COLUMN verification_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_requests' AND column_name = 'verification_data') THEN
    ALTER TABLE claim_requests ADD COLUMN verification_data JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_requests' AND column_name = 'verified_at') THEN
    ALTER TABLE claim_requests ADD COLUMN verified_at TIMESTAMP;
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_lat, location_lng);
