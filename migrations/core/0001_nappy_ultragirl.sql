CREATE TABLE "Model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"name" text NOT NULL,
	"modelId" text NOT NULL,
	"providerId" uuid
);
--> statement-breakpoint
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_ModelProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."ModelProvider"("id") ON DELETE no action ON UPDATE no action;