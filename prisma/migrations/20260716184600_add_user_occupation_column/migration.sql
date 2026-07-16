-- Adds missing `users.occupation` column.
-- Prisma schema expects User.occupation (nullable text).

ALTER TABLE users
ADD COLUMN IF NOT EXISTS occupation TEXT;
