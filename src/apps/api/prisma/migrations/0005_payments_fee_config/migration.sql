ALTER TABLE "payments" ADD COLUMN "idempotency_key" TEXT, ADD COLUMN "receipt_no" TEXT;
UPDATE "payments" SET "idempotency_key" = "id"::text WHERE "idempotency_key" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET NOT NULL;
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE UNIQUE INDEX "payments_receipt_no_key" ON "payments"("receipt_no");
CREATE TABLE "fee_configs" ("id" UUID NOT NULL DEFAULT gen_random_uuid(),"category" TEXT NOT NULL,"service_type" TEXT NOT NULL DEFAULT 'VERIFICATION',"amount" DECIMAL(12,2) NOT NULL,"created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "fee_configs_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "fee_configs_category_service_type_key" ON "fee_configs"("category","service_type");
