CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'sow' NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"proposal_id" uuid,
	"document_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"value_paise" bigint DEFAULT 0 NOT NULL,
	"start_date" date,
	"end_date" date,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"renewal_notice_days" integer DEFAULT 30 NOT NULL,
	"signed_at" timestamp with time zone,
	"signed_by" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assignee_id" uuid,
	"due_date" date,
	"done" boolean DEFAULT false NOT NULL,
	"task_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"payment_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price_paise" bigint DEFAULT 0 NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"tax_rate_pct" numeric(5, 2) DEFAULT 18 NOT NULL,
	"amount_paise" bigint DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"client_id" uuid,
	"lead_id" uuid,
	"project_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"valid_until" date,
	"subtotal_paise" bigint DEFAULT 0 NOT NULL,
	"discount_paise" bigint DEFAULT 0 NOT NULL,
	"tax_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"decision_note" text,
	"owner_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"window_key" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"kind" text DEFAULT 'other' NOT NULL,
	"name" text NOT NULL,
	"vendor" text,
	"expires_on" date NOT NULL,
	"cost_paise" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"remind_days" integer DEFAULT 30 NOT NULL,
	"owner_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid,
	"work_date" date NOT NULL,
	"minutes" integer NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "hourly_cost_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "minutes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "minutes_visibility" "visibility" DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "hourly_rate_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_items" ADD CONSTRAINT "renewal_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_items" ADD CONSTRAINT "renewal_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_items" ADD CONSTRAINT "renewal_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_number_uq" ON "contracts" USING btree ("number");--> statement-breakpoint
CREATE INDEX "contracts_client_idx" ON "contracts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "contracts_end_idx" ON "contracts" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "meeting_action_items_meeting_idx" ON "meeting_action_items" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_order_uq" ON "payment_orders" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE INDEX "payment_orders_invoice_idx" ON "payment_orders" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "proposal_items_proposal_idx" ON "proposal_items" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_number_uq" ON "proposals" USING btree ("number");--> statement-breakpoint
CREATE INDEX "proposals_client_idx" ON "proposals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "proposals_lead_idx" ON "proposals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_log_uq" ON "reminder_log" USING btree ("kind","entity_id","window_key");--> statement-breakpoint
CREATE INDEX "renewal_items_expires_idx" ON "renewal_items" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "renewal_items_client_idx" ON "renewal_items" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_idx" ON "time_entries" USING btree ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "time_entries_project_idx" ON "time_entries" USING btree ("project_id");