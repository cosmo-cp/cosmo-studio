ALTER TABLE "ModelProvider" DROP CONSTRAINT "ModelProvider_name_unique";--> statement-breakpoint
ALTER TABLE "Persona" DROP CONSTRAINT "Persona_name_unique";--> statement-breakpoint
ALTER TABLE "Command" DROP CONSTRAINT "Command_name_unique";--> statement-breakpoint
ALTER TABLE "McpServer" DROP CONSTRAINT "McpServer_name_unique";--> statement-breakpoint
ALTER TABLE "WebSearchConfig" DROP CONSTRAINT "WebSearchConfig_type_unique";--> statement-breakpoint
ALTER TABLE "AcpAgent" DROP CONSTRAINT "AcpAgent_name_unique";--> statement-breakpoint
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_canonicalPath_unique";--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "ModelProvider" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "ModelProvider" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Command" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Command" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "McpServer" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "McpServer" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "WebSearchConfig" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "WebSearchConfig" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "AcpAgent" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "AcpAgent" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Workflow" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Workflow" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "WorkflowRun" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "WorkflowRun" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "WorkflowRunEvent" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "WorkflowRunEvent" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "WorkflowVersion" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "WorkflowVersion" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Task" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Task" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "TaskComment" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "TaskComment" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "Workspace" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "Workspace" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "UserProfile" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "UserProfile" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "ExperimentalFlag" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "ExperimentalFlag" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "GuardrailsConfig" ADD COLUMN "organizationId" uuid;--> statement-breakpoint
ALTER TABLE "GuardrailsConfig" ADD COLUMN "userId" uuid;--> statement-breakpoint
CREATE INDEX "chat_org_updated_at_idx" ON "Chat" USING btree ("organizationId","updatedAt");--> statement-breakpoint
CREATE INDEX "message_organization_id_idx" ON "Message" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "model_organization_id_idx" ON "Model" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "model_provider_organization_id_idx" ON "ModelProvider" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "persona_organization_id_idx" ON "Persona" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "command_organization_id_idx" ON "Command" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "mcp_server_organization_id_idx" ON "McpServer" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "web_search_config_organization_id_idx" ON "WebSearchConfig" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "acp_agent_organization_id_idx" ON "AcpAgent" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "workflow_organization_id_idx" ON "Workflow" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "task_organization_id_idx" ON "Task" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "task_comment_organization_id_idx" ON "TaskComment" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "workspace_organization_id_idx" ON "Workspace" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "user_profile_organization_id_idx" ON "UserProfile" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "guardrails_config_organization_id_idx" ON "GuardrailsConfig" USING btree ("organizationId");--> statement-breakpoint
ALTER TABLE "ModelProvider" ADD CONSTRAINT "model_provider_org_name_unique" UNIQUE NULLS NOT DISTINCT("organizationId","name");--> statement-breakpoint
ALTER TABLE "Persona" ADD CONSTRAINT "persona_org_name_unique" UNIQUE NULLS NOT DISTINCT("organizationId","name");--> statement-breakpoint
ALTER TABLE "Command" ADD CONSTRAINT "command_org_name_unique" UNIQUE NULLS NOT DISTINCT("organizationId","name");--> statement-breakpoint
ALTER TABLE "McpServer" ADD CONSTRAINT "mcp_server_org_name_unique" UNIQUE NULLS NOT DISTINCT("organizationId","name");--> statement-breakpoint
ALTER TABLE "WebSearchConfig" ADD CONSTRAINT "web_search_config_org_type_unique" UNIQUE NULLS NOT DISTINCT("organizationId","type");--> statement-breakpoint
ALTER TABLE "AcpAgent" ADD CONSTRAINT "acp_agent_org_name_unique" UNIQUE NULLS NOT DISTINCT("organizationId","name");--> statement-breakpoint
ALTER TABLE "Workspace" ADD CONSTRAINT "workspace_org_canonical_path_unique" UNIQUE NULLS NOT DISTINCT("organizationId","canonicalPath");--> statement-breakpoint
ALTER TABLE "GuardrailsConfig" ADD CONSTRAINT "guardrails_config_org_unique" UNIQUE NULLS NOT DISTINCT("organizationId");