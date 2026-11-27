ALTER TABLE "ModelProvider" RENAME COLUMN "nickName" TO "name";--> statement-breakpoint
ALTER TABLE "ModelProvider" ADD CONSTRAINT "ModelProvider_name_unique" UNIQUE("name");