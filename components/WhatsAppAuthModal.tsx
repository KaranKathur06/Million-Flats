"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useWhatsAppAuth } from "@/contexts/WhatsAppAuthContext";

// Phone input - using a simple controlled input with country code selector
// react-phone-number-input is installed but we'll use a simpler approach for reliability

type Step = "phone" | "whatsapp" | "otp" | "success";

// Popular country codes
const COUNTRY_CODES = [
  { code: "+971", flag: "🇦🇪", name: "UAE", iso: "AE" },
  { code: "+91", flag: "🇮🇳", name: "India", iso: "IN" },
  { code: "+44", flag: "🇬🇧", name: "UK", iso: "GB" },
  { code: "+1", flag: "🇺🇸", name: "USA", iso: "US" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", iso: "SA" },
  { code: "+974", flag: "🇶🇦", name: "Qatar", iso: "QA" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait", iso: "KW" },
  { code: "+968", flag: "🇴🇲", name: "Oman", iso: "OM" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain", iso: "BH" },
  { code: "+49", flag: "🇩🇪", name: "Germany", iso: "DE" },
  { code: "+33", flag: "🇫🇷", name: "France", iso: "FR" },
  { code: "+86", flag: "🇨🇳", name: "China", iso: "CN" },
  { code: "+65", flag: "🇸🇬", name: "Singapore", iso: "SG" },
  { code: "+61", flag: "🇦🇺", name: "Australia", iso: "AU" },
  { code: "+7", flag: "🇷🇺", name: "Russia", iso: "RU" },
];

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { id: "phone", label: "Phone" },
    { id: "whatsapp", label: "Verify" },
    { id: "otp", label: "Code" },
    { id: "success", label: "Done" },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < stepIndex
                  ? "bg-[#25D366] text-white"
                  : i === stepIndex
                    ? "bg-[#0a193c] text-white ring-2 ring-[#0a193c]/20"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < stepIndex ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] font-medium ${i === stepIndex ? "text-[#0a193c]" : "text-gray-400"}`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mb-4 transition-all duration-500 ${i < stepIndex ? "bg-[#25D366]" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function WhatsAppAuthModal() {
  const { isOpen, closeModal, redirectAfterAuth } = useWhatsAppAuth();

  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [whatsappUrls, setWhatsappUrls] = useState<{
    mobile: string;
    web: string;
  } | null>(null);
  const [otp, setOtp] = useState("");
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("phone");
      setPhoneNumber("");
      setSessionId("");
      setWhatsappUrls(null);
      setOtp("");
      setOtpInputs(["", "", "", "", "", ""]);
      setError("");
      setLoading(false);
      setPollingActive(false);
    }
  }, [isOpen]);

  // Cleanup polling on unmount / close
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const startPolling = useCallback((sid: string) => {
    setPollingActive(true);
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/auth/whatsapp/session-status?sessionId=${sid}`,
        );
        if (!res.ok) return;
        const data = await res.json();

        if (
          data.expired ||
          data.status === "EXPIRED" ||
          data.status === "FAILED"
        ) {
          setPollingActive(false);
          setError("Session expired. Please try again.");
          setStep("phone");
          return;
        }

        if (data.status === "OTP_SENT") {
          setPollingActive(false);
          setStep("otp");
          setTimeout(() => otpRefs.current[0]?.focus(), 100);
          return;
        }

        // Continue polling
        pollingRef.current = setTimeout(poll, 3000);
      } catch {
        pollingRef.current = setTimeout(poll, 5000);
      }
    };
    pollingRef.current = setTimeout(poll, 2000);
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 6) {
      setError("Please enter a valid phone number.");
      return;
    }
    const fullPhone = `${countryCode}${cleanNumber}`;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/whatsapp/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to initialize. Please try again.");
        return;
      }
      setSessionId(data.sessionId);
      setWhatsappUrls(data.whatsappUrl);
      setStep("whatsapp");
      startPolling(data.sessionId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!whatsappUrls) return;
    // Detect if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile ? whatsappUrls.mobile : whatsappUrls.web;
    window.open(url, "_blank");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtpInputs = [...otpInputs];
    newOtpInputs[index] = value.slice(-1);
    setOtpInputs(newOtpInputs);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (
      newOtpInputs.every((v) => v !== "") &&
      newOtpInputs.join("").length === 6
    ) {
      handleOtpVerify(newOtpInputs.join(""));
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtpInputs(pasted.split(""));
      handleOtpVerify(pasted);
    }
  };

  const handleOtpVerify = async (otpValue?: string) => {
    const finalOtp = otpValue || otpInputs.join("");
    if (finalOtp.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/whatsapp/confirm-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, otp: finalOtp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Verification failed. Please try again.");
        if (
          data.error === "MAX_ATTEMPTS_REACHED" ||
          data.error === "SESSION_EXPIRED"
        ) {
          setOtpInputs(["", "", "", "", "", ""]);
        }
        return;
      }

      setIsNewUser(data.isNewUser);

      // Sign in via NextAuth
      const signInResult = await signIn("credentials", {
        email: data.email,
        loginToken: data.loginToken,
        intent: "user",
        redirect: false,
      });

      if (signInResult?.ok) {
        setStep("success");
        setTimeout(() => {
          closeModal();
          window.location.href = redirectAfterAuth;
        }, 2000);
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="WhatsApp Login"
      >
        <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_32px_80px_rgba(10,25,60,0.25)] border border-white/60 overflow-hidden">
          {/* Gradient accent top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#0a193c]" />

          {/* Close button */}
          {step !== "success" && (
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/30">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0a193c]">
                  Login with WhatsApp
                </h2>
                <p className="text-xs text-gray-500">
                  Instant &bull; Secure &bull; Passwordless
                </p>
              </div>
            </div>

            <StepIndicator step={step} />

            {/* Error */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex gap-2 items-start">
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* STEP 1: Phone */}
            {step === "phone" && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    {/* Country Code Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCountryDropdown(!showCountryDropdown)
                        }
                        className="h-12 px-3 rounded-xl border border-gray-200 bg-white flex items-center gap-2 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors min-w-[90px]"
                      >
                        <span className="text-base">
                          {selectedCountry.flag}
                        </span>
                        <span>{selectedCountry.code}</span>
                        <svg
                          className="w-3 h-3 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                          {COUNTRY_CODES.map((country) => (
                            <button
                              key={country.iso}
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                              onClick={() => {
                                setCountryCode(country.code);
                                setShowCountryDropdown(false);
                              }}
                            >
                              <span className="text-base">{country.flag}</span>
                              <span className="flex-1 font-medium text-gray-700">
                                {country.name}
                              </span>
                              <span className="text-gray-400">
                                {country.code}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone Number Input */}
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="50 123 4567"
                      className="flex-1 h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a193c]/20 focus:border-[#0a193c]/40 transition-all"
                      autoComplete="tel-national"
                      inputMode="tel"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Enter your WhatsApp number. You&apos;ll receive a
                    verification code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#0a193c] text-white rounded-xl font-semibold text-sm hover:bg-[#0a193c]/90 focus:outline-none focus:ring-2 focus:ring-[#0a193c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0a193c]/20"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: WhatsApp */}
            {step === "whatsapp" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#25D366]/30 bg-gradient-to-br from-[#f0fdf4] to-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-[#128C7E] uppercase tracking-wide">
                      Pre-filled message
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-[#25D366]/20 p-3 shadow-sm">
                    <p className="text-xs text-gray-700 leading-relaxed font-mono">
                      Securely log me into MillionFlats.
                      <br />
                      <span className="text-[#0a193c] font-bold">
                        [Code: {sessionId}]
                      </span>
                      <br />
                      By sending this message, I request instant unrestricted
                      access, and agree to receive premium property updates.
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Just tap SEND &mdash; no typing needed
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="w-full h-12 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:bg-[#22c35e] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/30"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Open WhatsApp
                </button>

                <div className="flex items-center gap-3 px-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">
                    then
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  {pollingActive ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-[#25D366] border-t-transparent animate-spin shrink-0" />
                      <p className="text-xs text-gray-600 font-medium">
                        Waiting for your WhatsApp message...
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-gray-300 shrink-0" />
                      <p className="text-xs text-gray-500">
                        Send the message to continue
                      </p>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (pollingRef.current) clearTimeout(pollingRef.current);
                    setStep("phone");
                    setError("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
                >
                  &larr; Use a different number
                </button>
              </div>
            )}

            {/* STEP 3: OTP */}
            {step === "otp" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-[#25D366]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">
                    OTP sent to your WhatsApp. It expires in{" "}
                    <span className="font-semibold text-[#0a193c]">
                      5 minutes
                    </span>
                    .
                  </p>
                </div>

                <div
                  className="flex gap-2 justify-center"
                  onPaste={handleOtpPaste}
                >
                  {otpInputs.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl text-[#0a193c] transition-all focus:outline-none focus:border-[#0a193c] focus:ring-2 focus:ring-[#0a193c]/10 border-gray-200 bg-white"
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleOtpVerify()}
                  disabled={loading || otpInputs.some((v) => !v)}
                  className="w-full h-12 bg-[#0a193c] text-white rounded-xl font-semibold text-sm hover:bg-[#0a193c]/90 focus:outline-none focus:ring-2 focus:ring-[#0a193c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0a193c]/20"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </button>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === "success" && (
              <div className="text-center py-4 space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-[#25D366]/20 animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-[#25D366] flex items-center justify-center shadow-xl shadow-[#25D366]/30">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0a193c] mb-1">
                    {isNewUser ? "Welcome to MillionFlats!" : "Welcome back!"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    🔒 Access Activated. Redirecting you now...
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg
                    className="w-3 h-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading your dashboard...
                </div>
              </div>
            )}

            {/* Footer */}
            {step !== "success" && (
              <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
                By continuing, you agree to MillionFlats{" "}
                <a href="/terms" className="underline hover:text-gray-600">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="underline hover:text-gray-600">
                  Privacy Policy
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
