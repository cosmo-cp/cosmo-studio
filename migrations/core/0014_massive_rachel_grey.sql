CREATE TYPE "public"."model_modality" AS ENUM('text', 'image', 'audio', 'video', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."model_status" AS ENUM('not_defined', 'deprecated');--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "attachment" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "toolCall" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "status" "model_status" DEFAULT 'not_defined';--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "input_modalities" "model_modality"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "output_modalities" "model_modality"[] DEFAULT '{}' NOT NULL;