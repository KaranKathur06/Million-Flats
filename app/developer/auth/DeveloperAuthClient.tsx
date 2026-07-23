"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";


type Tab = "login" | "register";
type Step = "form" | "otp";

type PasswordStrength = 'weak' | 'medium' | 'strong'

const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'weak'
  if (password.length < 8) return 'weak'
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium'
  return 'strong'
}

/* ─────────────────────────────────────────────
   Country Codes — Searchable with pinned section
   ───────────────────────────────────────────── */
const COUNTRY_CODES = [
  { code: "+971", flag: "🇦🇪", name: "UAE", pinned: true },
  { code: "+91", flag: "🇮🇳", name: "India", pinned: true },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia", pinned: true },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom", pinned: true },
  { code: "+1", flag: "🇺🇸", name: "United States", pinned: true },
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
  { code: "+41", flag: "🇨🇭", name: "Switzerland", pinned: false },
  { code: "+31", flag: "🇳🇱", name: "Netherlands", pinned: false },
  { code: "+55", flag: "🇧🇷", name: "Brazil", pinned: false },
  { code: "+27", flag: "🇿🇦", name: "South Africa", pinned: false },
  { code: "+82", flag: "🇰🇷", name: "South Korea", pinned: false },
  { code: "+81", flag: "🇯🇵", name: "Japan", pinned: false },
];

const CITIES = [
  "Dubai", "Abu Dhabi", "Mumbai", "Delhi", "Bangalore",
  "Hyderabad", "Pune", "Chennai", "Riyadh", "Singapore",
  "London", "New York",
];

const BENEFITS = [
  {
    icon: "🏗️",
    title: "Developer Dashboard",
    desc: "Manage projects, leads, and analytics from one unified portal.",
  },
  {
    icon: "✅",
    title: "Verified Developer Badge",
    desc: "Stand out with an official MillionFlats verified profile.",
  },
  {
    icon: "🌍",
    title: "Global Buyer Network",
    desc: "Reach NRI investors and buyers across 50+ countries.",
  },
  {
    icon: "📈",
    title: "Project Promotion",
    desc: "Feature your projects to thousands of qualified investors daily.",
  },
];

/* ─────────────────────────────────────────────
   Searchable Country Selector (shared pattern)
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
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused((p) => Math.min(p + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocused((p) => Math.max(p - 1, -1)); }
      else if (e.key === "Enter" && focused >= 0 && filtered[focused]) {
        e.preventDefault();
        onChange(filtered[focused].code);
        setOpen(false); setSearch(""); setFocused(-1);
      } else if (e.key === "Escape") { setOpen(false); setSearch(""); setFocused(-1); }
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
        <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
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
          <div className="max-h-64 overflow-y-auto overscroll-contain" role="listbox">
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
                      onClick={() => { onChange(c.code); setOpen(false); setSearch(""); setFocused(-1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${i === focused ? "bg-dark-blue/5" : isSelected ? "bg-dark-blue/5" : "hover:bg-gray-50"}`}
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
   Spinner
   ───────────────────────────────────────────── */
function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Error Banner
   ───────────────────────────────────────────── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {message}
    </div>
  );
}

/* OTP flow removed — using email/password for developer auth */
/* ─────────────────────────────────────────────
   Login Tab
   ───────────────────────────────────────────── */
function LoginTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginResetCta, setShowLoginResetCta] = useState(false);

  const next = searchParams?.get('next')
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowLoginResetCta(false);
    try {
      const callbackUrl = safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect'
      const res = await signIn("credentials", {
        email,
        password,
        intent: "developer",
        redirect: false,
        callbackUrl,
      });
      if ((res as any)?.ok && (res as any).url) {
        router.push((res as any).url);
        return;
      }

      const raw = (res as any)?.error || 'Login failed'
      if (raw === 'EMAIL_NOT_VERIFIED') setError('Please verify your email before signing in.')
      else if (raw === 'INVALID_PASSWORD') setError('Invalid email or password.')
      else if (raw === 'PASSWORD_NOT_SET') { setError('Password is not set. Please reset your password.'); setShowLoginResetCta(true) }
      else setError(raw)
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div>
          <ErrorBanner message={error} />
          {error === 'Please verify your email before signing in.' && (
            <div className="mt-3">
              <Link href={`/developer/verify-otp?email=${encodeURIComponent(email)}`} className="w-full inline-block text-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white hover:shadow-lg">
                Verify Email
              </Link>
            </div>
          )}
        </div>
      )}

      {showLoginResetCta ? (
        <Link href={`/developer/forgot-password?email=${encodeURIComponent(email)}`} className="block w-full rounded-xl bg-amber-400 text-white px-4 py-3 text-center text-sm font-semibold hover:shadow-lg">
          Reset Password
        </Link>
      ) : null}

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-12 px-4 pr-12 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
          />
          <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-blue transition-transform duration-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            <svg className={`w-5 h-5 ${showPassword ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 4.5C7 4.5 3 8 1.5 12c1.5 4 5.5 7.5 10.5 7.5s9-3.5 10.5-7.5C21 8 17 4.5 12 4.5z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="text-right pt-2">
        <Link href="/developer/forgot-password" className="text-sm font-semibold text-dark-blue hover:underline">Forgot password?</Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />Signing in...</> : 'Sign In'}
      </button>

      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Register Tab
   ───────────────────────────────────────────── */
function RegisterTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    country: "UAE",
    website: "",
    operatingCities: [] as string[],
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak')

  const toggleCity = (city: string) =>
    setForm((f) => ({
      ...f,
      operatingCities: f.operatingCities.includes(city)
        ? f.operatingCities.filter((c) => c !== city)
        : [...f.operatingCities, city],
    }));

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.companyName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          country: form.country,
          website: form.website || undefined,
          type: 'developer',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || 'Registration failed');
        setLoading(false);
        return;
      }
      // Follow the API's redirect (to OTP page) instead of hardcoding login
      router.push(data?.redirectTo || '/developer/auth?tab=login');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <div>
        <label className={labelCls}>Company Name</label>
        <input required value={form.companyName} onChange={field('companyName')}
          placeholder="e.g. Emaar Properties, DLF Ltd."
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Business Email</label>
        <input type="email" required value={form.email} onChange={field('email')}
          placeholder="contact@yourcompany.com"
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Password</label>
        <div className="relative">
          <input
            type={showRegisterPassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={(e) => { field('password')(e); setPasswordStrength(getPasswordStrength(e.target.value)) }}
            placeholder="Create a strong password"
            className={inputCls}
          />
          <button type="button" onClick={() => setShowRegisterPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-blue transition" aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}>
            {showRegisterPassword ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/><path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z"/></svg>
            )}
          </button>
        </div>
        {form.password && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full transition-all ${passwordStrength === 'strong' ? 'w-full bg-gradient-to-r from-green-400 to-green-500' : passwordStrength === 'medium' ? 'w-2/3 bg-gradient-to-r from-yellow-400 to-yellow-500' : 'w-1/3 bg-gradient-to-r from-red-400 to-red-500'}`} />
              </div>
              <span className="text-xs font-semibold text-slate-600 capitalize">{passwordStrength}</span>
            </div>
            <p className="text-xs text-slate-500">
              {passwordStrength === 'weak' && 'Use at least 8 characters with uppercase and numbers'}
              {passwordStrength === 'medium' && 'Good! Add more complexity for stronger security'}
              {passwordStrength === 'strong' && 'Excellent! Your password is strong'}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Confirm Password</label>
        <div className="relative">
          <input type={showConfirmPassword ? 'text' : 'password'} required value={form.confirmPassword} onChange={field('confirmPassword')} placeholder="Confirm your password" className={`${inputCls} ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`} />
          <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-blue transition" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
            {showConfirmPassword ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/><path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z"/></svg>
            )}
          </button>
        </div>
        {form.confirmPassword && form.password !== form.confirmPassword && (
          <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">Passwords don't match</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Operating Cities</label>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => toggleCity(city)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                form.operatingCities.includes(city)
                  ? "bg-dark-blue text-white border-dark-blue shadow-sm"
                  : "bg-white text-gray-600 border-gray-100 hover:border-dark-blue/30"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !form.companyName || !form.email || !form.password}
        className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />Creating account...</> : "Create Developer Account →"}
      </button>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
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
export default function DeveloperAuthClient({ defaultTab }: { defaultTab: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel: Form ─────────────────────── */}
      <div className="w-full lg:w-[520px] flex flex-col bg-white shrink-0 relative">
        {/* Mobile hero strip */}
        <div className="lg:hidden relative h-[22vh] min-h-[140px] overflow-hidden">
          <Image
            src="/HOMEPAGE.jpeg"
            alt="MillionFlats Developer Portal"
            fill
            className="object-cover object-center scale-105"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/96 via-dark-blue/85 to-[#0a1628]/70" />
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
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold rounded-full px-3 py-1 mb-5 tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Developer Portal
              </div>

              <h1 className="text-2xl sm:text-[1.75rem] font-bold text-dark-blue mb-1 leading-tight">
                {tab === "login" ? "Welcome back" : "Join as Developer"}
              </h1>
              <p className="text-sm text-gray-400 mb-7">
                {tab === "login"
                  ? "Sign in to your Developer Portal"
                  : "Register your company and start listing projects"}
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
          alt="MillionFlats Developer"
          fill
          className="object-cover"
          priority
          sizes="(min-width: 1024px) calc(100vw - 520px), 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/97 via-[#0a1628]/92 to-[#0d1f38]/88" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_25%,rgba(59,130,246,0.07),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_75%,rgba(14,30,60,0.4),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white h-full">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white/70 text-xs font-semibold rounded-full px-3 py-1.5 mb-10 w-fit backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Global Developer Network
          </div>

          <h2 className="text-[2.5rem] xl:text-5xl font-bold leading-[1.1] mb-5 tracking-tight">
            Build. List. Sell.
            <br />
            <span className="bg-gradient-to-r from-blue-300 to-blue-400 bg-clip-text text-transparent">
              Grow globally.
            </span>
          </h2>

          <p className="text-white/55 text-base xl:text-lg mb-12 max-w-sm leading-relaxed">
            Join MillionFlats and connect your projects with premium investors across the world.
          </p>

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

          <div className="mt-14 pt-8 border-t border-white/10">
            <div className="flex gap-10">
              {[
                { value: "200+", label: "Verified Developers" },
                { value: "5,000+", label: "Projects Listed" },
                { value: "50+", label: "Countries" },
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
