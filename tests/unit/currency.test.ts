import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider'
import {
  convertCurrencyAmount,
  DEFAULT_DISPLAY_CURRENCY,
  formatDisplayCurrency,
  isDisplayCurrency,
} from '@/lib/currency'

function CurrencyProbe() {
  const { currency } = useCurrency()
  return React.createElement('span', null, currency)
}

describe('display currency conversion', () => {
  it('uses INR as the first-visit default', () => {
    expect(DEFAULT_DISPLAY_CURRENCY).toBe('INR')
  })

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

  it('keeps the provider usable when browser storage access throws', async () => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(CurrencyProvider, null, React.createElement(CurrencyProbe)))
    })

    expect(container.textContent).toBe('INR')

    await act(async () => root.unmount())
    getItem.mockRestore()
    setItem.mockRestore()
  })
})