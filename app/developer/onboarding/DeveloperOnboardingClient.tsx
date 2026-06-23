'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  // Step 1: Company Basics
  companyName: string
  description: string
  shortDescription: string
  website: string
  foundedYear: string
  headquarters: string
  countriesServed: string[]
  yearsExperience: string

  // Step 2: Legal Verification
  reraNumber: string
  gstNumber: string
  panNumber: string

  // Step 3: Business Information
  projectTypesFocus: string[]
  citiesServed: string[]

  // Step 4: Social Links & Contact
  instagramUrl: string
  linkedinUrl: string
  facebookUrl: string
  youtubeUrl: string
  twitterUrl: string
  whatsapp: string
  telegram: string
  phone: string

  // Step 5: Preview (read-only)
}

const PROJECT_TYPES = [
  'RESIDENTIAL', 'COMMERCIAL', 'VILLA', 'LUXURY', 'AFFORDABLE',
  'MIXED_USE', 'OFFICE', 'RETAIL', 'INDUSTRIAL', 'TOWNSHIP',
]

const COUNTRY_OPTIONS = [
  { value: 'IN', label: 'India 🇮🇳' },
  { value: 'AE', label: 'UAE 🇦🇪' },
  { value: 'UK', label: 'UK 🇬🇧' },
  { value: 'US', label: 'USA 🇺🇸' },
  { value: 'SG', label: 'Singapore 🇸🇬' },
]

