const MAX_CONCURRENT_RELATION_RESOLUTIONS = 2
const relationResolutionWaiters: Array<() => void> = []
let activeRelationResolutions = 0

export async function withImportAnalysisRelationSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeRelationResolutions >= MAX_CONCURRENT_RELATION_RESOLUTIONS || relationResolutionWaiters.length > 0) {
    await new Promise<void>((resolve) => relationResolutionWaiters.push(resolve))
  }

  activeRelationResolutions += 1
  try {
    return await operation()
  } finally {
    activeRelationResolutions -= 1
    relationResolutionWaiters.shift()?.()
  }
}
