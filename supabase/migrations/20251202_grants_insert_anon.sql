-- Ensure roles have table privileges matching RLS policies

GRANT INSERT ON photos TO anon;
GRANT INSERT ON moderation_queues TO anon;
GRANT INSERT ON events TO anon;

GRANT INSERT ON photos TO authenticated;
GRANT INSERT ON moderation_queues TO authenticated;
GRANT INSERT ON events TO authenticated;

