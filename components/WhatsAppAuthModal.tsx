"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { useWhatsAppAuth } from "@/contexts/WhatsAppAuthContext";

type Step = "phone" | "otp" | "success";

// First 5 are pinned (Popular section), rest are in "All Countries"
const COUNTRY_CODES = [
  { code: "+971", flag: "🇦🇪", name: "UAE", iso: "AE", pinned: true },
  { code: "+91", flag: "🇮🇳", name: "India", iso: "IN", pinned: true },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", iso: "SA", pinned: true },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", iso: "GB", pinned: true },
  { code: "+1", flag: "🇺🇸", name: "United States", iso: "US", pinned: true },
  { code: "+61", flag: "🇦🇺", name: "Australia", iso: "AU", pinned: false },
  { code: "+65", flag: "🇸🇬", name: "Singapore", iso: "SG", pinned: false },
  { code: "+60", flag: "🇲🇾", name: "Malaysia", iso: "MY", pinned: false },
  { code: "+974", flag: "🇶🇦", name: "Qatar", iso: "QA", pinned: false },
  { code: "+968", flag: "🇴🇲", name: "Oman", iso: "OM", pinned: false },
  { code: "+973", flag: "🇧🇭", name: "Bahrain", iso: "BH", pinned: false },
  { code: "+965", flag: "🇰🇼", name: "Kuwait", iso: "KW", pinned: false },
  { code: "+92", flag: "🇵🇰", name: "Pakistan", iso: "PK", pinned: false },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh", iso: "BD", pinned: false },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka", iso: "LK", pinned: false },
  { code: "+977", flag: "🇳🇵", name: "Nepal", iso: "NP", pinned: false },
  { code: "+49", flag: "🇩🇪", name: "Germany", iso: "DE", pinned: false },
  { code: "+33", flag: "🇫🇷", name: "France", iso: "FR", pinned: false },
  { code: "+39", flag: "🇮🇹", name: "Italy", iso: "IT", pinned: false },
  { code: "+34", flag: "🇪🇸", name: "Spain", iso: "ES", pinned: false },
  { code: "+31", flag: "🇳🇱", name: "Netherlands", iso: "NL", pinned: false },
  { code: "+41", flag: "🇨🇭", name: "Switzerland", iso: "CH", pinned: false },
  { code: "+1", flag: "🇨🇦", name: "Canada", iso: "CA", pinned: false },
  { code: "+55", flag: "🇧🇷", name: "Brazil", iso: "BR", pinned: false },
  { code: "+27", flag: "🇿🇦", name: "South Africa", iso: "ZA", pinned: false },
  { code: "+254", flag: "🇰🇪", name: "Kenya", iso: "KE", pinned: false },
  { code: "+234", flag: "🇳🇬", name: "Nigeria", iso: "NG", pinned: false },
  { code: "+82", flag: "🇰🇷", name: "South Korea", iso: "KR", pinned: false },
  { code: "+81", flag: "🇯🇵", name: "Japan", iso: "JP", pinned: false },
  { code: "+86", flag: "🇨🇳", name: "China", iso: "CN", pinned: false },
  { code: "+62", flag: "🇮🇩", name: "Indonesia", iso: "ID", pinned: false },
  { code: "+63", flag: "🇵🇭", name: "Philippines", iso: "PH", pinned: false },
  { code: "+66", flag: "🇹🇭", name: "Thailand", iso: "TH", pinned: false },
  { code: "+20", flag: "🇪🇬", name: "Egypt", iso: "EG", pinned: false },
  { code: "+90", flag: "🇹🇷", name: "Turkey", iso: "TR", pinned: false },
];

const RESEND_COOLDOWN = 30;
const MAX_RESENDS = 3;
const COUNTRY_DROPDOWN_WIDTH = 288;
const COUNTRY_DROPDOWN_MIN_HEIGHT = 220;
const COUNTRY_DROPDOWN_MAX_HEIGHT = 360;
const COUNTRY_DROPDOWN_GAP = 6;
const COUNTRY_DROPDOWN_MARGIN = 12;

type CountryDropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin shrink-0"
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
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex gap-2 items-start px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs leading-relaxed">
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
      <span>{message}</span>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const active = step === "phone" ? 0 : step === "otp" ? 1 : 2;
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === active
              ? "w-6 bg-[#25D366]"
              : i < active
                ? "w-3 bg-[#25D366]/40"
                : "w-3 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const last4 = phone.slice(-4);
  const prefix = phone.slice(0, Math.min(4, phone.length - 4));
  return `${prefix} *** **** ${last4}`;
}

