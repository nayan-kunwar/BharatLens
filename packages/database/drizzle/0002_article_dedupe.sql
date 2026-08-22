ALTER TABLE "articles" ADD COLUMN "normalized_title" varchar(500);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "duplicate_of_article_id" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_duplicate_of_article_id_articles_id_fk" FOREIGN KEY ("duplicate_of_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_content_hash_idx" ON "articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "articles_normalized_title_idx" ON "articles" USING btree ("normalized_title");
