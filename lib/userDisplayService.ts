import type { User } from "@prisma/client";

export function getLegalFullName(user: Pick<User, "fullName" | "name" | "email"> | null | undefined): string {
  if (!user) return "";
  return (user.fullName || user.name || user.email || "").trim();
}

export function getDisplayName(user: Pick<User, "fullName" | "name" | "email"> | null | undefined): string {
  // For now, “display” and “legal” are the same business concept in legacy schema.
  // Once UserProfile is introduced, this can be updated to prefer profile.legalFullName.
  return getLegalFullName(user);
}
