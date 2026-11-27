ALTER TABLE "Persona" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "system_prompt" text;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "model_identifier" text;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "temperature" real;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "reasoning_effort" text;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "tool_access_mode" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "allowed_mcp_servers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "allowed_tools" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Persona" ADD COLUMN "web_search_enabled" boolean DEFAULT true NOT NULL;