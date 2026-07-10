import { cookies } from "next/headers";

export const RETURN_CONTEXT_COOKIE_NAME = "mf_return_context";

export interface ReturnContext {
  url: string;
  scrollY?: number;
  tab?: string;
}

export function setReturnContextCookie(context: ReturnContext) {
  cookies().set(RETURN_CONTEXT_COOKIE_NAME, JSON.stringify(context), {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60, // 1 hour
    sameSite: "lax",
  });
}

export function clearReturnContextCookie() {
  cookies().delete(RETURN_CONTEXT_COOKIE_NAME);
}

export function getReturnContext(): ReturnContext | null {
  const cookie = cookies().get(RETURN_CONTEXT_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as ReturnContext;
  } catch (e) {
    return null;
  }
}
