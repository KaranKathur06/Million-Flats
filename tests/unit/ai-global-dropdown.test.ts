import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, jest } from '@jest/globals'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

describe('GlobalDropdown', () => {
  it('associates the visible label and updates a controlled selection', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const originalActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    HTMLElement.prototype.scrollIntoView = jest.fn()

    function Harness() {
      const [value, setValue] = useState('MANUAL_PROPERTY')
      return createElement(GlobalDropdown, {
        id: 'entity-type',
        label: 'Entity Type',
        value,
        onChange: (next) => {
          if (typeof next === 'string') setValue(next)
        },
        options: [
          { value: 'MANUAL_PROPERTY', label: 'Manual Property' },
          { value: 'PROJECT', label: 'Project' },
        ],
        appearance: 'premium-light',
      })
    }

    try {
      await act(async () => root.render(createElement(Harness)))

      const trigger = container.querySelector<HTMLButtonElement>('#entity-type')
      const label = container.querySelector<HTMLLabelElement>('label[for="entity-type"]')
      expect(trigger).not.toBeNull()
      expect(label?.textContent).toBe('Entity Type')
      expect(trigger?.textContent).toContain('Manual Property')

      await act(async () => {
        trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      const projectOption = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="option"]'))
        .find((option) => option.textContent?.includes('Project'))
      expect(projectOption).toBeDefined()

      await act(async () => {
        projectOption?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })

      expect(trigger?.textContent).toContain('Project')
      expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    } finally {
      await act(async () => root.unmount())
      container.remove()
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView
    }
  })
})
