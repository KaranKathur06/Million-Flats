"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UserLoginRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams?.get("next") || "";
    const safeNext = typeof next === "string" && next.startsWith("/") ? next : "";
    const target = safeNext
      ? `/auth/user/login?next=${encodeURIComponent(safeNext)}`
      : "/auth/user/login";
    router.replace(target);
  }, [router, searchParams]);

  return null;
}
