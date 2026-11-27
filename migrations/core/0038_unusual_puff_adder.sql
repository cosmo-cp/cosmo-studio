CREATE TABLE "Workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"canonicalPath" text NOT NULL,
	"rawPath" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Workspace_canonicalPath_unique" UNIQUE("canonicalPath")
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "workspaceId" uuid;--> statement-breakpoint
ALTER TABLE "AcpAgent" ADD COLUMN "defaultWorkspaceId" uuid;--> statement-breakpoint
ALTER TABLE "Task" ADD COLUMN "workspaceId" uuid;--> statement-breakpoint
CREATE INDEX "workspace_canonical_path_idx" ON "Workspace" USING btree ("canonicalPath");--> statement-breakpoint
CREATE INDEX "workspace_created_at_idx" ON "Workspace" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AcpAgent" ADD CONSTRAINT "AcpAgent_defaultWorkspaceId_Workspace_id_fk" FOREIGN KEY ("defaultWorkspaceId") REFERENCES "public"."Workspace"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_Workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_workspace_id_idx" ON "Chat" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "task_workspace_id_idx" ON "Task" USING btree ("workspaceId");--> statement-breakpoint
INSERT INTO "Workspace" ("name", "canonicalPath", "rawPath")
SELECT DISTINCT
    CASE 
        WHEN trim(regexp_replace(regexp_replace("defaultCwd", '[/\\]+$', ''), '^.*[/\\]', '')) != '' 
        THEN trim(regexp_replace(regexp_replace("defaultCwd", '[/\\]+$', ''), '^.*[/\\]', '')) 
        ELSE 'Workspace' 
    END AS "name",
    "defaultCwd" AS "canonicalPath",
    "defaultCwd" AS "rawPath"
FROM "AcpAgent"
WHERE "defaultCwd" IS NOT NULL AND trim("defaultCwd") != ''
ON CONFLICT ("canonicalPath") DO NOTHING;--> statement-breakpoint
UPDATE "AcpAgent" a
SET "defaultWorkspaceId" = w."id"
FROM "Workspace" w
WHERE a."defaultCwd" = w."canonicalPath"
  AND a."defaultWorkspaceId" IS NULL;
