-- POAP Forge Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table (Basic Events + POAP Events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_cid TEXT, -- IPFS CID for event image
  metadata_cid TEXT, -- IPFS CID for full metadata JSON
  creator_email TEXT, -- Email/Social auth
  creator_wallet TEXT, -- Wallet address (if upgraded)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  requires_approval BOOLEAN DEFAULT false,
  is_poap BOOLEAN DEFAULT false, -- True if upgraded to POAP
  event_type TEXT DEFAULT 'online' CHECK (event_type IN ('online', 'in-person', 'hybrid')), -- Event location type
  location_address TEXT, -- Physical address for in-person events
  location_lat DECIMAL(10, 8), -- Latitude for geolocation verification
  location_lng DECIMAL(11, 8), -- Longitude for geolocation verification
  location_radius INTEGER DEFAULT 100, -- Radius in meters for location verification
  qr_code TEXT, -- QR code for in-person check-in
  category TEXT, -- Event category (conference, sports, super-bowl, online, workshop, meetup, festival, web3, gaming, art, music)
  tags TEXT[], -- Additional tags for filtering/searching
  start_datetime TIMESTAMPTZ, -- Event start date and time
  end_datetime TIMESTAMPTZ, -- Event end date and time
  nft_contract_address TEXT, -- On-chain NFT contract (if upgraded)
  token_contract_address TEXT, -- On-chain token contract (if upgraded)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Claim requests table
CREATE TABLE IF NOT EXISTS claim_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_email TEXT, -- Email/Social auth
  wallet_address TEXT, -- Wallet address for minting
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'banned')),
  signature TEXT, -- Creator signature for approved requests
  verification_method TEXT, -- 'location', 'qr', 'manual', 'online'
  verification_data JSONB, -- Location coords, QR scan data, etc.
  verified_at TIMESTAMP, -- When verification was completed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, wallet_address)
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT, -- Can be IPFS CID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event likes table
CREATE TABLE IF NOT EXISTS event_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_address)
);

-- Event favorites table
CREATE TABLE IF NOT EXISTS event_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_address)
);

-- Event metadata table (IPFS CIDs)
CREATE TABLE IF NOT EXISTS event_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  metadata_cid TEXT NOT NULL,
  image_cid TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_creator_email ON events(creator_email);
CREATE INDEX IF NOT EXISTS idx_events_creator_wallet ON events(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_events_is_poap ON events(is_poap);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_claim_requests_event_id ON claim_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_wallet ON claim_requests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user ON event_likes(user_address);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event_id ON event_favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_favorites_user ON event_favorites(user_address);

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_metadata ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all reads, authenticated writes
-- Events: Public read, authenticated create/update
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON events FOR INSERT WITH CHECK (
  creator_email = COALESCE(auth.jwt() ->> 'email', '') OR 
  creator_wallet = COALESCE(auth.jwt() ->> 'wallet_address', '')
);
CREATE POLICY "Users can update their own events" ON events FOR UPDATE USING (
  creator_email = auth.jwt() ->> 'email' OR creator_wallet = auth.jwt() ->> 'wallet_address'
);

-- Claim requests: Public read, authenticated create
CREATE POLICY "Claim requests are viewable by everyone" ON claim_requests FOR SELECT USING (true);
CREATE POLICY "Users can create claim requests" ON claim_requests FOR INSERT WITH CHECK (
  user_email = COALESCE(auth.jwt() ->> 'email', '') OR 
  wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', '')
);
CREATE POLICY "Event creators can update claim requests" ON claim_requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.event_id = claim_requests.event_id 
    AND (events.creator_email = auth.jwt() ->> 'email' OR events.creator_wallet = auth.jwt() ->> 'wallet_address')
  )
);

-- User profiles: Public read, authenticated create/update
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (
  wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', '')
);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (
  wallet_address = auth.jwt() ->> 'wallet_address'
);

-- Event likes/favorites: Public read, authenticated create/delete
CREATE POLICY "Likes are viewable by everyone" ON event_likes FOR SELECT USING (true);
CREATE POLICY "Users can like events" ON event_likes FOR INSERT WITH CHECK (
  user_address = COALESCE(auth.jwt() ->> 'wallet_address', '')
);
CREATE POLICY "Users can unlike events" ON event_likes FOR DELETE USING (
  user_address = COALESCE(auth.jwt() ->> 'wallet_address', '')
);

CREATE POLICY "Favorites are viewable by everyone" ON event_favorites FOR SELECT USING (true);
CREATE POLICY "Users can favorite events" ON event_favorites FOR INSERT WITH CHECK (
  user_address = COALESCE(auth.jwt() ->> 'wallet_address', '')
);
CREATE POLICY "Users can unfavorite events" ON event_favorites FOR DELETE USING (
  user_address = COALESCE(auth.jwt() ->> 'wallet_address', '')
);

-- Event metadata: Public read, authenticated create/update
CREATE POLICY "Metadata is viewable by everyone" ON event_metadata FOR SELECT USING (true);
CREATE POLICY "Users can create metadata" ON event_metadata FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.event_id = event_metadata.event_id 
    AND (events.creator_email = auth.jwt() ->> 'email' OR events.creator_wallet = auth.jwt() ->> 'wallet_address')
  )
);
CREATE POLICY "Users can update metadata" ON event_metadata FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.event_id = event_metadata.event_id 
    AND (events.creator_email = auth.jwt() ->> 'email' OR events.creator_wallet = auth.jwt() ->> 'wallet_address')
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claim_requests_updated_at BEFORE UPDATE ON claim_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
