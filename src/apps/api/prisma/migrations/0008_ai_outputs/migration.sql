CREATE TABLE "ai_outputs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" TEXT NOT NULL,
  "stakeholder_id" UUID,
  "instrument_id" UUID,
  "document_type" TEXT,
  "input_object_key" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "confidence" DECIMAL(5,4) NOT NULL,
  "low_confidence" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "corrected_result" JSONB,
  "reviewed_by" UUID,
  "review_note" TEXT,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_outputs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_outputs_kind_status_created_at_idx" ON "ai_outputs"("kind", "status", "created_at");