export default function WhatsAppAuthModal() {
  const { isOpen, closeModal, redirectAfterAuth } = useWhatsAppAuth();

  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryFocused, setCountryFocused] = useState(-1);
  const [sessionId, setSessionId] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countryTriggerRef = useRef<HTMLButtonElement>(null);
  const countryMenuRef = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);
  const [countryDropdownPosition, setCountryDropdownPosition] =
    useState<CountryDropdownPosition | null>(null);

  const pinnedCountries = COUNTRY_CODES.filter((c) => c.pinned);
  const otherCountries = COUNTRY_CODES.filter((c) => !c.pinned);
  const allCountries = [...pinnedCountries, ...otherCountries];

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];

  const filteredCountries = countrySearch
    ? allCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.code.includes(countrySearch) ||
          c.iso.toLowerCase().includes(countrySearch.toLowerCase()),
      )
    : allCountries;

  const closeCountryDropdown = useCallback(() => {
    setShowCountryDropdown(false);
    setCountrySearch("");
    setCountryFocused(-1);
  }, []);

  const selectCountry = useCallback(
    (code: string) => {
      setCountryCode(code);
      closeCountryDropdown();
    },
    [closeCountryDropdown],
  );

  const updateCountryDropdownPosition = useCallback(() => {
    const trigger = countryTriggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      COUNTRY_DROPDOWN_WIDTH,
      Math.max(0, viewportWidth - COUNTRY_DROPDOWN_MARGIN * 2),
    );
    const left = Math.min(
      Math.max(rect.left, COUNTRY_DROPDOWN_MARGIN),
      Math.max(COUNTRY_DROPDOWN_MARGIN, viewportWidth - width - COUNTRY_DROPDOWN_MARGIN),
    );
    const availableBelow =
      viewportHeight - rect.bottom - COUNTRY_DROPDOWN_GAP - COUNTRY_DROPDOWN_MARGIN;
    const availableAbove =
      rect.top - COUNTRY_DROPDOWN_GAP - COUNTRY_DROPDOWN_MARGIN;
    const placement =
      availableBelow >= COUNTRY_DROPDOWN_MIN_HEIGHT || availableBelow >= availableAbove
        ? "bottom"
        : "top";
    const availableSpace = placement === "bottom" ? availableBelow : availableAbove;
    const maxHeight = Math.max(
      160,
      Math.min(COUNTRY_DROPDOWN_MAX_HEIGHT, availableSpace),
    );
    const top =
      placement === "bottom"
        ? rect.bottom + COUNTRY_DROPDOWN_GAP
        : Math.max(COUNTRY_DROPDOWN_MARGIN, rect.top - COUNTRY_DROPDOWN_GAP - maxHeight);

    setCountryDropdownPosition({ top, left, width, maxHeight, placement });
  }, []);

  useEffect(() => {
    if (!showCountryDropdown) return;

    updateCountryDropdownPosition();
    window.addEventListener("resize", updateCountryDropdownPosition);
    window.addEventListener("scroll", updateCountryDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateCountryDropdownPosition);
      window.removeEventListener("scroll", updateCountryDropdownPosition, true);
    };
  }, [showCountryDropdown, updateCountryDropdownPosition]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        countryDropdownRef.current?.contains(target) ||
        countryMenuRef.current?.contains(target)
      ) {
        return;
      }

      closeCountryDropdown();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [closeCountryDropdown]);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (showCountryDropdown) {
      setTimeout(() => countrySearchRef.current?.focus(), 50);
      setCountryFocused(-1);
    }
  }, [showCountryDropdown]);

  // Reset on open / cleanup on close
  useEffect(() => {
    if (isOpen) {
      setStep("phone");
      setPhoneNumber("");
      setSessionId("");
      setFullPhone("");
      setOtpInputs(["", "", "", "", "", ""]);
      setError("");
      setLoading(false);
      setResendTimer(0);
      setResendCount(0);
      closeCountryDropdown();
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      closeCountryDropdown();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [closeCountryDropdown, isOpen]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const startResendTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── STEP 1: Phone submit ──────────────────────────────────────────────────
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 5) {
      setError("Please enter a valid phone number.");
      return;
    }
    const phone = `${countryCode}${cleanNumber}`;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/whatsapp/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to send code. Please try again.");
        return;
      }
      setSessionId(data.sessionId);
      setFullPhone(phone);
      setStep("otp");
      setResendCount(0);
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0 || resendCount >= MAX_RESENDS || loading) return;
    setLoading(true);
    setError("");
    setOtpInputs(["", "", "", "", "", ""]);
    try {
      const res = await fetch("/api/auth/whatsapp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to resend. Please try again.");
        return;
      }
      setResendCount((p) => p + 1);
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpInputs];
    next[index] = value.slice(-1);
    setOtpInputs(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every((v) => v) && next.join("").length === 6) {
      handleOtpVerify(next.join(""));
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

  // ── OTP verify ────────────────────────────────────────────────────────────
  const handleOtpVerify = async (otpValue?: string) => {
    const finalOtp = otpValue ?? otpInputs.join("");
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
      const signInResult = await signIn("credentials", {
        email: data.email,
        loginToken: data.loginToken,
        intent: "user",
        redirect: false,
      });
      if (signInResult?.ok) {
        setStep("success");
        if (timerRef.current) clearInterval(timerRef.current);
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

  const handleChangeNumber = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("phone");
    setError("");
    setOtpInputs(["", "", "", "", "", ""]);
    setResendTimer(0);
    setResendCount(0);
  };

  if (!isOpen) return null;

  const countryListMaxHeight = Math.max(
    96,
    (countryDropdownPosition?.maxHeight ?? COUNTRY_DROPDOWN_MAX_HEIGHT) - 58,
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={step !== "success" ? closeModal : undefined}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="WhatsApp Authentication"
      >
        <div className="relative w-full max-w-sm animate-fadeIn">
          <div className="relative bg-white rounded-3xl shadow-[0_32px_80px_rgba(10,25,60,0.22),0_8px_24px_rgba(10,25,60,0.08)] overflow-hidden">
            {/* Gradient accent bar */}
            <div className="h-[3px] w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#0a193c]" />

            {/* Close */}
            {step !== "success" && (
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
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

            <div className="px-6 pt-6 pb-7 sm:px-8 sm:pt-7 sm:pb-8">
              {/* ── PHONE STEP ────────────────────────────────────────────── */}
              {step === "phone" && (
                <div key="phone">
                  {/* Brand header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/30 shrink-0">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[17px] font-bold text-[#0a193c] leading-snug">
                        Continue with WhatsApp
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Secure passwordless login
                      </p>
                    </div>
                  </div>

                  <StepDots step={step} />
                  {error && <ErrorBanner message={error} />}

                  <form onSubmit={handlePhoneSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                        WhatsApp Number
                      </label>
                      <div className="flex gap-2">
                        {/* Country code */}
                        <div className="relative shrink-0" ref={countryDropdownRef}>
                          <button
                            ref={countryTriggerRef}
                            type="button"
                            onClick={() =>
                              setShowCountryDropdown((v) => {
                                if (!v) setCountrySearch("");
                                return !v;
                              })
                            }
                            aria-haspopup="listbox"
                            aria-expanded={showCountryDropdown}
                            aria-controls="whatsapp-country-dropdown"
                            className="h-12 px-3 rounded-xl border-2 border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white flex items-center gap-1.5 text-sm font-semibold text-gray-700 transition-all min-w-[90px] focus:outline-none focus:border-[#25D366]/50 focus:ring-2 focus:ring-[#25D366]/15"
                          >
                            <span className="text-base leading-none">
                              {selectedCountry.flag}
                            </span>
                            <span>{selectedCountry.code}</span>
                            <svg
                              className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showCountryDropdown ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                        {/* Number */}
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="50 123 4567"
                          className="flex-1 h-12 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-[#0a193c] text-sm font-semibold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-[#0a193c]/25 focus:bg-white transition-all"
                          autoComplete="tel-national"
                          inputMode="tel"
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2">
                        We&apos;ll send a 6-digit code to this WhatsApp number.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#0a193c] text-white rounded-xl font-semibold text-sm hover:bg-[#0d2047] focus:outline-none focus:ring-2 focus:ring-[#0a193c]/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0a193c]/20"
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          <span>Sending code…</span>
                        </>
                      ) : (
                        <>
                          <span>Continue</span>
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

                  <p className="text-center text-[11px] text-gray-400 mt-5 leading-relaxed">
                    By continuing, you agree to our{" "}
                    <a
                      href="/terms"
                      className="underline hover:text-gray-600 transition-colors"
                    >
                      Terms
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      className="underline hover:text-gray-600 transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </div>
              )}

              {/* ── OTP STEP ──────────────────────────────────────────────── */}
              {step === "otp" && (
                <div key="otp">
                  {/* Header */}
                  <div className="mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0a193c]/[0.07] flex items-center justify-center mb-3">
                      <svg
                        className="w-5 h-5 text-[#0a193c]"
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
                    <h2 className="text-[17px] font-bold text-[#0a193c] leading-snug">
                      Verification Code
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 leading-snug">
                      Code sent to{" "}
                      <span className="font-semibold text-[#0a193c]">
                        {maskPhone(fullPhone)}
                      </span>{" "}
                      via WhatsApp
                    </p>
                  </div>

                  <StepDots step={step} />
                  {error && <ErrorBanner message={error} />}

                  {/* OTP Boxes */}
                  <div
                    className="flex gap-2 justify-between mb-5"
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
                        disabled={loading}
                        className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 text-[#0a193c] transition-all focus:outline-none select-none ${
                          digit
                            ? "border-[#0a193c] bg-[#0a193c]/[0.04]"
                            : "border-gray-200 bg-gray-50 focus:border-[#0a193c]/40 focus:bg-white"
                        } disabled:opacity-50`}
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Timer + Resend */}
                  <div className="flex items-center justify-between mb-5 min-h-[20px]">
                    <span className="text-xs text-gray-400">
                      {resendTimer > 0 ? (
                        <>
                          Resend in{" "}
                          <span className="font-semibold text-[#0a193c] tabular-nums">
                            0:{String(resendTimer).padStart(2, "0")}
                          </span>
                        </>
                      ) : resendCount >= MAX_RESENDS ? (
                        <span className="text-red-400">
                          Max resends reached
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={
                        resendTimer > 0 || resendCount >= MAX_RESENDS || loading
                      }
                      className="text-xs font-semibold text-[#25D366] hover:text-[#128C7E] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Resend Code
                    </button>
                  </div>

                  {/* Verify button */}
                  <button
                    type="button"
                    onClick={() => handleOtpVerify()}
                    disabled={loading || otpInputs.some((v) => !v)}
                    className="w-full h-12 bg-[#0a193c] text-white rounded-xl font-semibold text-sm hover:bg-[#0d2047] focus:outline-none focus:ring-2 focus:ring-[#0a193c]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0a193c]/20 mb-3"
                  >
                    {loading ? (
                      <>
                        <Spinner />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </button>

                  {/* Change number */}
                  <button
                    type="button"
                    onClick={handleChangeNumber}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                  >
                    ← Change number
                  </button>
                </div>
              )}

              {/* ── SUCCESS STEP ──────────────────────────────────────────── */}
              {step === "success" && (
                <div key="success" className="py-4 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full bg-[#25D366]/20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-[#25D366] flex items-center justify-center shadow-2xl shadow-[#25D366]/40">
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
                  <h3 className="text-xl font-bold text-[#0a193c] mb-2">
                    {isNewUser ? "Welcome to MillionFlats!" : "Welcome back!"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">
                    Your account has been verified successfully.
                  </p>
                  <p className="text-xs text-gray-400">Redirecting you now…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showCountryDropdown &&
        countryDropdownPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="whatsapp-country-dropdown"
            ref={countryMenuRef}
            className="fixed z-[110] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
            style={{
              top: countryDropdownPosition.top,
              left: countryDropdownPosition.left,
              width: countryDropdownPosition.width,
              maxHeight: countryDropdownPosition.maxHeight,
              transformOrigin:
                countryDropdownPosition.placement === "bottom"
                  ? "top left"
                  : "bottom left",
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCountryFocused((p) =>
                  Math.min(p + 1, filteredCountries.length - 1),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCountryFocused((p) => Math.max(p - 1, -1));
              } else if (
                e.key === "Enter" &&
                countryFocused >= 0 &&
                filteredCountries[countryFocused]
              ) {
                e.preventDefault();
                selectCountry(filteredCountries[countryFocused].code);
              } else if (e.key === "Escape") {
                closeCountryDropdown();
                countryTriggerRef.current?.focus();
              }
            }}
          >
            <div className="border-b border-gray-100 bg-white p-2.5">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  ref={countrySearchRef}
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setCountryFocused(-1);
                  }}
                  placeholder="Search country..."
                  className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs transition-all focus:border-[#25D366]/50 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: countryListMaxHeight }}
              role="listbox"
              aria-label="Country code"
            >
              {!countrySearch && (
                <div className="px-3 pb-1 pt-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Popular
                  </p>
                </div>
              )}
              {filteredCountries.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((c, i) => {
                  const isSelected =
                    c.code === countryCode && c.name === selectedCountry.name;
                  const isFocused = i === countryFocused;
                  const showSeparator =
                    !countrySearch && c === otherCountries[0];

                  return (
                    <div key={`${c.iso}-${c.code}`}>
                      {showSeparator && (
                        <div className="mt-1 border-t border-gray-100 px-3 pb-1 pt-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            All Countries
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => selectCountry(c.code)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                          isFocused
                            ? "bg-[#25D366]/8"
                            : isSelected
                              ? "bg-[#25D366]/8"
                              : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="w-6 text-center text-base leading-none">
                          {c.flag}
                        </span>
                        <span className="flex-1 font-medium text-gray-700">
                          {c.name}
                        </span>
                        <span className="font-mono text-xs text-gray-400">
                          {c.code}
                        </span>
                        {isSelected && (
                          <svg
                            className="h-4 w-4 shrink-0 text-[#25D366]"
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
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
