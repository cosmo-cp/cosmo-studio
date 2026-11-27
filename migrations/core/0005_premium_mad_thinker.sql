ALTER TABLE "Message" RENAME COLUMN "title" TO "content";--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "lastMessage" text;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "lastMessageAt" timestamp;