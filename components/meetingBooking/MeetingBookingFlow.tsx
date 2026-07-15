'use client'

import { useEffect, useMemo, useState } from 'react'
import { trackEvent } from '@/lib/tracking'

const CATEGORIES = [
  { value: 'THREE_D_TOUR', label: '3D Tour' },
  { value: 'AGENT_REGISTRATION', label: 'Agent Registration' },
  { value: 'AGENCY_REGISTRATION', label: 'Agency Registration' },
  { value: 'DEVELOPER_REGISTRATION', label: 'Developer Registration' },
  { value: 'PROPERTY_BUYER', label: 'Property Buyer' },
  { value: 'PROPERTY_SELLER', label: 'Property Seller' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'ECOSYSTEM_PARTNERS', label: 'Ecosystem Partnerships' },
] as const

type MeetingCategory = (typeof CATEGORIES)[number]['value']

export type BookingStep = 1 | 2 | 3

type AvailabilityResponse = {
  success: boolean
  data: {
    referenceMonth: string
    category: string
    date: string // YYYY-MM-DD
    timezone: string
    bookedTimes: string[]
    slotTimes: string[]
    disabledTimes: string[]
  }
  message?: string
}

type CreateBookingResponse = {
  success: boolean
  data?: {
    referenceId: string
    googleMeetLink: string
    meetingDate: string
    meetingTime: string
  }
  message?: string
}

