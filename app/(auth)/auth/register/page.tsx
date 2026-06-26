import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";

export default function RegisterSelectPage() {
  return (
    <AuthLayout title="Create an Account" subtitle="Choose your access type">
      <div className="space-y-6">
        <Link
          href="/auth/agent/register"
          className="group block rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-[#F5F8FF] p-6 transition-all hover:-translate-y-0.5 hover:border-dark-blue/30 hover:shadow-[0_18px_45px_rgba(10,25,60,0.12)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-1.5 self-stretch rounded-full bg-gradient-to-b from-dark-blue to-blue-600/70 transition-opacity group-hover:opacity-100 opacity-80" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark-blue">
                    CREATE AGENT ACCOUNT
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Publish listings and manage qualified leads with Verix
                    tools.
                  </p>
                </div>
                <div className="mt-1 text-dark-blue/70 group-hover:text-dark-blue transition-colors">
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
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-dark-blue">
                Continue
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Buyer accounts are created automatically via WhatsApp login */}
        <div className="rounded-2xl border border-[#25D366]/20 bg-gradient-to-br from-[#f0fdf4] to-white p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#128C7E]">
                Buyer? No registration needed.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Buyer accounts are created instantly via WhatsApp login. Just
                click{" "}
                <span className="font-semibold text-[#128C7E]">
                  Login with WhatsApp
                </span>{" "}
                on the home page — your account is created automatically on
                first login.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-dark-blue hover:opacity-90 transition-opacity"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
