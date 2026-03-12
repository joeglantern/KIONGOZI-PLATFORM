-- REPLICA IDENTITY FULL is required for filtered Supabase realtime
-- subscriptions (e.g. filter: `user_id=eq.<id>`) to deliver row data.
-- notifications is already in supabase_realtime publication.
ALTER TABLE notifications REPLICA IDENTITY FULL;
