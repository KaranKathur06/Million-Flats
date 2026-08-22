import { executeImport } from './execute-import'

export function queueImport(batchId: string, idempotencyKey = `queue:${batchId}`) {
  return executeImport({ batchId, idempotencyKey })
}
