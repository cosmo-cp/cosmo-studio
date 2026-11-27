ALTER TABLE "Model" ADD COLUMN "contextWindow" integer DEFAULT 128000;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "maxOutputWindow" integer DEFAULT 4096;