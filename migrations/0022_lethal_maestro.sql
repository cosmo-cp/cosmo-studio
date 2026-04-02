CREATE TABLE "Command" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"template" text NOT NULL,
	"argumentLabel" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Command_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "Message" ALTER COLUMN "createdAt" SET DEFAULT now();