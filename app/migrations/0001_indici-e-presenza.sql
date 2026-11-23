-- Indici, vincoli unici e presenza su users. Ripetibile: ogni passo controlla se è già stato fatto.

-- 1. Duplicati che lo schema precedente permetteva.
-- Tra due iscrizioni della stessa persona resta quella col ruolo più alto (owner > admin > member),
-- a parità di ruolo la più vecchia.
DELETE FROM "workspace_members" a USING "workspace_members" b
    WHERE a."workspace_id" = b."workspace_id" AND a."user_id" = b."user_id" AND a."id" <> b."id"
    AND (
        CASE b."role" WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        b."joined_at",
        b."id"
    ) < (
        CASE a."role" WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        a."joined_at",
        a."id"
    );--> statement-breakpoint
DELETE FROM "channel_members" a USING "channel_members" b
    WHERE a."channel_id" = b."channel_id" AND a."user_id" = b."user_id"
    AND (a."joined_at", a."id") > (b."joined_at", b."id");--> statement-breakpoint
-- Canali con lo stesso nome nello stesso workspace: il più vecchio resta,
-- gli altri ricevono i primi 8 caratteri del proprio id come suffisso.
UPDATE "channels" c SET "name" = c."name" || '-' || left(c."id", 8)
    WHERE EXISTS (
        SELECT 1 FROM "channels" o
        WHERE o."workspace_id" = c."workspace_id" AND o."name" = c."name"
        AND (o."created_at", o."id") < (c."created_at", c."id")
    );--> statement-breakpoint

-- 2. Presenza: una sola fonte, users.status, più l'ultimo accesso.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
    IF to_regclass('public.user_presence') IS NOT NULL THEN
        UPDATE "users" u SET "last_seen_at" = p."last_seen"
            FROM "user_presence" p WHERE p."user_id" = u."id";
    END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "user_presence" CASCADE;--> statement-breakpoint
-- Il vecchio default era 'online': nessuno è connesso finché il WebSocket non lo dice.
UPDATE "users" SET "status" = 'offline';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint

-- 3. Indici e vincoli.
CREATE UNIQUE INDEX IF NOT EXISTS "channel_members_channel_user_idx" ON "channel_members" USING btree ("channel_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_members_user_idx" ON "channel_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channels_workspace_name_idx" ON "channels" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_pair_created_idx" ON "direct_messages" USING btree ("sender_id","receiver_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_channel_created_idx" ON "messages" USING btree ("channel_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");
