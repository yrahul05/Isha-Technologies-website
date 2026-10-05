CREATE INDEX IF NOT EXISTS "documents_updated_idx" ON "documents" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_issue_idx" ON "invoices" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_status_starts_idx" ON "meetings" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_paid_on_idx" ON "payments" USING btree ("paid_on");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assignee_status_idx" ON "tasks" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_status_activity_idx" ON "tickets" USING btree ("status","last_activity_at");