CREATE TABLE "AcpAgent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'custom' NOT NULL,
	"registryId" text,
	"version" text,
	"command" text NOT NULL,
	"args" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"env" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"defaultCwd" text,
	"authMethodId" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"installStatus" text DEFAULT 'installed' NOT NULL,
	"mcpServerIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AcpAgent_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "AcpRegistryCache" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"data" jsonb NOT NULL,
	"fetchedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WorkflowRunEvent" ALTER COLUMN "eventType" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."workflow_run_event_type";--> statement-breakpoint
CREATE TYPE "public"."workflow_run_event_type" AS ENUM('created', 'started', 'progress', 'waiting_approval', 'completed', 'failed', 'cancelled');--> statement-breakpoint
ALTER TABLE "WorkflowRunEvent" ALTER COLUMN "eventType" SET DATA TYPE "public"."workflow_run_event_type" USING "eventType"::"public"."workflow_run_event_type";--> statement-breakpoint
ALTER TABLE "WorkflowRun" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "WorkflowRun" ALTER COLUMN "status" SET DEFAULT 'queued'::text;--> statement-breakpoint
ALTER TABLE "WorkflowRunEvent" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."workflow_run_status";--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled');--> statement-breakpoint
ALTER TABLE "WorkflowRun" ALTER COLUMN "status" SET DEFAULT 'queued'::"public"."workflow_run_status";--> statement-breakpoint
ALTER TABLE "WorkflowRun" ALTER COLUMN "status" SET DATA TYPE "public"."workflow_run_status" USING "status"::"public"."workflow_run_status";--> statement-breakpoint
ALTER TABLE "WorkflowRunEvent" ALTER COLUMN "status" SET DATA TYPE "public"."workflow_run_status" USING "status"::"public"."workflow_run_status";--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "selectedRuntime" text DEFAULT 'model';--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "selectedAgentId" uuid;