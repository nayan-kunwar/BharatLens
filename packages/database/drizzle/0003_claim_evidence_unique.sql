CREATE UNIQUE INDEX "claims_event_id_statement_idx" ON "claims" USING btree ("event_id","statement");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_claim_id_url_idx" ON "evidence" USING btree ("claim_id","url");
