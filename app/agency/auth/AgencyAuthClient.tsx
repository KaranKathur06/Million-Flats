"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import OtpCodeInput from '@/components/OtpCodeInput'

type Tab = "login" | "register";
type Step = "form" | "otp";

/* ─────────────────────────────────────────────
   Country Codes — Searchable
   ───────────────────────────────────────────── */
const COUNTRY_CODES = [
  // Pinned first
  { code: "+971", flag: "🇦🇪", name: "UAE", pinned: true },
  { code: "+91", flag: "🇮🇳", name: "India", pinned: true },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", pinned: true },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", pinned: true },
  { code: "+1", flag: "🇺🇸", name: "United States", pinned: true },
  // Extended list
  { code: "+61", flag: "🇦🇺", name: "Australia", pinned: false },
  { code: "+65", flag: "🇸🇬", name: "Singapore", pinned: false },
  { code: "+60", flag: "🇲🇾", name: "Malaysia", pinned: false },
  { code: "+974", flag: "🇶🇦", name: "Qatar", pinned: false },
  { code: "+968", flag: "🇴🇲", name: "Oman", pinned: false },
  { code: "+973", flag: "🇧🇭", name: "Bahrain", pinned: false },
  { code: "+965", flag: "🇰🇼", name: "Kuwait", pinned: false },
  { code: "+92", flag: "🇵🇰", name: "Pakistan", pinned: false },
  { code: "+49", flag: "🇩🇪", name: "Germany", pinned: false },
  { code: "+33", flag: "🇫🇷", name: "France", pinned: false },
  { code: "+39", flag: "🇮🇹", name: "Italy", pinned: false },
  { code: "+34", flag: "🇪🇸", name: "Spain", pinned: false },
  { code: "+31", flag: "🇳🇱", name: "Netherlands", pinned: false },
  { code: "+41", flag: "🇨🇭", name: "Switzerland", pinned: false },
  { code: "+55", flag: "🇧🇷", name: "Brazil", pinned: false },
  { code: "+27", flag: "🇿🇦", name: "South Africa", pinned: false },
];

