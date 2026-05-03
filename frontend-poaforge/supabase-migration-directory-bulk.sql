-- Directory listings & bulk-curated events (run in Supabase SQL Editor)
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_directory_listing BOOLEAN DEFAULT false;

COMMENT ON COLUMN events.source_url IS 'Original event page / ticket link (for curated directory imports).';
COMMENT ON COLUMN events.is_directory_listing IS 'True when listed from bulk/directory import vs organizer-created.';
