BEGIN;
CREATE INDEX IF NOT EXISTS leads_active_created_cursor ON erp_core.leads(created DESC,id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS leads_funnel_created_cursor ON erp_core.leads(funnel_id,created DESC,id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS leads_archived_created_cursor ON erp_core.leads(created DESC,id DESC) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS records_finance_reference ON erp_core.records((CASE WHEN data_json::jsonb ->> 'status'='paid' THEN data_json::jsonb ->> 'paidAt' ELSE data_json::jsonb ->> 'dueDate' END)) WHERE resource='financeiro' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS erp_audit_leads_created ON erp_core.erp_audit(created DESC,id DESC) WHERE resource='leads';
COMMIT;
