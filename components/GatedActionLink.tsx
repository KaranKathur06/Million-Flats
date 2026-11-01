"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAuthConfig } from '@/components/auth/AuthConfigProvider'
import { isAiLoginControlledRoute } from '@/lib/ai-public-routes'

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

function buildNext(pathname: string, search: string) {
  return `${pathname}${search ? `?${search}` : ""}`;
}

function isControlledAiHref(href: string): boolean {
  if (!href.startsWith('/')) return false
  const path = href.split(/[?#]/, 1)[0]
  return isAiLoginControlledRoute(path)
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
    // Let the server-side policy guard decide whether these pages need login.
    if (isControlledAiHref(href)) return;
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
