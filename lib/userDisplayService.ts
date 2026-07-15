type UserNameLike = {
  name?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  email?: string | null;
} | null | undefined;

function normalizeUserNameValue(value?: string | null): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, " ");
}

export function resolveUserName(user: UserNameLike, options?: { fallbackToEmail?: boolean }): string {
  if (!user) return "";

  const candidates = [
    normalizeUserNameValue((user as UserNameLike & { name?: string | null }).name),
    normalizeUserNameValue((user as UserNameLike & { fullName?: string | null }).fullName),
    normalizeUserNameValue((user as UserNameLike & { firstName?: string | null }).firstName),
  ];

  if (options?.fallbackToEmail) {
    candidates.push(normalizeUserNameValue((user as UserNameLike & { email?: string | null }).email));
  }

  return candidates.find(Boolean) || "";
}

export function getUserDisplayName(user: UserNameLike): string {
  return resolveUserName(user, { fallbackToEmail: true });
}

export function getLegalFullName(user: UserNameLike): string {
  return getUserDisplayName(user);
}

export function getDisplayName(user: UserNameLike): string {
  return getUserDisplayName(user);
}
