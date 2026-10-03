-- Data-retention guarantees enforced by PostgreSQL itself, so no code path
-- (bug, script or console mistake through the app role) can break them.
--   • invoices and payments are never deleted (cancel / record instead)
--   • audit_logs are append-only (no UPDATE, no DELETE)
--   • an issued invoice number (anything not starting with DRAFT-) never changes

CREATE OR REPLACE FUNCTION isha_forbid_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% rows are retained permanently and cannot be deleted', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION isha_forbid_audit_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION isha_lock_invoice_number() RETURNS trigger AS $$
BEGIN
  IF OLD.number NOT LIKE 'DRAFT-%' AND NEW.number IS DISTINCT FROM OLD.number THEN
    RAISE EXCEPTION 'invoice number % is issued and cannot be changed', OLD.number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER invoices_no_delete BEFORE DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION isha_forbid_delete();
--> statement-breakpoint
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments FOR EACH ROW EXECUTE FUNCTION isha_forbid_delete();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION isha_forbid_delete();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION isha_forbid_audit_update();
--> statement-breakpoint
CREATE TRIGGER invoices_number_locked BEFORE UPDATE OF number ON invoices FOR EACH ROW EXECUTE FUNCTION isha_lock_invoice_number();
