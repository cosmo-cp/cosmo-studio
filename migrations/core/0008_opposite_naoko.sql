CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
ALTER TABLE "Message" RENAME COLUMN "content" TO "text";--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "role" "message_role";--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "reasoning" text;