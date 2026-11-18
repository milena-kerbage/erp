-- Relevância do produto na loja (1 = por último, 5 = primeiro). A ordem "Relevância" das listagens, da
-- home e da busca passa a ser: relevância (maior primeiro) e, no empate, a ordem manual de sempre.
BEGIN;
ALTER TABLE erp_core.loja_produtos ADD COLUMN IF NOT EXISTS relevancia INTEGER NOT NULL DEFAULT 3;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loja_produtos_relevancia_check') THEN
    ALTER TABLE erp_core.loja_produtos ADD CONSTRAINT loja_produtos_relevancia_check CHECK (relevancia BETWEEN 1 AND 5);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS loja_produtos_vitrine ON erp_core.loja_produtos (status, relevancia DESC, ordem);
COMMIT;
