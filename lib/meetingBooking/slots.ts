export type TimeSlot = { label: string; value: string }

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatTime(hours24: number, minutes: number) {
  return `${pad2(hours24)}:${pad2(minutes)}`
}

/**
 * Slot generator (configurable via exported constants, not hardcoded throughout the app).
 */
export const MEETING_SLOT_CONFIG = {
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 30,
  intervalMinutes: 30,
} as const

export function generateTimeSlots() {
  const slots: TimeSlot[] = []
  const { startHour, startMinute, endHour, endMinute, intervalMinutes } = MEETING_SLOT_CONFIG

  let total = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute

  while (total <= endTotal) {
    const h = Math.floor(total / 60)
    const m = total % 60
    const value = formatTime(h, m)
    slots.push({ label: value, value })
    total += intervalMinutes
  }

  return slots
}

export function isWeekend(date: Date) {
  const day = date.getDay() // 0=Sun ... 6=Sat
  return day === 0 || day === 6
}
