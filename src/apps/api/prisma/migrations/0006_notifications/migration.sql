ALTER TABLE "stakeholders" ADD COLUMN "notification_preferences" JSONB;
ALTER TABLE "alerts" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "max_attempts" INTEGER NOT NULL DEFAULT 3, ADD COLUMN "failure_reason" TEXT;
