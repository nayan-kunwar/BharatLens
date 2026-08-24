CREATE TYPE "public"."chain_node_kind" AS ENUM('ROOT', 'CHANNEL', 'IMPACT');--> statement-breakpoint
CREATE TABLE "impact_chains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "assessment_status" DEFAULT 'DRAFT' NOT NULL,
	"reasoning" text,
	"model_name" varchar(120),
	"prompt_version" varchar(80),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "impact_chains" ADD CONSTRAINT "impact_chains_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "impact_chains_event_id_version_idx" ON "impact_chains" USING btree ("event_id","version");--> statement-breakpoint
CREATE INDEX "impact_chains_event_id_idx" ON "impact_chains" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "impact_chains_status_idx" ON "impact_chains" USING btree ("status");--> statement-breakpoint
CREATE TABLE "impact_chain_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" uuid NOT NULL,
	"kind" "chain_node_kind" NOT NULL,
	"label" varchar(200) NOT NULL,
	"description" text,
	"category" "impact_category",
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
ALTER TABLE "impact_chain_nodes" ADD CONSTRAINT "impact_chain_nodes_chain_id_impact_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."impact_chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "impact_chain_nodes_chain_id_idx" ON "impact_chain_nodes" USING btree ("chain_id");--> statement-breakpoint
CREATE TABLE "impact_chain_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" uuid NOT NULL,
	"from_node_id" uuid NOT NULL,
	"to_node_id" uuid NOT NULL,
	"label" varchar(200)
);--> statement-breakpoint
ALTER TABLE "impact_chain_edges" ADD CONSTRAINT "impact_chain_edges_chain_id_impact_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."impact_chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_chain_edges" ADD CONSTRAINT "impact_chain_edges_from_node_id_impact_chain_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."impact_chain_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_chain_edges" ADD CONSTRAINT "impact_chain_edges_to_node_id_impact_chain_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."impact_chain_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "impact_chain_edges_chain_from_to_idx" ON "impact_chain_edges" USING btree ("chain_id","from_node_id","to_node_id");--> statement-breakpoint
CREATE INDEX "impact_chain_edges_chain_id_idx" ON "impact_chain_edges" USING btree ("chain_id");--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "current_impact_chain_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_current_impact_chain_id_impact_chains_id_fk" FOREIGN KEY ("current_impact_chain_id") REFERENCES "public"."impact_chains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_current_impact_chain_id_idx" ON "events" USING btree ("current_impact_chain_id");
