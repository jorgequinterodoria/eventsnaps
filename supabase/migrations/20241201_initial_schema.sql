-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    creator_id UUID NOT NULL,
    moderation_enabled BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired'))
);

-- Photos Table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    caption TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation Queue Table
CREATE TABLE moderation_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    gemini_suggestion VARCHAR(20),
    confidence_score FLOAT,
    processed BOOLEAN DEFAULT false
);

-- Moderation Actions Table
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject')),
    reason TEXT,
    actioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_events_code ON events(code);
CREATE INDEX idx_events_expires_at ON events(expires_at);
CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_photos_event_id ON photos(event_id);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_moderation_queue_photo_id ON moderation_queues(photo_id);
CREATE INDEX idx_moderation_queue_processed ON moderation_queues(processed);

-- Grant permissions
GRANT SELECT ON events TO anon;
GRANT ALL PRIVILEGES ON events TO authenticated;
GRANT SELECT ON photos TO anon;
GRANT ALL PRIVILEGES ON photos TO authenticated;
GRANT SELECT ON moderation_queues TO anon;
GRANT ALL PRIVILEGES ON moderation_queues TO authenticated;
GRANT SELECT ON moderation_actions TO anon;
GRANT ALL PRIVILEGES ON moderation_actions TO authenticated;

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- Events RLS Policies
CREATE POLICY "Anyone can view active events" ON events
    FOR SELECT USING (status = 'active' AND expires_at > NOW());

CREATE POLICY "Creators can update their events" ON events
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Photos RLS Policies
CREATE POLICY "Anyone can view approved photos" ON photos
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can upload photos" ON photos
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Event creators can moderate photos" ON photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = photos.event_id 
            AND events.creator_id = auth.uid()
        )
    );

-- Moderation Queue RLS Policies
CREATE POLICY "Event creators can view moderation queue" ON moderation_queues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM photos 
            JOIN events ON events.id = photos.event_id
            WHERE photos.id = moderation_queues.photo_id 
            AND events.creator_id = auth.uid()
        )
    );

CREATE POLICY "Event creators can update moderation queue" ON moderation_queues
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM photos 
            JOIN events ON events.id = photos.event_id
            WHERE photos.id = moderation_queues.photo_id 
            AND events.creator_id = auth.uid()
        )
    );

-- Moderation Actions RLS Policies
CREATE POLICY "Event creators can create moderation actions" ON moderation_actions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view moderation actions" ON moderation_actions
    FOR SELECT USING (true);