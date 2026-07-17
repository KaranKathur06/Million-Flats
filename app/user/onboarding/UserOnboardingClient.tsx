'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/tracking'
import FormSelect from '@/components/FormSelect'

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7

export default function UserOnboardingClient({ initialData }: { initialData?: any }) {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<StepId>((initialData?.currentOnboardingStep as StepId) || 1)
  const [isSaving, setIsSaving] = useState(false)
  const [completion, setCompletion] = useState(initialData?.profileCompletion || 0)

  const [formData, setFormData] = useState({
    fullName: initialData?.fullName || '',
    email: initialData?.email || '',
    country: initialData?.countryIso2 || '',
    city: initialData?.city || '',
    preferredLanguage: initialData?.preferredLanguage || 'English',
    occupation: initialData?.occupation || '',
    ageGroup: initialData?.ageGroup || '',
    purpose: initialData?.purpose || '',

    interestedCountry: initialData?.interestedCountry || '',
    budgetMin: initialData?.budgetMin || '',
    budgetMax: initialData?.budgetMax || '',
    propertyTypes: initialData?.propertyTypes || [],
    bedrooms: initialData?.bedrooms || [],
    preferredCities: initialData?.preferredCities || [],
    preferredLocalities: initialData?.preferredLocalities || [],

    buyingTimeline: initialData?.buyingTimeline || '',
    investmentGoal: initialData?.investmentGoal || '',

    servicesInterested: initialData?.servicesInterested || [],
    communicationPrefs: initialData?.communicationPrefs || [],
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const triggerAutosave = (dataToSave: any, step: number) => {
    setIsSaving(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/user/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...dataToSave, currentOnboardingStep: step })
        })
        const data = await res.json()
        if (data.success) {
          setCompletion(data.profileCompletion)
        }
      } catch (e) {
        console.error('Autosave failed', e)
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }

  const updateField = (field: string, value: any) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
    triggerAutosave(updated, currentStep)
  }

  const toggleArrayField = (field: keyof typeof formData, value: string) => {
    const arr = formData[field] as string[]
    const updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    updateField(field as string, updated)
  }

  const nextStep = () => {
    if (currentStep < 7) {
      const next = (currentStep + 1) as StepId
      trackEvent('onboarding_step_complete', { step: currentStep })
      if (next === 7) trackEvent('onboarding_funnel_complete')
      setCurrentStep(next)
      triggerAutosave(formData, next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    trackEvent('onboarding_step_view', { step: currentStep })
  }, [currentStep])

  const prevStep = () => {
    if (currentStep > 1) {
      const prev = (currentStep - 1) as StepId
      setCurrentStep(prev)
      triggerAutosave(formData, prev)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleFinish = async () => {
    setIsSaving(true)
    await fetch('/api/user/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, currentOnboardingStep: 7 })
    })
    setIsSaving(false)
    router.push('/dashboard')
  }

  const ProgressBar = () => (
    <div className="w-full bg-gray-200 h-2 rounded-full mb-10 overflow-hidden">
      <div
        className="bg-dark-blue h-full transition-all duration-500 ease-out"
        style={{ width: `${(currentStep / 7) * 100}%` }}
      />
    </div>
  )

  const SelectionButton = ({ active, onClick, children }: any) => (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-xl border text-sm font-medium transition-all text-left ${active ? 'border-dark-blue bg-dark-blue text-white shadow-md' : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-dark-blue selection:text-white pb-32">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-serif font-bold text-xl text-dark-blue">MillionFlats</div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className={isSaving ? 'text-gray-400' : 'text-green-600 transition-colors'}>
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
            <div className="px-3 py-1 rounded-full bg-blue-50 text-dark-blue border border-blue-100">
              {completion}% Complete
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <ProgressBar />

        <div className="transition-all duration-300">

          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-4xl font-serif font-bold text-dark-blue mb-4">Welcome to MillionFlats</h1>
              <p className="text-lg text-gray-600 mb-8">
                We're tailoring your experience to help you discover the perfect property.
                This quick profile setup takes less than 2 minutes and helps us match you with the best opportunities.
              </p>

              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl mb-10">
                <h3 className="font-semibold text-dark-blue mb-4">Why complete your profile?</h3>
                <ul className="space-y-4 text-gray-700">
                  <li className="flex gap-3 items-center"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center font-bold text-xs">✓</span> Unlock full pricing and floor plans</li>
                  <li className="flex gap-3 items-center"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center font-bold text-xs">✓</span> Access AI™ AI property matching</li>
                  <li className="flex gap-3 items-center"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center font-bold text-xs">✓</span> Exclusive reports and market analytics</li>
                </ul>
              </div>

              <button onClick={nextStep} className="w-full sm:w-auto px-10 py-4 bg-dark-blue text-white font-semibold rounded-xl hover:bg-dark-blue/90 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                Get Started
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-3xl font-serif font-bold text-dark-blue mb-6">Basic Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={e => updateField('fullName', e.target.value)}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue outline-none transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <FormSelect
                      name="country"
                      options={[
                        { value: '', label: 'Select Country' },
                        { value: 'AE', label: 'United Arab Emirates' },
                        { value: 'IN', label: 'India' },
                        { value: 'UK', label: 'United Kingdom' },
                        { value: 'US', label: 'United States' },
                      ]}
                      defaultValue={formData.country}
                      onValueChange={(v) => updateField('country', v)}
                      placeholder="Select Country"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => updateField('city', e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl outline-none"
                      placeholder="e.g. Dubai"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={e => updateField('occupation', e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl outline-none"
                      placeholder="e.g. Entrepreneur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
                    <FormSelect
                      name="ageGroup"
                      options={[
                        { value: '', label: 'Select Age Group' },
                        { value: '20-30', label: '20 - 30' },
                        { value: '31-40', label: '31 - 40' },
                        { value: '41-50', label: '41 - 50' },
                        { value: '50+', label: '50+' },
                      ]}
                      defaultValue={formData.ageGroup}
                      onValueChange={(v) => updateField('ageGroup', v)}
                      placeholder="Select Age Group"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">What is your primary goal?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['Buy', 'Rent', 'Invest', 'Sell', 'Just Explore'].map(purpose => (
                      <SelectionButton key={purpose} active={formData.purpose === purpose} onClick={() => updateField('purpose', purpose)}>
                        {purpose}
                      </SelectionButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-3xl font-serif font-bold text-dark-blue mb-2">Property Preferences</h2>
              <p className="text-gray-500 mb-6">Tell us what kind of property you are looking for.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Market of Interest</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['UAE', 'India', 'Both'].map(val => (
                      <SelectionButton key={val} active={formData.interestedCountry === val} onClick={() => updateField('interestedCountry', val)}>
                        {val}
                      </SelectionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Property Types</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['Apartment', 'Villa', 'Plot', 'Office', 'Retail', 'Warehouse'].map(type => (
                      <SelectionButton key={type} active={formData.propertyTypes.includes(type)} onClick={() => toggleArrayField('propertyTypes', type)}>
                        {type}
                      </SelectionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Bedrooms</label>
                  <div className="grid grid-cols-4 gap-3">
                    {['1', '2', '3', '4+'].map(bed => (
                      <SelectionButton key={bed} active={formData.bedrooms.includes(bed)} onClick={() => toggleArrayField('bedrooms', bed)}>
                        {bed} Bed
                      </SelectionButton>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Budget (AED)</label>
                    <input
                      type="number"
                      value={formData.budgetMin}
                      onChange={e => updateField('budgetMin', e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl outline-none"
                      placeholder="500000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Budget (AED)</label>
                    <input
                      type="number"
                      value={formData.budgetMax}
                      onChange={e => updateField('budgetMax', e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl outline-none"
                      placeholder="2500000"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-3xl font-serif font-bold text-dark-blue mb-2">Investment Profile</h2>
              <p className="text-gray-500 mb-6">Help us understand your timeline and goals.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Buying Timeline</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Immediately', '1 Month', '3 Months', '6 Months', '1 Year+'].map(time => (
                      <SelectionButton key={time} active={formData.buyingTimeline === time} onClick={() => updateField('buyingTimeline', time)}>
                        {time}
                      </SelectionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Investment Goal</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Own Home', 'Pure Investment', 'Holiday Home', 'Rental Income'].map(goal => (
                      <SelectionButton key={goal} active={formData.investmentGoal === goal} onClick={() => updateField('investmentGoal', goal)}>
                        {goal}
                      </SelectionButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-3xl font-serif font-bold text-dark-blue mb-2">Value-Added Services</h2>
              <p className="text-gray-500 mb-6">Select any ecosystem services you might need in the future.</p>

              <div className="grid grid-cols-2 gap-3">
                {['Home Loan', 'Insurance', 'Legal Assistance', 'Interior Design', 'Packers & Movers', 'Property Management', '3D Tours', 'AI Analytics'].map(service => (
                  <SelectionButton key={service} active={formData.servicesInterested.includes(service)} onClick={() => toggleArrayField('servicesInterested', service)}>
                    {service}
                  </SelectionButton>
                ))}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-3xl font-serif font-bold text-dark-blue mb-2">Communication Preferences</h2>
              <p className="text-gray-500 mb-6">How should we keep you updated?</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Channel</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['WhatsApp', 'Phone', 'Email', 'SMS'].map(channel => (
                      <SelectionButton key={channel} active={formData.communicationPrefs.includes(channel)} onClick={() => toggleArrayField('communicationPrefs', channel)}>
                        {channel}
                      </SelectionButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-3xl font-serif font-bold text-dark-blue mb-4">Profile Configured</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Thank you, {formData.fullName || 'there'}! Your profile is successfully set up. We have unlocked premium content and personalized your dashboard.
              </p>

              <button onClick={handleFinish} disabled={isSaving} className="w-full sm:w-auto px-10 py-4 bg-dark-blue text-white font-semibold rounded-xl hover:bg-dark-blue/90 disabled:bg-gray-400 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                {isSaving ? 'Finalizing...' : 'Start Exploring'}
              </button>
            </div>
          )}

        </div>
      </main>

      {currentStep > 1 && currentStep < 7 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button onClick={prevStep} className="px-6 py-3 font-medium text-gray-600 hover:text-dark-blue transition-colors">
              Back
            </button>
            <button onClick={nextStep} className="px-10 py-3 bg-dark-blue text-white font-semibold rounded-xl hover:bg-dark-blue/90 transition-all shadow-md active:scale-[0.98]">
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
