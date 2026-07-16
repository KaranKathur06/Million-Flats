-- Adds missing `users.last_login` column.
-- Prisma schema expects User.lastLogin (nullable timestamp).

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP(3);
