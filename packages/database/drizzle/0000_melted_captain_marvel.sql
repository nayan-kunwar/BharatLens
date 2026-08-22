CREATE TYPE "public"."analysis_confidence" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('INGESTED', 'NORMALIZED', 'DUPLICATE', 'REJECTED', 'LINKED');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('FACT', 'ANALYSIS', 'SCENARIO', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('CANDIDATE', 'DRAFT', 'ANALYZED', 'REVIEW_REQUIRED', 'PUBLISHED', 'UPDATED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."evidence_strength" AS ENUM('WEAK', 'MODERATE', 'STRONG');--> statement-breakpoint
CREATE TYPE "public"."impact_category" AS ENUM('ENERGY', 'TRADE', 'ECONOMY', 'SECURITY', 'DEFENCE', 'DIPLOMACY', 'TECHNOLOGY', 'SUPPLY_CHAIN', 'INDIAN_CITIZENS');--> statement-breakpoint
CREATE TYPE "public"."impact_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."importance_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('NEWS_AGENCY', 'NEWSPAPER', 'GOVERNMENT', 'INTERNATIONAL_ORG', 'THINK_TANK', 'OTHER');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" varchar(200),
	"title" varchar(500) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"author" varchar(200),
	"published_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text,
	"content_hash" varchar(64),
	"status" "article_status" DEFAULT 'INGESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"source_id" uuid,
	"article_id" uuid,
	"statement" text NOT NULL,
	"type" "claim_type" NOT NULL,
	"status" "claim_status" DEFAULT 'PENDING' NOT NULL,
	"evidence_strength" "evidence_strength" DEFAULT 'WEAK' NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"independent_source_count" integer DEFAULT 0 NOT NULL,
	"official_source_count" integer DEFAULT 0 NOT NULL,
	"evidence_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"article_id" uuid,
	"excerpt" varchar(500),
	"url" varchar(1000) NOT NULL,
	"published_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" char(2) NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_articles" (
	"event_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	CONSTRAINT "event_articles_event_id_article_id_pk" PRIMARY KEY("event_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "event_countries" (
	"event_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	CONSTRAINT "event_countries_event_id_country_id_pk" PRIMARY KEY("event_id","country_id")
);
--> statement-breakpoint
CREATE TABLE "event_topics" (
	"event_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	CONSTRAINT "event_topics_event_id_topic_id_pk" PRIMARY KEY("event_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "event_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"title" varchar(300) NOT NULL,
	"body" text,
	"impact_change" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"summary" text,
	"description" text,
	"event_type" varchar(80),
	"status" "event_status" DEFAULT 'CANDIDATE' NOT NULL,
	"importance" "importance_level" DEFAULT 'MEDIUM' NOT NULL,
	"occurred_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"current_impact_assessment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "assessment_status" DEFAULT 'DRAFT' NOT NULL,
	"overall_level" "impact_level" NOT NULL,
	"reasoning" text NOT NULL,
	"evidence_strength" "evidence_strength" NOT NULL,
	"analysis_confidence" "analysis_confidence" NOT NULL,
	"model_name" varchar(120),
	"prompt_version" varchar(80),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_category_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"category" "impact_category" NOT NULL,
	"level" "impact_level" NOT NULL,
	"reasoning" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"type" "source_type" NOT NULL,
	"homepage_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_articles" ADD CONSTRAINT "event_articles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_articles" ADD CONSTRAINT "event_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_countries" ADD CONSTRAINT "event_countries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_countries" ADD CONSTRAINT "event_countries_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_topics" ADD CONSTRAINT "event_topics_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_topics" ADD CONSTRAINT "event_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_updates" ADD CONSTRAINT "event_updates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_current_impact_assessment_id_impact_assessments_id_fk" FOREIGN KEY ("current_impact_assessment_id") REFERENCES "public"."impact_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_assessments" ADD CONSTRAINT "impact_assessments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_category_levels" ADD CONSTRAINT "impact_category_levels_assessment_id_impact_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."impact_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_items" ADD CONSTRAINT "watch_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_url_idx" ON "articles" USING btree ("url");--> statement-breakpoint
CREATE INDEX "articles_source_id_idx" ON "articles" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_source_external_id_idx" ON "articles" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "claims_event_id_idx" ON "claims" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "evidence_claim_id_idx" ON "evidence" USING btree ("claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_code_idx" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_slug_idx" ON "countries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "event_updates_event_id_idx" ON "event_updates" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_occurred_at_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "events_published_at_idx" ON "events" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "events_current_impact_assessment_id_idx" ON "events" USING btree ("current_impact_assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "impact_assessments_event_id_version_idx" ON "impact_assessments" USING btree ("event_id","version");--> statement-breakpoint
CREATE INDEX "impact_assessments_event_id_idx" ON "impact_assessments" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "impact_category_levels_assessment_category_idx" ON "impact_category_levels" USING btree ("assessment_id","category");--> statement-breakpoint
CREATE INDEX "watch_items_event_id_idx" ON "watch_items" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_slug_idx" ON "sources" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");