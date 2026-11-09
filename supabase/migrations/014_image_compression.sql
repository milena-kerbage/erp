BEGIN;
CREATE TABLE IF NOT EXISTS erp_core.image_variants (
 kind TEXT NOT NULL CHECK(kind IN ('product','review','profile','attachment','asset')),
 owner_id TEXT NOT NULL, variant TEXT NOT NULL CHECK(variant IN ('large','small')),
 format TEXT NOT NULL CHECK(format IN ('webp','avif')), object_key TEXT,
 content BYTEA NOT NULL DEFAULT '\x', size BIGINT NOT NULL CHECK(size>0),
 width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0),
 original_size BIGINT NOT NULL CHECK(original_size>0), profile TEXT NOT NULL,
 created BIGINT NOT NULL, public_url TEXT,
 PRIMARY KEY(kind,owner_id,variant,format)
);
ALTER TABLE erp_core.image_variants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON erp_core.image_variants FROM PUBLIC,anon,authenticated;
COMMIT;
