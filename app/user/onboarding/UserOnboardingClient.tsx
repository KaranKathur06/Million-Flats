'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

type Step = 'personal' | 'address' | 'preferences' | 'complete'

interface FormData {
  name: string
  phone: string
  city: string
  community: string
  propertyType: string[]
  budget: string
  timeline: string
}

export default function UserOnboardingClient() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    city: '',
    community: '',
    propertyType: [],
    budget: '',
    timeline: '',
  })

  const steps: { id: Step; label: string; number: number }[] = [
    { id: 'personal', label: 'Personal Info', number: 1 },
    { id: 'address', label: 'Location', number: 2 },
    { id: 'preferences', label: 'Preferences', number: 3 },
    { id: 'complete', label: 'Complete', number: 4 },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)
  const currentStepInfo = steps[currentStepIndex]

  const handleNext = () => {
    if (!validateCurrentStep()) return
    
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
      setError('')
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
      setError('')
    }
  }

  const validateCurrentStep = (): boolean => {
    if (currentStep === 'personal') {
      if (!formData.name.trim()) {
        setError('Full name is required')
        return false
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required')
        return false
      }
      return true
    }

    if (currentStep === 'address') {
      if (!formData.city.trim()) {
        setError('City is required')
        return false
      }
      return true
    }

    if (currentStep === 'preferences') {
      if (formData.propertyType.length === 0) {
        setError('Please select at least one property type')
        return false
      }
      if (!formData.budget) {
        setError('Budget range is required')
        return false
      }
      if (!formData.timeline) {
        setError('Timeline is required')
        return false
      }
      return true
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return
    
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.message || 'Failed to complete onboarding')
        return
      }

      setCurrentStep('complete')
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      propertyType: prev.propertyType.includes(type)
        ? prev.propertyType.filter((t) => t !== type)
        : [...prev.propertyType, type],
    }))
  }

  const handleSkip = () => {
    router.push(getHomeRouteForRole('USER'))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F8FF] to-white py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-dark-blue hover:text-dark-blue/80 mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue mb-2">Welcome to MillionFlats</h1>
            <p className="text-gray-600">Let's help you find your perfect property</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      idx <= currentStepIndex
                        ? 'bg-dark-blue text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.number}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-all ${
                        idx < currentStepIndex ? 'bg-dark-blue' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStepInfo?.number} of {steps.length}: {currentStepInfo?.label}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Step: Personal Info */}
            {currentStep === 'personal' && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="+971 50 XXX XXXX"
                  />
                </div>
              </div>
            )}

            {/* Step: Address */}
            {currentStep === 'address' && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City / Emirate
                  </label>
                  <select
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                  >
                    <option value="">Select a city</option>
                    <option value="Dubai">Dubai</option>
                    <option value="Abu Dhabi">Abu Dhabi</option>
                    <option value="Sharjah">Sharjah</option>
                    <option value="Ajman">Ajman</option>
                    <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                    <option value="Fujairah">Fujairah</option>
                    <option value="Umm Al Quwain">Umm Al Quwain</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="community" className="block text-sm font-medium text-gray-700 mb-2">
                    Community / Area (Optional)
                  </label>
                  <input
                    id="community"
                    type="text"
                    value={formData.community}
                    onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                    placeholder="e.g., Downtown Dubai, Marina"
                  />
                </div>
              </div>
            )}

            {/* Step: Preferences */}
            {currentStep === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Property Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Apartment', 'Villa', 'Townhouse', 'Studio'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handlePropertyTypeToggle(type)}
                        className={`h-12 px-4 rounded-xl font-medium transition-all border-2 ${
                          formData.propertyType.includes(type)
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-dark-blue'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range (AED)
                  </label>
                  <select
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                  >
                    <option value="">Select budget range</option>
                    <option value="500k-1m">500K - 1M</option>
                    <option value="1m-2m">1M - 2M</option>
                    <option value="2m-3m">2M - 3M</option>
                    <option value="3m-5m">3M - 5M</option>
                    <option value="5m+">5M+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline
                  </label>
                  <select
                    id="timeline"
                    value={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all"
                  >
                    <option value="">Select timeline</option>
                    <option value="urgent">Urgent (within 1 month)</option>
                    <option value="soon">Soon (1-3 months)</option>
                    <option value="flexible">Flexible (3-6 months)</option>
                    <option value="exploring">Just exploring</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step: Complete */}
            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">All Set!</h2>
                <p className="text-gray-600 mb-6">
                  Your profile is ready. Start exploring properties tailored to your preferences.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {currentStep !== 'complete' && (
                <>
                  {currentStepIndex > 0 ? (
                    <button
                      onClick={handlePrevious}
                      className="h-11 px-6 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      onClick={handleSkip}
                      className="h-11 px-6 rounded-xl border-2 border-gray-300 bg-white text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                    >
                      Skip for now
                    </button>
                  )}

                  {currentStep === 'preferences' ? (
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="h-11 px-8 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Completing...' : 'Complete Onboarding'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="h-11 px-8 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-all"
                    >
                      Next
                    </button>
                  )}
                </>
              )}

              {currentStep === 'complete' && (
                <button
                  onClick={() => router.push(getHomeRouteForRole('USER'))}
                  className="w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-all"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
