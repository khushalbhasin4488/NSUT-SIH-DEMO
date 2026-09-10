ALTER TABLE "alerts" ADD COLUMN "provider_reference" TEXT, ADD COLUMN "delivered_at" TIMESTAMPTZ;
CREATE INDEX "alerts_provider_reference_idx" ON "alerts"("provider_reference");
