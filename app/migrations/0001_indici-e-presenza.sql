-- Prima dei vincoli unici tolgo i duplicati che lo schema precedente permetteva.
DELETE FROM "workspace_members" a USING "workspace_members" b
    WHERE a."workspace_id" = b."workspace_id" AND a."user_id" = b."user_id"
    AND (a."joined_at", a."id") > (b."joined_at", b."id");--> statement-breakpoint
DELETE FROM "channel_members" a USING "channel_members" b
    WHERE a."channel_id" = b."channel_id" AND a."user_id" = b."user_id"
    AND (a."joined_at", a."id") > (b."joined_at", b."id");--> statement-breakpoint
-- Canali con lo stesso nome nello stesso workspace: il più vecchio resta, gli altri ricevono un suffisso.
UPDATE "channels" c SET "name" = c."name" || '-' || left(c."id", 4)
    WHERE EXISTS (
        SELECT 1 FROM "channels" o
        WHERE o."workspace_id" = c."workspace_id" AND o."name" = c."name"
        AND (o."created_at", o."id") < (c."created_at", c."id")
    );--> statement-breakpoint
DROP TABLE IF EXISTS "user_presence" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';--> statement-breakpoint
UPDATE "users" SET "status" = 'offline' WHERE "status" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_members_channel_user_idx" ON "channel_members" USING btree ("channel_id","user_id");--> statement-breakpoint
CREATE INDEX "channel_members_user_idx" ON "channel_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_name_idx" ON "channels" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "direct_messages_pair_created_idx" ON "direct_messages" USING btree ("sender_id","receiver_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_receiver_idx" ON "direct_messages" USING btree ("receiver_id","sender_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_channel_created_idx" ON "messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");