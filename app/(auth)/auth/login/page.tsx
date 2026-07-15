"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getHomeRouteForRole } from "@/lib/roleHomeRoute";
import AuthLayout from "@/components/AuthLayout";

export default function AuthLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = String((session.user as any)?.role || "").toUpperCase();
      router.replace(getHomeRouteForRole(role));
    }
  }, [status, session, router]);

  if (status === "loading") return null;

  return (
    <AuthLayout title="Welcome Back" subtitle="Choose your access type">
      <div className="space-y-4">
        {/* Buyer / User — Email + Password */}
        <Link
          href="/auth/user/login"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-5 transition-all hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold tracking-wide text-dark-blue">
                    BUYER ACCESS
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Browse and invest in premium properties worldwide.
                  </p>
                </div>
                <div className="mt-0.5 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Agent — Email + Password */}
        <Link
          href="/agent/auth"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-5 transition-all hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-dark-blue to-blue-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold tracking-wide text-dark-blue">
                    AGENT ACCESS
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    List properties and manage qualified leads with AI tools.
                  </p>
                </div>
                <div className="mt-0.5 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </AuthLayout>
  );
}
