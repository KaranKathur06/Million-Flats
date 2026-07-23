"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CitySelector, CountrySelector } from "@/components/location/CountryCitySelector";

interface FormState {
  agencyName: string;
  description: string;
  shortDescription: string;
  website: string;
  yearEstablished: string;
  headquarters: string;
  country: string;
  city: string;
  address: string;
  agencySize: string;
  totalAgents: string;
  licenseNumber: string;
  reraNumber: string;
  vatNumber: string;
  gstNumber: string;
  specializations: string[];
  operatingAreas: string[];
  countriesServed: string[];
  languages: string[];
  phone: string;
  email: string;
  whatsapp: string;
  instagramUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
}

const SPECIALIZATIONS = [
  "Residential",
  "Commercial",
  "Luxury",
  "Off-Plan",
  "Rental",
  "Investment",
  "Villa",
  "Apartment",
  "Industrial",
];
const LANGUAGES = [
  "English",
  "Arabic",
  "Hindi",
  "Urdu",
  "French",
  "German",
  "Chinese",
  "Russian",
  "Spanish",
];
const COUNTRIES = [
  "UAE",
  "India",
  "Saudi Arabia",
  "Qatar",
  "Bahrain",
  "Kuwait",
  "Oman",
  "Singapore",
  "UK",
  "USA",
];
const AGENCY_SIZES = [
  { value: "MICRO", label: "1-10" },
  { value: "SMALL", label: "11-50" },
  { value: "MEDIUM", label: "51-200" },
  { value: "LARGE", label: "200+" },
  { value: "ENTERPRISE", label: "Enterprise" },
];
const COUNTRY_ALIASES: Record<string, string> = {
  UAE: "AE",
  "United Arab Emirates": "AE",
  India: "IN",
  USA: "US",
  UK: "GB",
};

const STEPS = [
  { id: 1, label: "Agency Identity", weight: 25 },
  { id: 2, label: "Legal & Business", weight: 25 },
  { id: 3, label: "Operations", weight: 25 },
  { id: 4, label: "Contact & Social", weight: 25 },
];

