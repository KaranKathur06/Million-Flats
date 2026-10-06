import { describe, expect, it } from '@jest/globals'
import { withImportAnalysisRelationSlot } from '@/lib/imports/core/analysis-concurrency'

describe('import analysis relation concurrency', () => {
  it('limits overlapping relation resolutions to two', async () => {
    let active = 0
    let peak = 0

    await Promise.all(Array.from({ length: 12 }, () => withImportAnalysisRelationSlot(async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active -= 1
    })))

    expect(peak).toBe(2)
    expect(active).toBe(0)
  })

  it('releases a slot when a relation resolution rejects', async () => {
    const failed = withImportAnalysisRelationSlot(async () => {
      throw new Error('relation lookup failed')
    })
    const succeeded = withImportAnalysisRelationSlot(async () => 'completed')

    await expect(failed).rejects.toThrow('relation lookup failed')
    await expect(succeeded).resolves.toBe('completed')
    await expect(withImportAnalysisRelationSlot(async () => 'slot reused')).resolves.toBe('slot reused')
  })
})
