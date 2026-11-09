BEGIN;
ALTER TABLE IF EXISTS erp_core.lead_attachments ADD COLUMN IF NOT EXISTS object_key TEXT;
ALTER TABLE IF EXISTS erp_auth.profile_photos ADD COLUMN IF NOT EXISTS object_key TEXT;
ALTER TABLE IF EXISTS erp_core.loja_avaliacao_fotos ADD COLUMN IF NOT EXISTS grande_key TEXT;
ALTER TABLE IF EXISTS erp_core.loja_avaliacao_fotos ADD COLUMN IF NOT EXISTS mini_key TEXT;
ALTER TABLE IF EXISTS erp_core.loja_produto_imagens ADD COLUMN IF NOT EXISTS grande_key TEXT;
ALTER TABLE IF EXISTS erp_core.loja_produto_imagens ADD COLUMN IF NOT EXISTS mini_key TEXT;
CREATE TABLE IF NOT EXISTS erp_core.media_uploads (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
 size BIGINT NOT NULL CHECK(size>0 AND size<=134217728), created BIGINT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','verified','published')), public_url TEXT
);
CREATE INDEX IF NOT EXISTS media_uploads_actor ON erp_core.media_uploads(actor,created DESC);
ALTER TABLE IF EXISTS erp_core.media_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON erp_core.media_uploads FROM PUBLIC,anon,authenticated;
COMMIT;
