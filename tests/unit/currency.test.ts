import {
  convertCurrencyAmount,
  formatDisplayCurrency,
  isDisplayCurrency,
} from '@/lib/currency'

describe('display currency conversion', () => {
  it('converts AED-backed prices to INR', () => {
    expect(convertCurrencyAmount(100000, 'AED', 'INR')).toBe(2250000)
  })

  it('converts INR-backed prices to AED', () => {
    expect(convertCurrencyAmount(2250000, 'INR', 'AED')).toBe(100000)
  })

  it('formats the selected display currency', () => {
    expect(formatDisplayCurrency(100000, 'AED', 'INR')).toContain('₹')
    expect(formatDisplayCurrency(2250000, 'INR', 'AED')).toContain('AED')
  })

  it('rejects unsupported persisted currency values', () => {
    expect(isDisplayCurrency('USD')).toBe(false)
    expect(isDisplayCurrency('INR')).toBe(true)
  })
})