CREATE TABLE "WebSearchConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"apiKey" text NOT NULL,
	CONSTRAINT "WebSearchConfig_type_unique" UNIQUE("type")
);
