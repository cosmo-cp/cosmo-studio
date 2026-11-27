CREATE TABLE "GuardrailsConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"injectionEnabled" boolean DEFAULT true NOT NULL,
	"injectionMode" text DEFAULT 'heuristic' NOT NULL,
	"injectionThreshold" double precision DEFAULT 0.7 NOT NULL,
	"leakageEnabled" boolean DEFAULT true NOT NULL,
	"leakageMode" text DEFAULT 'heuristic' NOT NULL,
	"leakageThreshold" double precision DEFAULT 0.7 NOT NULL,
	"piiEnabled" boolean DEFAULT true NOT NULL,
	"piiMode" text DEFAULT 'redact' NOT NULL,
	"secretEnabled" boolean DEFAULT true NOT NULL,
	"secretMode" text DEFAULT 'block' NOT NULL
);
