-- Adds missing `users.city` column.
-- Prisma schema expects User.city (nullable text).

ALTER TABLE users
ADD COLUMN IF NOT EXISTS city TEXT;