const AGENCY_SIZES = [
  { value: "MICRO", label: "1–10 agents" },
  { value: "SMALL", label: "11–50 agents" },
  { value: "MEDIUM", label: "51–200 agents" },
  { value: "LARGE", label: "200+ agents" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const SPECIALIZATIONS = [
  "Luxury", "Residential", "Commercial", "Off-Plan",
  "Rental", "Investment", "Villa", "Apartment",
];

const BENEFITS = [
  {
    icon: "🏢",
    title: "Agency Dashboard",
    desc: "Full CRM, lead management, and listing control.",
  },
  {
    icon: "✅",
    title: "Verified Badge",
    desc: "Build trust with buyers through official verification.",
  },
  {
    icon: "📊",
    title: "Analytics & Insights",
    desc: "Track performance, inquiries, and agent activity.",
  },
  {
    icon: "🌍",
    title: "Global Reach",
    desc: "Connect with investors across 50+ countries.",
  },
];

/* ─────────────────────────────────────────────
   Searchable Country Selector
   ───────────────────────────────────────────── */
function CountrySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(-1);

  const selected = COUNTRY_CODES.find((c) => c.code === value) ?? COUNTRY_CODES[0];

  const pinned = COUNTRY_CODES.filter((c) => c.pinned);
  const others = COUNTRY_CODES.filter((c) => !c.pinned);
  const all = [...pinned, ...others];

  const filtered = search
    ? all.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search)
      )
    : all;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setFocused(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setFocused(-1);
    }
  }, [open]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocused((p) => Math.min(p + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((p) => Math.max(p - 1, -1));
      } else if (e.key === "Enter" && focused >= 0 && filtered[focused]) {
        e.preventDefault();
        onChange(filtered[focused].code);
        setOpen(false);
        setSearch("");
        setFocused(-1);
      } else if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
        setFocused(-1);
      }
    },
    [open, focused, filtered, onChange]
  );

  return (
    <div ref={ref} className="relative shrink-0" onKeyDown={handleKey}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-12 min-w-[110px] px-3 rounded-xl border-2 border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white flex items-center gap-2 text-sm font-semibold text-gray-700 transition-all focus:outline-none focus:border-dark-blue/40 focus:ring-2 focus:ring-dark-blue/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span>{selected.code}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-in slide-in-from-top-1 duration-150">
          {/* Search */}
          <div className="p-2.5 border-b border-gray-100 sticky top-0 bg-white">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFocused(-1); }}
                placeholder="Search country..."
                className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-dark-blue/40 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div ref={listRef} className="max-h-64 overflow-y-auto overscroll-contain" role="listbox">
            {/* Pinned section */}
            {!search && (
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Popular</p>
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">No countries found</div>
            ) : (
              filtered.map((c, i) => {
                const isSelected = c.code === value && c.name === selected.name;
                const isFocused = i === focused;
                const showSeparator = !search && c === others[0];
                return (
                  <div key={`${c.name}-${c.code}`}>
                    {showSeparator && (
                      <div className="px-3 pt-2.5 pb-1 border-t border-gray-100 mt-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">All Countries</p>
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(c.code);
                        setOpen(false);
                        setSearch("");
                        setFocused(-1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        isFocused
                          ? "bg-dark-blue/5"
                          : isSelected
                            ? "bg-dark-blue/5"
                            : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-base leading-none w-6 text-center">{c.flag}</span>
                      <span className="flex-1 font-medium text-gray-700">{c.name}</span>
                      <span className="text-xs text-gray-400 font-mono">{c.code}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-dark-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   OTP Step
   ───────────────────────────────────────────── */
function OtpStep({
  phone,
  onSuccess,
  onBack,
}: {
  phone: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    const t = setInterval(() => setTimer((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async (otpVal: string) => {
    if (otpVal.length < 6) return;
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      phone,
      otp: otpVal,
      intent: "agency",
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid OTP. Please try again.");
      setLoading(false);
      return;
    }
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-dark-blue/8 flex items-center justify-center mx-auto mb-4 border border-dark-blue/10">
          <svg className="w-7 h-7 text-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="font-bold text-dark-blue text-lg">Verify your number</h3>
        <p className="text-sm text-gray-400 mt-1">
          OTP sent to <span className="font-semibold text-gray-700">{phone}</span>
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <OtpCodeInput value={otp} onChange={setOtp} className="max-w-xl w-full" />
      </div>

      <button
        onClick={() => verify(otp)}
        disabled={otp.length < 6 || loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying...
          </>
        ) : "Verify & Continue →"}
      </button>

      <div className="text-center space-y-2">
        {timer > 0 ? (
          <p className="text-sm text-gray-400">Resend in <span className="font-semibold text-gray-600">{timer}s</span></p>
        ) : (
          <button onClick={() => setTimer(30)} className="text-sm font-semibold text-dark-blue hover:underline">
            Resend OTP
          </button>
        )}
        <button onClick={onBack} className="block w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Change number
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Login Tab
   ───────────────────────────────────────────── */
function LoginTab() {
  const router = useRouter();
  const [cc, setCc] = useState("+971");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = `${cc}${phone}`;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone, intent: "agency" }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Failed to send OTP. Please try again.");
      setLoading(false);
      return;
    }
    setOtpSent(true);
    setLoading(false);
  };

  if (otpSent)
    return (
      <OtpStep
        phone={fullPhone}
        onSuccess={() => router.push("/agency/dashboard")}
        onBack={() => setOtpSent(false)}
      />
    );

  return (
    <form onSubmit={sendOtp} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          WhatsApp Number
        </label>
        <div className="flex gap-2">
          <CountrySelector value={cc} onChange={setCc} />
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter phone number"
            className="flex-1 h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!phone || loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending OTP...
          </>
        ) : "Send OTP →"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Don&apos;t have an account?{" "}
        <button type="button" className="text-dark-blue font-semibold hover:underline">
          Register your agency
        </button>
      </p>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Register Tab
   ───────────────────────────────────────────── */
function RegisterTab() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    agencyName: "",
    email: "",
    cc: "+971",
    phone: "",
    country: "UAE",
    state: "",
    city: "",
    agencySize: "SMALL",
    licenseNumber: "",
    reraNumber: "",
    website: "",
    specializations: [] as string[],
  });

  const fullPhone = `${form.cc}${form.phone}`;

  const toggle = (s: string) =>
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));

  const field = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/agency/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, phone: fullPhone }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Registration failed. Please try again.");
      setLoading(false);
      return;
    }
    await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone, intent: "agency" }),
    });
    setStep("otp");
    setLoading(false);
  };

  if (step === "otp")
    return (
      <OtpStep
        phone={fullPhone}
        onSuccess={() => router.push("/agency/onboarding")}
        onBack={() => setStep("form")}
      />
    );

  const inputCls =
    "w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div>
        <label className={labelCls}>Agency Name</label>
        <input required value={form.agencyName} onChange={field("agencyName")}
          placeholder="e.g. Betterhomes, fäm Properties"
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Business Email</label>
        <input type="email" required value={form.email} onChange={field("email")}
          placeholder="contact@youragency.com"
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>WhatsApp Number</label>
        <div className="flex gap-2">
          <CountrySelector value={form.cc} onChange={(code) => setForm((f) => ({ ...f, cc: code }))} />
          <input type="tel" required value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))}
            placeholder="Phone number"
            className="flex-1 h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Country</label>
          <select value={form.country} onChange={field("country")}
            className={inputCls}>
            {["UAE", "India", "Saudi Arabia", "Singapore", "United Kingdom", "United States", "Australia"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input value={form.city} onChange={field("city")} placeholder="e.g. Dubai" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>License Number</label>
          <input value={form.licenseNumber} onChange={field("licenseNumber")}
            placeholder="Trade license no."
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>RERA Number <span className="text-gray-300 normal-case font-normal">(if applicable)</span></label>
          <input value={form.reraNumber} onChange={field("reraNumber")}
            placeholder="RERA registration"
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Agency Size</label>
        <div className="grid grid-cols-3 gap-2">
          {AGENCY_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, agencySize: s.value }))}
              className={`px-2 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                form.agencySize === s.value
                  ? "bg-dark-blue text-white border-dark-blue shadow-sm"
                  : "bg-white text-gray-600 border-gray-100 hover:border-dark-blue/30"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Specializations</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                form.specializations.includes(s)
                  ? "bg-dark-blue text-white border-dark-blue shadow-sm"
                  : "bg-white text-gray-600 border-gray-100 hover:border-dark-blue/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Website <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
        <input type="url" value={form.website} onChange={field("website")}
          placeholder="https://youragency.com"
          className={inputCls} />
      </div>

      <button
        type="submit"
        disabled={loading || !form.agencyName || !form.email || !form.phone}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account...
          </>
        ) : "Create Agency Account →"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="text-dark-blue hover:underline">Terms</Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-dark-blue hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Main — Premium Two-Panel Layout
   ───────────────────────────────────────────── */
export default function AgencyAuthClient({ defaultTab }: { defaultTab: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel: Form ─────────────────────── */}
      <div className="w-full lg:w-[520px] flex flex-col bg-white shrink-0 relative">
        {/* Mobile hero strip */}
        <div className="lg:hidden relative h-[22vh] min-h-[140px] overflow-hidden">
          <Image
            src="/HOMEPAGE.jpeg"
            alt="MillionFlats Agency Portal"
            fill
            className="object-cover object-center scale-105"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/85 to-black/60" />
          {/* Logo on mobile hero */}
          <div className="absolute bottom-4 left-6 flex items-center gap-2.5">
            <span className="relative w-8 h-8">
              <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-lg" sizes="32px" />
            </span>
            <span className="text-white font-bold text-sm tracking-wide">MillionFlats</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white" />
        </div>

        <div className="-mt-5 lg:mt-0 rounded-t-[28px] lg:rounded-none bg-white relative z-10 flex-1 flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.06)] lg:shadow-none min-h-0">
          {/* Top nav — desktop */}
          <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="relative w-8 h-8">
                <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-lg" sizes="32px" />
              </span>
              <span className="text-dark-blue font-bold tracking-wide text-sm">MillionFlats</span>
            </Link>
            <Link href="/" className="text-xs font-medium text-gray-400 hover:text-dark-blue transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to site
            </Link>
          </div>

          {/* Form area */}
          <div className={`flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 pb-8 ${tab === "login" ? "flex items-center justify-center" : ""}`}>
            <div className="w-full max-w-[420px] mx-auto py-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold rounded-full px-3 py-1 mb-5 tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Agency Portal
              </div>

              <h1 className="text-2xl sm:text-[1.75rem] font-bold text-dark-blue mb-1 leading-tight">
                {tab === "login" ? "Welcome back" : "Join as Agency"}
              </h1>
              <p className="text-sm text-gray-400 mb-7">
                {tab === "login"
                  ? "Sign in to your Agency Portal"
                  : "Create your agency account and go live in minutes"}
              </p>

              {/* Tab switcher */}
              <div className="flex bg-gray-100/80 rounded-xl p-1 mb-7 border border-gray-200/60">
                {(["login", "register"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-all duration-200 ${
                      tab === t
                        ? "bg-white text-dark-blue shadow-sm border border-gray-100"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {tab === "login" ? <LoginTab /> : <RegisterTab />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Premium Brand ───────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <Image
          src="/HOMEPAGE.jpeg"
          alt="MillionFlats Agency"
          fill
          className="object-cover"
          priority
          sizes="(min-width: 1024px) calc(100vw - 520px), 100vw"
        />
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/97 via-[#0a1628]/92 to-[#0d1f38]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(251,191,36,0.06),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(14,30,60,0.4),transparent_60%)]" />

        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white h-full">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white/70 text-xs font-semibold rounded-full px-3 py-1.5 mb-10 w-fit backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Trusted Real Estate Marketplace
          </div>

          <h2 className="text-[2.5rem] xl:text-5xl font-bold leading-[1.1] mb-5 tracking-tight">
            Scale your agency
            <br />
            <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">
              with confidence.
            </span>
          </h2>

          <p className="text-white/55 text-base xl:text-lg mb-12 max-w-sm leading-relaxed">
            Join verified agencies on MillionFlats and reach premium investors across global markets.
          </p>

          {/* Benefits */}
          <div className="space-y-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0 text-lg backdrop-blur-sm">
                  {b.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-none mb-1">{b.title}</p>
                  <p className="text-white/45 text-xs leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Platform stats */}
          <div className="mt-14 pt-8 border-t border-white/10">
            <div className="flex gap-10">
              {[
                { value: "500+", label: "Verified Agencies" },
                { value: "50K+", label: "Active Buyers" },
                { value: "10+", label: "Countries" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/40 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