export default function AgencyOnboardingClient() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState(0);
  const [form, setForm] = useState<FormState>({
    agencyName: "",
    description: "",
    shortDescription: "",
    website: "",
    yearEstablished: "",
    headquarters: "",
    country: "AE",
    city: "",
    address: "",
    agencySize: "",
    totalAgents: "",
    licenseNumber: "",
    reraNumber: "",
    vatNumber: "",
    gstNumber: "",
    specializations: [],
    operatingAreas: [],
    countriesServed: [],
    languages: ["English"],
    phone: "",
    email: "",
    whatsapp: "",
    instagramUrl: "",
    linkedinUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
  });

  // Load existing profile on mount
  useEffect(() => {
    fetch("/api/agency/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile) {
          const p = data.profile;
          setForm((f) => ({
            ...f,
            agencyName: p.agencyName || "",
            description: p.description || "",
            shortDescription: p.shortDescription || "",
            website: p.website || "",
            yearEstablished: p.yearEstablished ? String(p.yearEstablished) : "",
            headquarters: p.headquarters || "",
            country: COUNTRY_ALIASES[p.country] || p.country || "AE",
            city: p.city || "",
            address: p.address || "",
            agencySize: p.agencySize || "",
            totalAgents: p.totalAgents ? String(p.totalAgents) : "",
            licenseNumber: p.licenseNumber || "",
            reraNumber: p.reraNumber || "",
            vatNumber: p.vatNumber || "",
            gstNumber: p.gstNumber || "",
            specializations: p.specializations || [],
            operatingAreas: p.operatingAreas || [],
            countriesServed: p.countriesServed || [],
            languages: p.languages?.length ? p.languages : ["English"],
            phone: p.phone || "",
            email: p.email || "",
            whatsapp: p.whatsapp || "",
            instagramUrl: p.instagramUrl || "",
            linkedinUrl: p.linkedinUrl || "",
            facebookUrl: p.facebookUrl || "",
            youtubeUrl: p.youtubeUrl || "",
          }));
          setCompletion(p.profileCompletion || 0);
        }
      })
      .catch(() => null);
  }, []);

  const set = (key: keyof FormState, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCountry = (code: string) =>
    setForm((f) => ({ ...f, country: code, city: "" }));

  const toggleArr = (key: keyof FormState, val: string) => {
    const arr = form[key] as string[];
    set(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const saveStep = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/agency/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          yearEstablished: form.yearEstablished
            ? parseInt(form.yearEstablished)
            : undefined,
          totalAgents: form.totalAgents
            ? parseInt(form.totalAgents)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Save failed");
        return false;
      }
      setCompletion(data?.score?.total || 0);
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [form]);

  const goNext = async () => {
    const ok = await saveStep();
    if (ok) setCurrentStep((s) => Math.min(4, s + 1));
  };

  const goPrev = () => setCurrentStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    const ok = await saveStep();
    if (!ok) return;
    router.refresh();
    router.push("/agency/dashboard");
  };

  const tf = (
    label: string,
    key: keyof FormState,
    type = "text",
    placeholder = "",
    required = false,
  ) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue focus:bg-white transition-all"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="relative w-8 h-8">
              <Image
                src="/FAVICON.jpeg"
                alt="MillionFlats"
                fill
                className="object-contain rounded-lg"
                sizes="32px"
              />
            </span>
            <span className="text-dark-blue font-semibold text-sm">
              MillionFlats
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600">
                {completion}%
              </span>
            </div>
            <Link
              href="/agency/dashboard"
              className="text-xs font-medium text-gray-500 hover:text-dark-blue transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  currentStep === step.id
                    ? "bg-dark-blue text-white shadow-sm"
                    : currentStep > step.id
                      ? "bg-green-100 text-green-700"
                      : "bg-white text-gray-400 border border-gray-200"
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  bg-white/20"
                >
                  {currentStep > step.id ? "✓" : step.id}
                </span>
                {step.label}
              </div>
              {idx < STEPS.length - 1 && (
                <svg
                  className="w-4 h-4 text-gray-300 shrink-0"
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
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Step 1 of 4
                </p>
                <h2 className="text-2xl font-bold text-dark-blue">
                  Agency Identity
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Basic information about your agency.
                </p>
              </div>
              {tf(
                "Agency Name",
                "agencyName",
                "text",
                "e.g. Betterhomes Real Estate",
                true,
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Short Description
                </label>
                <input
                  value={form.shortDescription}
                  onChange={(e) => set("shortDescription", e.target.value)}
                  placeholder="One-line summary (shown in listings)"
                  maxLength={160}
                  className="w-full h-11 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue focus:bg-white transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.shortDescription.length}/160
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Full Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                  placeholder="Detailed description of your agency, expertise, and history..."
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue focus:bg-white transition-all resize-none"
                />
              </div>
              {tf("Website", "website", "url", "https://youragency.com")}
              {tf("Year Established", "yearEstablished", "number", "2005")}
            </div>
          )}

          {/* Step 2: Legal & Business */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Step 2 of 4
                </p>
                <h2 className="text-2xl font-bold text-dark-blue">
                  Legal & Business
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Verification and licensing information.
                </p>
              </div>
              {tf(
                "Trade License Number",
                "licenseNumber",
                "text",
                "e.g. CN-1234567",
              )}
              {tf("RERA Number", "reraNumber", "text", "If applicable")}
              {tf("VAT Number", "vatNumber", "text", "If applicable")}
              {tf("GST Number", "gstNumber", "text", "If applicable")}
              <div className="grid grid-cols-2 gap-4">
                {tf("Total Agents", "totalAgents", "number", "25")}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Agency Size
                  </label>
                  <select
                    value={form.agencySize}
                    onChange={(e) => set("agencySize", e.target.value)}
                    className="w-full h-11 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                  >
                    <option value="">Select size</option>
                    {AGENCY_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Specializations
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleArr("specializations", s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        form.specializations.includes(s)
                          ? "bg-dark-blue text-white border-dark-blue"
                          : "bg-white text-gray-600 border-gray-100 hover:border-dark-blue/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Operations */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Step 3 of 4
                </p>
                <h2 className="text-2xl font-bold text-dark-blue">
                  Operations
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Location and operational coverage.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CountrySelector
                  value={form.country}
                  onChange={({ code }) => setCountry(code)}
                  appearance="premium-light"
                />
                <CitySelector
                  countryCode={form.country}
                  value={form.city}
                  onChange={({ name }) => set("city", name)}
                  appearance="premium-light"
                />
              </div>
              {tf(
                "Headquarters",
                "headquarters",
                "text",
                "e.g. Business Bay, Dubai",
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Office Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={2}
                  placeholder="Full office address..."
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-dark-blue focus:border-dark-blue focus:bg-white transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Countries Served
                </label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleArr("countriesServed", c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        form.countriesServed.includes(c)
                          ? "bg-dark-blue text-white border-dark-blue"
                          : "bg-white text-gray-600 border-gray-100 hover:border-dark-blue/30"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Languages
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleArr("languages", lang)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        form.languages.includes(lang)
                          ? "bg-dark-blue text-white border-dark-blue"
                          : "bg-white text-gray-600 border-gray-100 hover:border-dark-blue/30"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contact & Social */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Step 4 of 4
                </p>
                <h2 className="text-2xl font-bold text-dark-blue">
                  Contact & Social
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  How buyers and investors can reach you.
                </p>
              </div>
              {tf("Office Email", "email", "email", "contact@youragency.com")}
              {tf("Phone Number", "phone", "tel", "+971 50 123 4567")}
              {tf("WhatsApp Number", "whatsapp", "tel", "+971 50 123 4567")}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Social Media (optional)
                </p>
                {tf(
                  "Instagram URL",
                  "instagramUrl",
                  "url",
                  "https://instagram.com/youragency",
                )}
                {tf(
                  "LinkedIn URL",
                  "linkedinUrl",
                  "url",
                  "https://linkedin.com/company/youragency",
                )}
                {tf(
                  "Facebook URL",
                  "facebookUrl",
                  "url",
                  "https://facebook.com/youragency",
                )}
                {tf(
                  "YouTube URL",
                  "youtubeUrl",
                  "url",
                  "https://youtube.com/@youragency",
                )}
              </div>

              {/* Completion summary */}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-amber-900 text-sm">
                    Profile Completion
                  </h3>
                  <span className="text-2xl font-bold text-amber-700">
                    {completion}%
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2 mb-3">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="text-xs text-amber-700">
                  {completion >= 80
                    ? "Great! Your profile is ready for admin review."
                    : "Complete more fields to increase your visibility and get verified faster."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentStep === 1}
            className="h-11 px-6 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  s.id === currentStep
                    ? "bg-dark-blue scale-125"
                    : s.id < currentStep
                      ? "bg-green-500"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className="h-11 px-8 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90 disabled:opacity-50 transition-all shadow-lg shadow-dark-blue/20"
            >
              {saving ? "Saving..." : "Next →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="h-11 px-8 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
            >
              {saving ? "Saving..." : "Submit for Review →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
