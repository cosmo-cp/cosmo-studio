ALTER TABLE "Model" DROP CONSTRAINT "Model_providerId_ModelProvider_id_fk";
--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_ModelProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."ModelProvider"("id") ON DELETE cascade ON UPDATE no action;