const STEPS = [
  { id: 1, label: 'Company Basics', weight: 20 },
  { id: 2, label: 'Legal & Verification', weight: 25 },
  { id: 3, label: 'Business Info', weight: 20 },
  { id: 4, label: 'Social Links', weight: 5 },
  { id: 5, label: 'Preview', weight: 0 },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeveloperOnboardingClient() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [completion, setCompletion] = useState(0)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const [form, setForm] = useState<FormState>({
    companyName: '', description: '', shortDescription: '',
    website: '', foundedYear: '', headquarters: '', countriesServed: [], yearsExperience: '',
    reraNumber: '', gstNumber: '', panNumber: '',
    projectTypesFocus: [], citiesServed: [],
    instagramUrl: '', linkedinUrl: '', facebookUrl: '',
    youtubeUrl: '', twitterUrl: '', whatsapp: '', telegram: '', phone: '',
  })

  // Load existing profile on mount
  useEffect(() => {
    fetch('/api/developer/profile')
      .then(r => r.json())
      .then(data => {
        if (data?.profile) {
          const p = data.profile
          setForm(prev => ({
            ...prev,
            companyName: p.companyName || '',
            description: p.description || '',
            shortDescription: p.shortDescription || '',
            website: p.website || '',
            foundedYear: p.foundedYear?.toString() || '',
            headquarters: p.headquarters || '',
            countriesServed: p.countriesServed || [],
            yearsExperience: p.yearsExperience?.toString() || '',
            reraNumber: p.reraNumber || '',
            gstNumber: p.gstNumber || '',
            panNumber: p.panNumber || '',
            projectTypesFocus: p.projectTypesFocus || [],
            citiesServed: p.citiesServed || [],
            instagramUrl: p.instagramUrl || '',
            linkedinUrl: p.linkedinUrl || '',
            facebookUrl: p.facebookUrl || '',
            youtubeUrl: p.youtubeUrl || '',
            twitterUrl: p.twitterUrl || '',
            whatsapp: p.whatsapp || '',
            telegram: p.telegram || '',
            phone: p.phone || '',
          }))
          setCompletion(p.profileCompletion || 0)
        }
        setInitialLoaded(true)
      })
      .catch(() => setInitialLoaded(true))
  }, [])

  const set = (key: keyof FormState, val: unknown) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleArrayVal = (key: keyof FormState, val: string) => {
    setForm(prev => {
      const arr = (prev[key] as string[])
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }

  const saveStep = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/developer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          foundedYear: form.foundedYear ? parseInt(form.foundedYear) : undefined,
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data?.error || 'Save failed'); return false }
      setCompletion(data?.score?.total || 0)
      return true
    } catch { setError('Network error. Please try again.'); return false }
    finally { setSaving(false) }
  }, [form])

  const goNext = async () => {
    const ok = await saveStep()
    if (ok) setCurrentStep(s => Math.min(5, s + 1))
  }

  const goPrev = () => setCurrentStep(s => Math.max(1, s - 1))

  const handleSubmitForReview = async () => {
    const ok = await saveStep()
    if (!ok) return
    if (completion < 100) { setError('Please complete all required fields before submitting.'); return }
    // Mark as documents_uploaded pending document upload
    router.push('/developer/verification')
  }

  const tf = (id: string, label: string, key: keyof FormState, type = 'text', placeholder = '', required = false) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={form[key] as string}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all text-sm"
      />
    </div>
  )

  if (!initialLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-dark-blue border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Developer Profile</h1>
          <p className="text-gray-500 mt-2 text-sm">Complete all steps to go live on the marketplace</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8 overflow-x-auto">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none min-w-0">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  currentStep === step.id
                    ? 'bg-dark-blue text-white shadow-lg shadow-dark-blue/20'
                    : currentStep > step.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {currentStep > step.id ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ) : <span>{step.id}</span>}
                {step.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-emerald-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Completion bar */}
        <div className="mb-6 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className={`text-sm font-bold ${completion === 100 ? 'text-emerald-600' : completion >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
              {completion}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${completion === 100 ? 'bg-emerald-500' : completion >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Step 1: Company Basics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Basics</h2>
              {tf('ob-company', 'Company Name', 'companyName', 'text', 'e.g. Damac Properties', true)}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all text-sm resize-none"
                  placeholder="Tell buyers about your company, your vision, and your key projects..."
                />
              </div>
              {tf('ob-short', 'Short Description', 'shortDescription', 'text', 'One-line tagline for your company')}
              {tf('ob-website', 'Website', 'website', 'url', 'https://www.yourcompany.com')}
              <div className="grid grid-cols-2 gap-4">
                {tf('ob-founded', 'Founded Year', 'foundedYear', 'number', '2010')}
                {tf('ob-exp', 'Years of Experience', 'yearsExperience', 'number', '15')}
              </div>
              {tf('ob-hq', 'Headquarters', 'headquarters', 'text', 'Dubai, UAE')}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Countries Served</label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_OPTIONS.map(c => (
                    <button
                      key={c.value} type="button"
                      onClick={() => toggleArrayVal('countriesServed', c.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        form.countriesServed.includes(c.value)
                          ? 'bg-dark-blue text-white border-dark-blue'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >{c.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Legal Verification */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Legal & Verification</h2>
              <p className="text-sm text-gray-500 mb-4">These details are required for RERA compliance and buyer trust.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                💡 <strong>Important:</strong> You&apos;ll also need to upload scanned copies of these documents in the next step after completing this profile.
              </div>
              {tf('ob-rera', 'RERA Registration Number', 'reraNumber', 'text', 'Your RERA certificate number')}
              {tf('ob-gst', 'GST Number', 'gstNumber', 'text', '22AAAAA0000A1Z5')}
              {tf('ob-pan', 'PAN Number', 'panNumber', 'text', 'ABCDE1234F')}
            </div>
          )}

          {/* Step 3: Business Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Types You Focus On <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TYPES.map(pt => (
                    <button
                      key={pt} type="button"
                      onClick={() => toggleArrayVal('projectTypesFocus', pt)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        form.projectTypesFocus.includes(pt)
                          ? 'bg-dark-blue text-white border-dark-blue'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >{pt.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="ob-cities" className="block text-sm font-medium text-gray-700 mb-1.5">Cities You Operate In</label>
                <input
                  id="ob-cities"
                  type="text"
                  placeholder="Type a city and press Enter (e.g. Mumbai, Dubai, Bangalore)"
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val && !form.citiesServed.includes(val)) {
                        set('citiesServed', [...form.citiesServed, val]);
                        (e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                {form.citiesServed.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.citiesServed.map(city => (
                      <span key={city} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {city}
                        <button onClick={() => set('citiesServed', form.citiesServed.filter(c => c !== city))} className="hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Social Links */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Links & Contact</h2>
              <p className="text-sm text-gray-500 mb-2">Add your social profiles to help buyers connect with you directly.</p>
              {tf('ob-li', 'LinkedIn', 'linkedinUrl', 'url', 'https://linkedin.com/company/yourcompany')}
              {tf('ob-ig', 'Instagram', 'instagramUrl', 'url', 'https://instagram.com/yourcompany')}
              {tf('ob-fb', 'Facebook', 'facebookUrl', 'url', 'https://facebook.com/yourcompany')}
              {tf('ob-yt', 'YouTube', 'youtubeUrl', 'url', 'https://youtube.com/c/yourcompany')}
              {tf('ob-tw', 'Twitter / X', 'twitterUrl', 'url', 'https://twitter.com/yourcompany')}
              {tf('ob-wa', 'WhatsApp (with country code)', 'whatsapp', 'tel', '+971501234567')}
              {tf('ob-tg', 'Telegram', 'telegram', 'text', '@yourcompany')}
            </div>
          )}

          {/* Step 5: Preview */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Preview</h2>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{form.companyName || '—'}</p>
                    <p className="text-gray-500 mt-1">{form.shortDescription || '—'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${completion === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {completion}% complete
                  </span>
                </div>
                <hr className="border-gray-200" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Website:</span> <span className="text-gray-700">{form.website || '—'}</span></div>
                  <div><span className="text-gray-400">Founded:</span> <span className="text-gray-700">{form.foundedYear || '—'}</span></div>
                  <div><span className="text-gray-400">HQ:</span> <span className="text-gray-700">{form.headquarters || '—'}</span></div>
                  <div><span className="text-gray-400">RERA:</span> <span className="text-gray-700">{form.reraNumber || '—'}</span></div>
                  <div><span className="text-gray-400">Countries:</span> <span className="text-gray-700">{form.countriesServed.join(', ') || '—'}</span></div>
                  <div><span className="text-gray-400">Project Types:</span> <span className="text-gray-700">{form.projectTypesFocus.join(', ') || '—'}</span></div>
                </div>
              </div>
              {completion < 100 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  ⚠️ Your profile is <strong>{completion}%</strong> complete. Please go back and fill in all required fields to submit for review.
                </div>
              )}
              {completion === 100 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
                  ✅ Your profile is 100% complete! Click &quot;Submit for Verification&quot; to upload your documents and go live.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goPrev}
            disabled={currentStep === 1}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Back
          </button>

          {currentStep < 5 ? (
            <button
              onClick={goNext}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-dark-blue rounded-xl hover:bg-dark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-dark-blue/20 flex items-center gap-2"
            >
              {saving ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
              ) : 'Save & Continue →'}
            </button>
          ) : (
            <button
              onClick={handleSubmitForReview}
              disabled={saving || completion < 100}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              {saving ? 'Saving...' : '✓ Upload Documents & Submit →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
