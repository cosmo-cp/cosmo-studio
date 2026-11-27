ALTER TABLE "Model" ADD COLUMN "reasoning" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "releaseDate" timestamp;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "lastUpdatedByProvider" timestamp;