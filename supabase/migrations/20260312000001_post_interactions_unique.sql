-- Add unique constraint so interaction upserts are idempotent
alter table post_interactions
  drop constraint if exists post_interactions_unique_event;

alter table post_interactions
  add constraint post_interactions_unique_event
  unique (post_id, user_id, event_type);
