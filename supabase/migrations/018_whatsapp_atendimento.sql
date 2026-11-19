-- Atendimento nas conversas, no padrão do ERP da Le Ange: situação (aberta, aguardando, resolvida) e responsável por
-- conversa; nota interna e evento do sistema são linhas de `messages` (type 'note' e 'system'), sem coluna nova.
-- A conversa "arquivada" de antes vira "resolvida" (uma coisa só). Aditiva e idempotente.
BEGIN;
SET LOCAL search_path TO erp_whatsapp;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aberta';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

UPDATE contacts SET status = 'resolvida', archived = 0 WHERE archived = 1;

CREATE INDEX IF NOT EXISTS contacts_status ON contacts(status) WHERE status <> 'aberta';
CREATE INDEX IF NOT EXISTS contacts_assignee ON contacts(assignee) WHERE assignee IS NOT NULL;
COMMIT;
