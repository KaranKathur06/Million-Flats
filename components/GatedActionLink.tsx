"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAuthConfig } from '@/components/auth/AuthConfigProvider'
import { AI_PUBLIC_PAGE_PREFIXES } from '@/lib/ai-public-routes'

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Returns true when `href` targets one of the approved public AI System™
 * informational pages that are temporarily open without login.
 *
 * Controlled server-side by the MF_AI_PUBLIC_PAGES environment variable.
 * The client reads the compile-time baked NEXT_PUBLIC_MF_AI_PUBLIC_PAGES
 * value — which is set by the same flag during the build / runtime boot —
 * so the decision stays consistent with server-side enforcement.
 *
 * The check uses the shared canonical allowlist from lib/ai-public-routes,
 * so there is a single source of truth for which paths are public.
 */
function isPublicAiHref(href: string): boolean {
  if (process.env.NEXT_PUBLIC_MF_AI_PUBLIC_PAGES !== 'true') return false
  if (!href.startsWith('/')) return false
  // Strip query-string / hash before matching
  const path = href.split('?')[0].split('#')[0]
  const normalized = path.endsWith('/') ? path.slice(0, -1) || '/' : path
  return AI_PUBLIC_PAGE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix + '/'),
  )
}

function buildNext(pathname: string, search: string) {
  return `${pathname}${search ? `?${search}` : ""}`;
}

export default function GatedActionLink({ href, className, children }: Props) {
  const pathname = usePathname() ?? "";
  const { status } = useSession();

  const [search, setSearch] = useState("");
  const isAuthed = status === "authenticated";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.search || "";
    setSearch(raw.startsWith("?") ? raw.slice(1) : raw);
  }, []);

  const authConfig = useAuthConfig()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Skip the gate entirely for approved public AI information pages
    if (isPublicAiHref(href)) return;
    if (isAuthed) return;
    e.preventDefault();
    // Redirect to login page with return URL
    const next = href.startsWith("/") ? href : buildNext(pathname, search);
    const authQuery = authConfig?.allowWhatsapp ? 'auth=whatsapp&' : ''
    window.location.href = `/auth/login?${authQuery}next=${encodeURIComponent(next)}`;
  };

  const isInternal = href.startsWith("/");

  if (isInternal) {
    return (
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
