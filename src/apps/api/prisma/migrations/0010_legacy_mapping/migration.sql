ALTER TABLE "legacy_imports" ADD COLUMN "validation_errors" JSONB;
CREATE TABLE "legacy_state_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_system" TEXT NOT NULL,
  "target_entity_type" TEXT NOT NULL,
  "field_map" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legacy_state_mappings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "legacy_state_mappings_source_system_target_entity_type_key" ON "legacy_state_mappings"("source_system", "target_entity_type");
