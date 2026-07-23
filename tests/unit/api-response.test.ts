import { buildApiErrorEnvelope, buildApiSuccessEnvelope, parseJsonResponse } from '@/lib/api-response'

describe('api response helpers', () => {
  it('builds a consistent success envelope', () => {
    const envelope = buildApiSuccessEnvelope({ ok: true }, 'Saved')
    expect(envelope).toEqual({
      success: true,
      data: { ok: true },
      message: 'Saved',
      errors: [],
    })
  })

  it('builds a consistent error envelope', () => {
    const envelope = buildApiErrorEnvelope('Upload failed', 'UPLOAD_FAILED')
    expect(envelope).toEqual({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Upload failed',
      },
    })
  })

  it('parses JSON payloads safely and falls back on malformed bodies', async () => {
    const emptyResponse = new Response('', { status: 204 })
    await expect(parseJsonResponse(emptyResponse, { success: false, error: { code: 'EMPTY', message: 'No content' } })).resolves.toEqual({
      success: false,
      error: { code: 'EMPTY', message: 'No content' },
    })

    const malformedResponse = new Response('not-json', { status: 500 })
    await expect(parseJsonResponse(malformedResponse, { success: false, error: { code: 'INVALID', message: 'Bad payload' } })).resolves.toEqual({
      success: false,
      error: { code: 'INVALID', message: 'Bad payload' },
    })
  })
})
