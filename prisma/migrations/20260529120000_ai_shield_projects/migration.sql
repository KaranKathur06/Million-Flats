-- CreateTable
CREATE TABLE "ai_shield_projects" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "is_ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_ai_featured" BOOLEAN NOT NULL DEFAULT false,
    "ai_status" "VerixShieldStatus",
    "confidence_score" DOUBLE PRECISION,
    "fair_value" DOUBLE PRECISION,
    "low_estimate" DOUBLE PRECISION,
    "high_estimate" DOUBLE PRECISION,
    "market_signal_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_shield_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_shield_projects_project_id_key" ON "ai_shield_projects"("project_id");

-- CreateIndex
CREATE INDEX "ai_shield_projects_is_ai_enabled_idx" ON "ai_shield_projects"("is_ai_enabled");

-- CreateIndex
CREATE INDEX "ai_shield_projects_is_ai_featured_idx" ON "ai_shield_projects"("is_ai_featured");

-- AddForeignKey
ALTER TABLE "ai_shield_projects" ADD CONSTRAINT "ai_shield_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
