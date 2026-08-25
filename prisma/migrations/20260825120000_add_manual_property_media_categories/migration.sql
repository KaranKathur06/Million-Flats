-- Additive media categories for the unified manual-property gallery.
ALTER TYPE "ManualPropertyMediaCategory" ADD VALUE IF NOT EXISTS 'LIVING_ROOM';
ALTER TYPE "ManualPropertyMediaCategory" ADD VALUE IF NOT EXISTS 'BEDROOM';
ALTER TYPE "ManualPropertyMediaCategory" ADD VALUE IF NOT EXISTS 'KITCHEN';
ALTER TYPE "ManualPropertyMediaCategory" ADD VALUE IF NOT EXISTS 'BATHROOM';
ALTER TYPE "ManualPropertyMediaCategory" ADD VALUE IF NOT EXISTS 'VIEW';
ALTER TYPE "ManualPropertyMediaCategory" ADD VALUE IF NOT EXISTS 'OTHER';
