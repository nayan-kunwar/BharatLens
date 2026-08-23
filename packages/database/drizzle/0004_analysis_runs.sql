CREATE TYPE "public"."analysis_run_status" AS ENUM('RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "analysis_run_status" DEFAULT 'RUNNING' NOT NULL,
	"model_name" varchar(120) NOT NULL,
	"prompt_version" varchar(80) NOT NULL,
	"input_references" jsonb NOT NULL,
	"output" jsonb,
	"error_message" text,
	"generated_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_runs_event_id_idx" ON "analysis_runs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs" USING btree ("status");
