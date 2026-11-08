CREATE TYPE "PassportOrderStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

CREATE TABLE "passport_orders" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" "PassportMembershipCategory" NOT NULL,
  "status" "PassportOrderStatus" NOT NULL DEFAULT 'PENDING',
  "idempotency_key" TEXT NOT NULL,
  "provider_receipt" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "razorpay_order_id" TEXT,
  "razorpay_payment_id" TEXT,
  "razorpay_signature" TEXT,
  "order_lease_until" TIMESTAMP(3),
  "amount_refunded" INTEGER NOT NULL DEFAULT 0,
  "paid_at" TIMESTAMP(3),
  "refunded_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "notes" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "passport_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "passport_orders_user_id_key" ON "passport_orders"("user_id");
CREATE UNIQUE INDEX "passport_orders_idempotency_key_key" ON "passport_orders"("idempotency_key");
CREATE UNIQUE INDEX "passport_orders_provider_receipt_key" ON "passport_orders"("provider_receipt");
CREATE UNIQUE INDEX "passport_orders_razorpay_order_id_key" ON "passport_orders"("razorpay_order_id");
CREATE UNIQUE INDEX "passport_orders_razorpay_payment_id_key" ON "passport_orders"("razorpay_payment_id");
CREATE INDEX "passport_orders_status_created_at_idx" ON "passport_orders"("status", "created_at");

ALTER TABLE "passport_orders"
  ADD CONSTRAINT "passport_orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_webhooks" ADD COLUMN "passport_order_id" TEXT;
CREATE INDEX "payment_webhooks_passport_order_id_idx" ON "payment_webhooks"("passport_order_id");
ALTER TABLE "payment_webhooks"
  ADD CONSTRAINT "payment_webhooks_passport_order_id_fkey"
  FOREIGN KEY ("passport_order_id") REFERENCES "passport_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "passport_memberships_qr_code_value_key" ON "passport_memberships"("qr_code_value");
