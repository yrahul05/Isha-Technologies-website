CREATE TYPE "public"."otp_purpose" AS ENUM('password_reset', 'password_change', 'email_change');--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE 'requested' BEFORE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE 'rejected' BEFORE 'cancelled';--> statement-breakpoint
CREATE TABLE "file_chunks" (
	"key" text NOT NULL,
	"part" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_chunks_key_part_pk" PRIMARY KEY("key","part")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"code_hash" text NOT NULL,
	"target" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_request_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"requested_by" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"desired_due_date" date,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "storage_driver" text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "scan_status" text DEFAULT 'not_scanned' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_mode" text DEFAULT 'gst_auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_label" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_profile" text DEFAULT 'domestic' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "requested_by" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_request_comments" ADD CONSTRAINT "task_request_comments_request_id_task_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."task_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_request_comments" ADD CONSTRAINT "task_request_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_requests" ADD CONSTRAINT "task_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_requests" ADD CONSTRAINT "task_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_requests" ADD CONSTRAINT "task_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_requests" ADD CONSTRAINT "task_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_requests" ADD CONSTRAINT "task_requests_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_codes_user_idx" ON "otp_codes" USING btree ("user_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "task_request_comments_request_idx" ON "task_request_comments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "task_requests_client_idx" ON "task_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "task_requests_status_idx" ON "task_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;