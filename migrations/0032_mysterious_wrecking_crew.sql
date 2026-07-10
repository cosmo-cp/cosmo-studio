ALTER TABLE "Chat" ADD COLUMN "syncVersion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "uiMessageId" text;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "uiMessage" jsonb;