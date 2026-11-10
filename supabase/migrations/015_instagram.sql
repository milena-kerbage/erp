BEGIN;
SET LOCAL search_path TO erp_meta;
CREATE TABLE IF NOT EXISTS instagram_connections (
 subject_hash TEXT PRIMARY KEY, account_hash TEXT NOT NULL, app_id TEXT NOT NULL, account_id TEXT NOT NULL,
 username TEXT NOT NULL, token_cipher TEXT NOT NULL, scopes_json TEXT NOT NULL, expires_at BIGINT NOT NULL,
 refreshed_at BIGINT NOT NULL, connected_at BIGINT NOT NULL, fields_json TEXT NOT NULL DEFAULT '[]');
CREATE UNIQUE INDEX IF NOT EXISTS instagram_one_account ON instagram_connections(app_id);
CREATE TABLE IF NOT EXISTS instagram_oauth_states (
 hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_hash TEXT NOT NULL, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS instagram_events (
 id TEXT PRIMARY KEY, app_id TEXT NOT NULL, account_id TEXT NOT NULL, kind TEXT NOT NULL,
 payload_cipher TEXT NOT NULL, received_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS instagram_event_time ON instagram_events(received_at);
CREATE TABLE IF NOT EXISTS instagram_event_subjects (
 event_id TEXT NOT NULL REFERENCES instagram_events(id) ON DELETE CASCADE, subject_hash TEXT NOT NULL,
 PRIMARY KEY(event_id, subject_hash));
CREATE INDEX IF NOT EXISTS instagram_event_subject ON instagram_event_subjects(subject_hash);
CREATE TABLE IF NOT EXISTS instagram_suppression (subject_hash TEXT PRIMARY KEY, created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS instagram_deletion_requests (
 code TEXT PRIMARY KEY, subject_hash TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending_review','completed','no_matching_data')),
 created_at BIGINT NOT NULL, local_deleted_at BIGINT NOT NULL, reviewed_at BIGINT, review_note TEXT);
CREATE TABLE IF NOT EXISTS instagram_lifecycle (app_id TEXT PRIMARY KEY, changed_at BIGINT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS instagram_pending_deletion ON instagram_deletion_requests(subject_hash) WHERE status = 'pending_review';
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_event_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_lifecycle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA erp_meta FROM PUBLIC, anon, authenticated;
COMMIT;
