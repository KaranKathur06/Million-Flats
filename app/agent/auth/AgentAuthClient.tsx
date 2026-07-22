"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

type Tab = 'login' | 'register';
type PasswordStrength = 'weak' | 'medium' | 'strong';

const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'weak';
  if (password.length < 8) return 'weak';
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium';
  return 'strong';
};

const BENEFITS = [
  {
    icon: '🤝',
    title: 'Verified Agent Access',
    desc: 'Get listed in priority agent searches and lead funnels.',
  },
  {
    icon: '📬',
    title: 'Lead Management',
    desc: 'Receive qualified buyer inquiries and manage them quickly.',
  },
  {
    icon: '📈',
    title: 'Performance Insights',
    desc: 'Track your profile reach, engagement, and conversions.',
  },
  {
    icon: '🌍',
    title: 'Global Exposure',
    desc: 'Showcase your profile to investors across key markets.',
  },
];

export default function AgentAuthClient({ defaultTab }: { defaultTab: Tab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    const nextTab = searchParams?.get('tab');
    if (nextTab === 'login' || nextTab === 'register') {
      setTab(nextTab);
    }
  }, [searchParams]);

  useEffect(() => {
    router.replace(`/agent/auth?tab=${tab}`, { scroll: false });
  }, [router, tab]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="w-full lg:w-[520px] flex flex-col bg-white shrink-0 relative">
        <div className="lg:hidden relative h-[22vh] min-h-[140px] overflow-hidden">
          <Image
            src="/HOMEPAGE.jpeg"
            alt="MillionFlats Agent Portal"
            fill
            className="object-cover object-center scale-105"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/85 to-black/60" />
          <div className="absolute bottom-4 left-6 flex items-center gap-2.5">
            <span className="relative w-8 h-8">
              <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain rounded-lg" sizes="32px" />
            </span>
            <span className="text-white font-bold text-sm tracking-wide">MillionFlats</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white" />
        </div>

        <div className="-mt-5 lg:mt-0 rounded-t-[28px] lg:rounded-none bg-white relative z-10 flex-1 flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.06)] lg:shadow-none min-h-0">
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

          <div className={`flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 pb-8 ${tab === 'login' ? 'flex items-center justify-center' : ''}`}>
            <div className="w-full max-w-[420px] mx-auto py-6">
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-bold rounded-full px-3 py-1 mb-5 tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-pulse" />
                Agent Portal
              </div>

              <h1 className="text-2xl sm:text-[1.75rem] font-bold text-dark-blue mb-1 leading-tight">
                {tab === 'login' ? 'Welcome back' : 'Join as Agent'}
              </h1>
              <p className="text-sm text-gray-400 mb-7">
                {tab === 'login'
                  ? 'Sign in to your agent account'
                  : 'Create your agent account and start securing leads'}
              </p>

              <div className="flex bg-gray-100/80 rounded-xl p-1 mb-7 border border-gray-200/60">
                {(['login', 'register'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-all duration-200 ${
                      tab === t
                        ? 'bg-white text-dark-blue shadow-sm border border-gray-100'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              {tab === 'login' ? (
                <LoginTab onSwitchToRegister={() => setTab('register')} />
              ) : (
                <RegisterTab onSwitchToLogin={() => setTab('login')} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <Image
          src="/HOMEPAGE.jpeg"
          alt="MillionFlats Agent"
          fill
          className="object-cover"
          priority
          sizes="(min-width: 1024px) calc(100vw - 520px), 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/97 via-[#0a1628]/92 to-[#0d1f38]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.08),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(14,30,60,0.35),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white h-full">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white/70 text-xs font-semibold rounded-full px-3 py-1.5 mb-10 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
            Trusted Agent Network
          </div>

          <h2 className="text-[2.5rem] xl:text-5xl font-bold leading-[1.1] mb-5 tracking-tight">
            Close more deals
            <br />
            <span className="bg-gradient-to-r from-slate-300 to-white bg-clip-text text-transparent">
              with verified trust.
            </span>
          </h2>

          <p className="text-white/55 text-base xl:text-lg mb-12 max-w-sm leading-relaxed">
            Join MillionFlats and give your agent profile premium exposure to buyers and investors.
          </p>

          <div className="space-y-6">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0 text-lg backdrop-blur-sm">
                  {benefit.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-none mb-1">{benefit.title}</p>
                  <p className="text-white/45 text-xs leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-8 border-t border-white/10">
            <div className="flex gap-10">
              {[
                { value: '1K+', label: 'Verified Agents' },
                { value: '25K+', label: 'Buyer Leads' },
                { value: '35+', label: 'Countries' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/40 mt-0.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginTab({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginResetCta, setShowLoginResetCta] = useState(false);

  const next = searchParams?.get('next');
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowLoginResetCta(false);

    try {
      const callbackUrl = safeNext ? `/auth/redirect?next=${encodeURIComponent(safeNext)}` : '/auth/redirect';
      const res = await signIn('credentials', {
        email,
        password,
        intent: 'agent',
        redirect: false,
        callbackUrl,
      });

      if ((res as any)?.ok && (res as any).url) {
        router.push((res as any).url);
        return;
      }

      const raw = (res as any)?.error || 'Login failed';
      if (raw === 'EMAIL_NOT_VERIFIED') setError('Please verify your email before signing in.');
      else if (raw === 'INVALID_PASSWORD') setError('Invalid email or password.');
      else if (raw === 'PASSWORD_NOT_SET') {
        setError('Password is not set. Please reset your password.');
        setShowLoginResetCta(true);
      } else {
        setError(String(raw));
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div>
          <ErrorBanner message={error} />
          {error === 'Please verify your email before signing in.' && (
            <div className="mt-3">
              <Link href={`/agent/verify?email=${encodeURIComponent(email)}`} className="w-full inline-block text-center rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3 text-sm font-semibold text-white hover:shadow-lg">
                Verify Email
              </Link>
            </div>
          )}
        </div>
      )}

      {showLoginResetCta ? (
        <Link href={`/agent/forgot-password?email=${encodeURIComponent(email)}`} className="block w-full rounded-xl bg-amber-400 text-white px-4 py-3 text-center text-sm font-semibold hover:shadow-lg">
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
            type={showPassword ? 'text' : 'password'}
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
        <Link href="/agent/forgot-password" className="text-sm font-semibold text-dark-blue hover:underline">
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={loading} className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Spinner /> Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Don&apos;t have an account?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-dark-blue font-semibold hover:underline">
          Register your agent account
        </button>
      </p>
    </form>
  );
}

function RegisterTab({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!form.acceptedTerms) {
      setError('Please accept the terms and conditions');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          acceptedTerms: form.acceptedTerms,
          type: 'agent',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      router.push('/agent/auth?tab=login');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
        <input
          required
          value={form.fullName}
          onChange={field('fullName')}
          placeholder="Your full name"
          className="w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Email</label>
        <input
          required
          type="email"
          value={form.email}
          onChange={field('email')}
          placeholder="you@company.com"
          className="w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={field('phone')}
          placeholder="Optional phone number"
          className="w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
        <div className="relative">
          <input
            type={showRegisterPassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={(e) => {
              field('password')(e);
              setPasswordStrength(getPasswordStrength(e.target.value));
            }}
            placeholder="••••••••"
            className="w-full h-12 px-4 pr-12 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
          />
          <button type="button" onClick={() => setShowRegisterPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-blue transition-transform duration-200" aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}>
            {showRegisterPassword ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z" />
              </svg>
            )}
          </button>
        </div>
        {form.password && <div className="text-xs text-slate-600 mt-2">Strength: {passwordStrength}</div>}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm Password</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={form.confirmPassword}
            onChange={field('confirmPassword')}
            placeholder="••••••••"
            className="w-full h-12 px-4 pr-12 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue/15 focus:border-dark-blue focus:bg-white transition-all outline-none"
          />
          <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-blue transition-transform duration-200" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
            {showConfirmPassword ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M15.171 13.576l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.412 0 4.7-.597 6.689-1.654z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="agent-terms"
          type="checkbox"
          checked={form.acceptedTerms}
          onChange={field('acceptedTerms')}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="agent-terms" className="text-sm text-gray-600">
          I agree to the <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
        </label>
      </div>

      <button type="submit" disabled={loading} className="w-full h-12 bg-dark-blue text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Spinner /> Creating account...
          </>
        ) : (
          'Create Agent Account'
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-dark-blue hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

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
