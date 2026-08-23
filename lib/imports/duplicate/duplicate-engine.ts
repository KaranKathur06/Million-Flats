import type { DuplicateCandidate } from '@/lib/imports/core/types'
import { propertySignals, type PropertyDuplicateInput } from './property-signals'

export type DuplicateCandidateInput = PropertyDuplicateInput & { id: string }

export function classifyPropertyDuplicate(target: PropertyDuplicateInput, candidates: DuplicateCandidateInput[]): DuplicateCandidate[] {
  const targetSignals = propertySignals(target)
  const matches: DuplicateCandidate[] = candidates.map((candidate) => {
    const signals = propertySignals(candidate)
    if (targetSignals.deterministicIdentity && targetSignals.deterministicIdentity === signals.deterministicIdentity) {
      return { classification: 'EXACT_DUPLICATE', targetId: candidate.id, score: 1, signals: ['sourceProvider+sourceListingId'] }
    }
    if (targetSignals.sourceUrl && targetSignals.sourceUrl === signals.sourceUrl) {
      return { classification: 'STRONG_MATCH', targetId: candidate.id, score: 0.95, signals: ['sourceUrl'] }
    }
    if (targetSignals.titleLocation && targetSignals.titleLocation === signals.titleLocation) {
      return { classification: 'POTENTIAL_DUPLICATE', targetId: candidate.id, score: 0.7, signals: ['title+city+community'] }
    }
    return { classification: 'NO_MATCH', targetId: candidate.id, score: 0, signals: [] }
  })
  return matches.filter((candidate) => candidate.classification !== 'NO_MATCH')
}
