ALTER TYPE "public"."workflow_run_event_type" ADD VALUE 'waiting_approval' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_run_event_type" ADD VALUE 'canceled' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."workflow_run_status" ADD VALUE 'waiting_approval' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_run_status" ADD VALUE 'canceled' BEFORE 'cancelled';