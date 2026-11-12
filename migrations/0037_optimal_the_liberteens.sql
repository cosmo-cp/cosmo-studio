CREATE TYPE "public"."task_comment_author_type" AS ENUM('human', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('not_started', 'in_progress', 'done', 'failed', 'cancelled', 'closed');--> statement-breakpoint
CREATE TABLE "Task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "task_status" DEFAULT 'not_started' NOT NULL,
	"workspacePath" text NOT NULL,
	"runtime" text DEFAULT 'model' NOT NULL,
	"provider" text,
	"modelId" text,
	"agentId" uuid,
	"nextTaskId" uuid,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskComment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taskId" uuid NOT NULL,
	"authorType" "task_comment_author_type" NOT NULL,
	"authorLabel" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_nextTaskId_Task_id_fk" FOREIGN KEY ("nextTaskId") REFERENCES "public"."Task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "Task" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_workspace_path_idx" ON "Task" USING btree ("workspacePath");--> statement-breakpoint
CREATE INDEX "task_updated_at_idx" ON "Task" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "task_next_task_id_idx" ON "Task" USING btree ("nextTaskId");--> statement-breakpoint
CREATE INDEX "task_comment_task_id_idx" ON "TaskComment" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "task_comment_created_at_idx" ON "TaskComment" USING btree ("createdAt");