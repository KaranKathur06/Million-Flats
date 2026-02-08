import 'server-only'

function removed(): never {
  throw new Error('External property provider removed')
}

export async function reellyFetch<T>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: { cacheTtlMs?: number } = {}
): Promise<T> {
  void endpoint
  void params
  void options
  return removed()
}

export async function reellyListProjects<T>(params: Record<string, unknown> = {}) {
  void params
  return removed()
}

export async function reellyGetProject<T>(id: string) {
  void id
  return removed()
}
