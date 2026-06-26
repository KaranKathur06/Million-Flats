"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getHomeRouteForRole } from "@/lib/roleHomeRoute";
import AuthLayout from "@/components/AuthLayout";
import { useWhatsAppAuth } from "@/contexts/WhatsAppAuthContext";

export default function AuthLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { openModal } = useWhatsAppAuth();

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
        {/* Buyer / User — WhatsApp auth */}
        <button
          type="button"
          onClick={() => openModal("/dashboard")}
          className="group w-full text-left rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-5 transition-all hover:border-[#25D366]/40 hover:shadow-[0_18px_45px_rgba(37,211,102,0.10)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-[#25D366] to-[#128C7E]/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[15px] font-semibold tracking-wide text-dark-blue">
                      BUYER ACCESS
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#25D366]/10 text-[#128C7E] text-[10px] font-semibold">
                      <svg
                        className="w-2.5 h-2.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Browse and invest in premium properties worldwide.
                  </p>
                </div>
                <div className="mt-0.5 text-[#25D366]/70 group-hover:text-[#25D366] transition-colors">
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
        </button>

        {/* Agent — unchanged email/password */}
        <Link
          href="/auth/agent/login"
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
                    List properties and manage qualified leads with Verix tools.
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