const DEFAULT_TIMEZONE_FALLBACK = 'UTC'
const MEETING_MODE_LABEL = 'Google Meet'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDateForInput(d: Date) {
  const year = d.getFullYear()
  const month = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${year}-${month}-${day}`
}

function parseLocalYMD(ymd: string) {
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  return new Date(y, m - 1, d)
}

function getDetectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE_FALLBACK
  } catch {
    return DEFAULT_TIMEZONE_FALLBACK
  }
}

function generateTimeSlots(startHour: number, endHour: number, intervalMinutes: number) {
  const slots: string[] = []
  let total = startHour * 60
  const endTotal = endHour * 60
  while (total <= endTotal) {
    const h = Math.floor(total / 60)
    const m = total % 60
    slots.push(`${pad2(h)}:${pad2(m)}`)
    total += intervalMinutes
  }
  return slots
}

const SLOT_CONFIG = { startHour: 10, endHour: 20, intervalMinutes: 30 } as const
const LOCAL_SLOTS = generateTimeSlots(SLOT_CONFIG.startHour, SLOT_CONFIG.endHour, SLOT_CONFIG.intervalMinutes)

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ')
}

function DateGrid({
  days,
  selectedDate,
  onSelect,
  isDisabledDate,
}: {
  days: string[]
  selectedDate: string
  onSelect: (date: string) => void
  isDisabledDate: (date: string) => boolean
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {days.map((d) => {
        const disabled = isDisabledDate(d)
        const active = d === selectedDate
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            disabled={disabled}
            aria-disabled={disabled}
            className={cx(
              'text-left rounded-xl border px-3 py-2 transition',
              active ? 'border-accent-yellow/70 bg-accent-yellow/10' : 'border-white/15 bg-white/5 hover:bg-white/8',
              disabled && 'opacity-40 cursor-not-allowed hover:bg-white/5'
            )}
          >
            <div className="text-sm font-semibold text-white">{d}</div>
          </button>
        )
      })}
    </div>
  )
}

function SlotGrid({
  times,
  selectedTime,
  disabledTimes,
  onSelect,
  isLoading,
}: {
  times: string[]
  selectedTime: string
  disabledTimes: string[]
  onSelect: (time: string) => void
  isLoading: boolean
}) {
  const disabledSet = useMemo(() => new Set(disabledTimes), [disabledTimes])
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {times.map((t) => {
        const disabled = disabledSet.has(t) || isLoading
        const active = t === selectedTime
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            disabled={disabled}
            aria-disabled={disabled}
            className={cx(
              'rounded-xl border px-3 py-2 text-sm font-semibold transition',
              active ? 'border-accent-yellow/70 bg-accent-yellow/10' : 'border-white/15 bg-white/5',
              !active && !disabled && 'hover:bg-white/8',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}

function sanitizeMessage(value: string) {
  // Basic client-side trim. Server MUST validate/sanitize as well.
  return value.trim()
}

export default function MeetingBookingFlow({ category }: { category: MeetingCategory }) {
  const detectedTz = useMemo(() => getDetectedTimezone(), [])
  const [timezone, setTimezone] = useState(detectedTz)

  const [step, setStep] = useState<BookingStep>(1)

  const todayYMD = useMemo(() => formatDateForInput(new Date()), [])
  const [dateInput, setDateInput] = useState<string>(todayYMD)
  const [selectedTime, setSelectedTime] = useState<string>('')

  const [disabledTimes, setDisabledTimes] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  const [details, setDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: 'INDIA',
    city: '',
    message: '',
  })

  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState<null | {
    referenceId: string
    googleMeetLink: string
    meetingDate: string
    meetingTime: string
  }>(null)

  const availableDateDays = useMemo(() => {
    const base = parseLocalYMD(todayYMD)
    const out: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      out.push(formatDateForInput(d))
    }
    return out
  }, [todayYMD])

  useEffect(() => {
    setTimezone(detectedTz)
  }, [detectedTz])

  useEffect(() => {
    if (step < 2) return

    const load = async () => {
      setSlotsError('')
      setLoadingSlots(true)
      try {
        const params = new URLSearchParams()
        params.set('category', category)
        params.set('date', dateInput)
        params.set('timezone', timezone)
        params.set('month', dateInput.slice(0, 7))

        const res = await fetch(`/api/meeting-bookings?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        })

        const json = (await res.json()) as AvailabilityResponse
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to load availability')

        setDisabledTimes(json.data?.disabledTimes || [])
      } catch (e) {
        setSlotsError(e instanceof Error ? e.message : 'Failed to load slots')
        setDisabledTimes([])
      } finally {
        setLoadingSlots(false)
      }
    }

    void load()
  }, [category, dateInput, step, timezone])

  const isDisabledDate = (ymd: string) => {
    // Disable past dates (local)
    const d = parseLocalYMD(ymd)
    const t = parseLocalYMD(todayYMD)
    return d.getTime() < t.getTime()
  }

  const meetingPurposeLabel = useMemo(() => {
    return CATEGORIES.find((c) => c.value === category)?.label ?? 'Meeting'
  }, [category])

  const onSelectDate = (d: string) => {
    setDateInput(d)
    setSelectedTime('')
    setStep(2)
    trackEvent('booking_started', { category, date: d, timezone })
  }

  const onSelectSlot = (time: string) => {
    if (disabledTimes.includes(time)) return
    setSelectedTime(time)
    trackEvent('booking_slot_selected', { category, date: dateInput, time, timezone })
    setStep(3)
  }

  const canSubmit =
    Boolean(selectedTime) &&
    details.fullName.trim().length > 1 &&
    details.email.trim().includes('@') &&
    details.phone.trim().length > 6 &&
    details.city.trim().length > 1

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setBookingError('')
    trackEvent('booking_submitted', { category, date: dateInput, time: selectedTime, timezone })

    try {
      const res = await fetch('/api/meeting-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: details.fullName,
          email: details.email,
          phone: details.phone,
          country: details.country,
          city: details.city,
          category,
          meetingMode: 'GOOGLE_MEET',
          meetingDate: dateInput, // YYYY-MM-DD
          meetingTime: selectedTime, // HH:mm
          timezone,
          message: details.message ? sanitizeMessage(details.message) : null,
        }),
      })

      const json = (await res.json()) as CreateBookingResponse
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Booking failed')

      if (!json.data?.referenceId || !json.data?.googleMeetLink) throw new Error('Booking response missing data')

      trackEvent('booking_confirmed', { referenceId: json.data.referenceId })

      setBookingSuccess({
        referenceId: json.data.referenceId,
        googleMeetLink: json.data.googleMeetLink,
        meetingDate: json.data.meetingDate,
        meetingTime: json.data.meetingTime,
      })
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'Booking failed. Please try again.')
    }
  }

  if (bookingSuccess) {
    return (
      <section className="w-full">
        <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-yellow/30 bg-accent-yellow/10 px-3 py-1 text-xs font-bold text-accent-yellow">
              Booking Confirmed
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-serif font-bold">Meeting Scheduled Successfully</h1>
            <p className="mt-2 text-white/80">Thank you. Our team will review your booking and contact you shortly.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60 font-semibold">Reference ID</div>
                <div className="mt-1 text-sm font-bold">{bookingSuccess.referenceId}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60 font-semibold">When</div>
                <div className="mt-1 text-sm font-bold">
                  {bookingSuccess.meetingDate} · {bookingSuccess.meetingTime}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60 font-semibold">Google Meet</div>
              <a
                href={bookingSuccess.googleMeetLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-accent-yellow hover:underline"
                aria-label="Open Google Meet link"
              >
                Join meeting
              </a>
              <div className="mt-1 text-xs text-white/60">Platform: {MEETING_MODE_LABEL}</div>
            </div>

            <div className="mt-6 text-xs text-white/60">Need to update your booking? Please contact our team with your reference ID.</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full">
      <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-white/60 font-semibold">Meta-dology Booking</div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-white">
              Schedule a Meeting · {meetingPurposeLabel}
            </h2>
            <p className="mt-2 text-white/80">Pick a date and time that works for you.</p>
          </div>

          <div className="hidden sm:block rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs text-white/60 font-semibold">Timezone</div>
            <div className="mt-1 text-sm font-bold text-white">{timezone}</div>
          </div>
        </div>

        <div className="mt-6">
          {step === 1 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white">Step 1 — Choose Date</div>
              <div className="mt-1 text-sm text-white/70">Available for the next 7 days.</div>

              <div className="mt-4">
                <DateGrid days={availableDateDays} selectedDate={dateInput} onSelect={onSelectDate} isDisabledDate={isDisabledDate} />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white">Step 1 — Choose Time</div>
              <div className="mt-1 text-sm text-white/70">
                Date: <span className="font-semibold text-white">{dateInput}</span>
              </div>

              <div className="mt-4">
                {slotsError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{slotsError}</div> : null}

                <div className="mt-3">
                  <SlotGrid
                    times={LOCAL_SLOTS}
                    selectedTime={selectedTime}
                    disabledTimes={disabledTimes}
                    onSelect={onSelectSlot}
                    isLoading={loadingSlots}
                  />
                </div>

                <div className="mt-3 text-xs text-white/60">{loadingSlots ? 'Loading availability…' : 'Unavailable slots are disabled.'}</div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  Change date
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-bold text-white">Step 2 — Your Details</div>
              <div className="mt-1 text-sm text-white/70">
                Date: <span className="font-semibold text-white">{dateInput}</span> · Time:{' '}
                <span className="font-semibold text-white">{selectedTime}</span>
              </div>

              <form onSubmit={submitBooking} className="mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-white/60">Full Name *</span>
                    <input
                      value={details.fullName}
                      onChange={(e) => setDetails((p) => ({ ...p, fullName: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white outline-none focus:border-accent-yellow/60"
                      required
                      aria-label="Full Name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-white/60">Email *</span>
                    <input
                      value={details.email}
                      onChange={(e) => setDetails((p) => ({ ...p, email: e.target.value }))}
                      type="email"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white outline-none focus:border-accent-yellow/60"
                      required
                      aria-label="Email"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-white/60">Phone *</span>
                    <input
                      value={details.phone}
                      onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white outline-none focus:border-accent-yellow/60"
                      required
                      aria-label="Phone"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-white/60">Country *</span>
                    <input
                      value={details.country}
                      onChange={(e) => setDetails((p) => ({ ...p, country: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white outline-none focus:border-accent-yellow/60"
                      required
                      aria-label="Country"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">City *</span>
                    <input
                      value={details.city}
                      onChange={(e) => setDetails((p) => ({ ...p, city: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white outline-none focus:border-accent-yellow/60"
                      required
                      aria-label="City"
                    />
                  </label>

                  <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold text-white/60">Meeting Purpose</div>
                    <div className="mt-1 text-sm font-bold text-white">{meetingPurposeLabel}</div>
                    <div className="mt-1 text-xs text-white/60">Platform is always Google Meet.</div>
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">Optional Message</span>
                    <textarea
                      value={details.message}
                      onChange={(e) => setDetails((p) => ({ ...p, message: e.target.value }))}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white outline-none focus:border-accent-yellow/60"
                      aria-label="Message"
                    />
                  </label>
                </div>

                {bookingError ? (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{bookingError}</div>
                ) : null}

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cx(
                      'rounded-xl px-5 py-3 text-sm font-bold transition',
                      canSubmit
                        ? 'bg-accent-yellow text-dark-blue hover:brightness-105 shadow-lg shadow-accent-yellow/20'
                        : 'bg-white/10 text-white/60 cursor-not-allowed'
                    )}
                    aria-label="Confirm booking"
                  >
                    Confirm Booking
                  </button>
                </div>

                <div className="mt-3 text-xs text-white/60">By submitting, you agree to be contacted about your meeting.</div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
