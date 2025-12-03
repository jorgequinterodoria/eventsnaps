App Name: EventSnaps
Core Features:

Event Creation: Allow hosts to create events with a name, generating a unique 6-character code and setting expiration and deletion timestamps using Clerk authentication (supports anonymous sessions or Google OAuth).
QR Code Generation and Display: Generate a QR code based on the event code for easy guest access. Display the QR code prominently to allow the guests to easily scan it.
Real-time Photo Upload and Display: Enable guests to upload photos to a shared gallery in real-time, compressing images on the client-side before upload (max width 1080px, quality 0.7). Store images in Neon PostgreSQL database (as base64 or use a storage service with URL references) and implement real-time updates using polling or WebSocket connections to automatically display newly added pictures.
Data Lifecycle Management: Implement a strict data lifecycle: photos are accepted for 24 hours, viewable for 72 hours, and then the event indicates it has expired. Use PostgreSQL triggers, scheduled functions, or a cron job to automatically mark expired events and delete old data server-side.
Event Code Authentication: Enable guests to join events by scanning a QR code or entering a 6-character code. Use Clerk's anonymous session feature to authenticate guests upon joining.
Gallery View: Display a real-time updating photo gallery in a grid layout, showing photos uploaded by guests. Implement periodic polling (every 3-5 seconds) or WebSocket connections to fetch new photos from Neon PostgreSQL.
Inappropriate Photo Removal Tool (Optional): AI-powered moderation tool using Google Gemini API that the host can optionally enable to detect inappropriate photos in real time. The system flags suspicious content for the host to manually review and delete.

Technical Stack:

Database: Neon (PostgreSQL) - serverless Postgres with auto-scaling
Authentication: Clerk - handles both authenticated users and anonymous sessions
AI Moderation: Google Gemini API for content moderation
Storage Strategy: Store compressed images as base64 in PostgreSQL or use a cloud storage service (Cloudflare R2, AWS S3) with URL references in the database

Database Schema (PostgreSQL):
sql-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code VARCHAR(6) UNIQUE NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  host_user_id VARCHAR(255) NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL, -- 24 hours from creation
  deletion_at TIMESTAMP NOT NULL, -- 72 hours from creation
  moderation_enabled BOOLEAN DEFAULT false,
  is_expired BOOLEAN DEFAULT false
);

-- Photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  uploader_session_id VARCHAR(255), -- Clerk anonymous session ID
  image_data TEXT, -- base64 encoded image or storage URL
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_flagged BOOLEAN DEFAULT false,
  moderation_score JSONB -- Store Gemini API response
);

-- Indexes for performance
CREATE INDEX idx_events_code ON events(event_code);
CREATE INDEX idx_events_expires ON events(expires_at);
CREATE INDEX idx_photos_event ON photos(event_id, uploaded_at DESC);

Style Guidelines:

Primary color: Deep purple (#6246EA) for a modern and celebratory feel.
Background color: Light lavender (#E8E6FF), a very lightly saturated tint of the primary color.
Accent color: Pink (#EA469F) for vibrant CTAs and highlights, offset toward magenta for a touch of boldness.
Headline font: 'Space Grotesk' sans-serif, for a computerized and techy feel.
Body font: 'Inter' sans-serif, to pair with the headline.
Icons: lucide-react icons for a modern and consistent look.
Layout: Mobile-first responsive design with large touch targets. Use a grid layout for the photo gallery.
Animations: Subtle animations using framer-motion when new photos appear and during loading states. Use loading indicators when uploading photos.

Implementation Notes:

Real-time Updates: Since PostgreSQL doesn't have native real-time listeners like Firestore, implement polling every 3-5 seconds or use PostgreSQL's LISTEN/NOTIFY with WebSockets for true real-time updates.
Image Storage: For optimal performance, consider storing images in a cloud storage service (Cloudflare R2, AWS S3, or Vercel Blob) and only storing URLs in Neon. Base64 storage is simpler but less efficient for large galleries.
Clerk Anonymous Sessions: Configure Clerk to allow anonymous sessions for guests who join via event code, while requiring authenticated sessions for event hosts.
Data Cleanup: Create a scheduled job (using Vercel Cron or similar) to periodically delete expired events and their associated photos based on deletion_at timestamp.
Gemini Moderation: When moderation is enabled, send uploaded images to Gemini API for safety analysis before displaying them. Flag suspicious content but let the host make final deletion decisions.
