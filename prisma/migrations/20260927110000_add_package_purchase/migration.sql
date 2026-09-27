CREATE TYPE "PackageAudience" AS ENUM ('DEVELOPERS', 'AGENCIES', 'AGENTS', 'ECOSYSTEM_PARTNERS');
CREATE TYPE "PackagePurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE "PackageEntitlementStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "package_purchases" (
  "id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "package_name" TEXT NOT NULL,
  "audience" "PackageAudience" NOT NULL,
  "purchaser_name" TEXT NOT NULL,
  "purchaser_email" TEXT NOT NULL,
  "user_id" TEXT,
  "price" INTEGER NOT NULL,
  "tax_amount" INTEGER NOT NULL DEFAULT 0,
  "total_amount" INTEGER NOT NULL,
  "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PackagePurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "razorpay_order_id" TEXT,
  "razorpay_payment_id" TEXT,
  "razorpay_signature" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "order_lease_until" TIMESTAMP(3),
  "notes" JSONB,
  "paid_at" TIMESTAMP(3),
  "claimed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "package_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "package_purchases_razorpay_order_id_key" ON "package_purchases"("razorpay_order_id");
CREATE UNIQUE INDEX "package_purchases_razorpay_payment_id_key" ON "package_purchases"("razorpay_payment_id");
CREATE UNIQUE INDEX "package_purchases_idempotency_key_key" ON "package_purchases"("idempotency_key");
CREATE INDEX "package_purchases_purchaser_email_idx" ON "package_purchases"("purchaser_email");
CREATE INDEX "package_purchases_user_id_idx" ON "package_purchases"("user_id");
CREATE INDEX "package_purchases_audience_status_idx" ON "package_purchases"("audience", "status");
CREATE INDEX "package_purchases_created_at_idx" ON "package_purchases"("created_at");

ALTER TABLE "package_purchases"
  ADD CONSTRAINT "package_purchases_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "package_entitlements" (
  "id" TEXT NOT NULL,
  "purchase_id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "package_name" TEXT NOT NULL,
  "audience" "PackageAudience" NOT NULL,
  "purchaser_email" TEXT NOT NULL,
  "user_id" TEXT,
  "status" "PackageEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
  "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "package_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "package_entitlements_purchase_id_key" ON "package_entitlements"("purchase_id");
CREATE INDEX "package_entitlements_user_id_status_idx" ON "package_entitlements"("user_id", "status");
CREATE INDEX "package_entitlements_purchaser_email_status_idx" ON "package_entitlements"("purchaser_email", "status");
ALTER TABLE "package_entitlements"
  ADD CONSTRAINT "package_entitlements_purchase_id_fkey"
  FOREIGN KEY ("purchase_id") REFERENCES "package_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_entitlements"
  ADD CONSTRAINT "package_entitlements_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_webhooks" ADD COLUMN "package_purchase_id" TEXT;
CREATE INDEX "payment_webhooks_package_purchase_id_idx" ON "payment_webhooks"("package_purchase_id");
ALTER TABLE "payment_webhooks"
  ADD CONSTRAINT "payment_webhooks_package_purchase_id_fkey"
  FOREIGN KEY ("package_purchase_id") REFERENCES "package_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;