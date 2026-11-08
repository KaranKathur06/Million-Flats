import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  createViewerToken,
  getViewerHmacCandidates,
  signFeedCursor,
  signVideoDeliveryToken,
  verifyFeedCursor,
  verifyVideoDeliveryToken,
} from '@/lib/videoReels/tokens'

describe('video reel security tokens', () => {
  beforeEach(() => {
    process.env.VIDEO_VIEWER_HMAC_SECRET = '1234567890abcdef1234567890abcdef'
    process.env.VIDEO_VIEWER_HMAC_SECRET_PREVIOUS = 'fedcba0987654321fedcba0987654321'
    process.env.VIDEO_DELIVERY_TOKEN_SECRET = '1234567890abcdef1234567890abcdef'
    process.env.VIDEO_FEED_CURSOR_SECRET = 'fedcba0987654321fedcba0987654321'
  })

  it('round-trips a signed delivery token and matches viewer HMACs', () => {
    const viewerToken = createViewerToken()
    const viewerHmacs = getViewerHmacCandidates(viewerToken)
    const token = signVideoDeliveryToken({
      version: 1,
      id: 'token-1',
      campaignId: 'campaign-1',
      reelId: 'reel-1',
      viewerHmac: viewerHmacs[0],
      issuedAt: Math.floor(Date.now() / 1000) - 5,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    })

    const verified = verifyVideoDeliveryToken(token)
    expect(verified).not.toBeNull()
    expect(verified?.viewerHmac).toBe(viewerHmacs[0])
    expect(verified?.campaignId).toBe('campaign-1')
    expect(verified?.reelId).toBe('reel-1')
  })

  it('rejects expired or tampered feed cursors and delivery tokens', () => {
    const cursor = signFeedCursor(8, 3)
    expect(cursor).not.toBeNull()
    expect(verifyFeedCursor(cursor!)).toMatchObject({ offset: 8, organicOffset: 3 })

    const encoded = cursor!.split('.')[0]
    const tampered = `${encoded}.00${cursor!.split('.')[1].slice(2)}`
    expect(verifyFeedCursor(tampered)).toBeNull()

    const token = signVideoDeliveryToken({
      version: 1,
      id: 'token-2',
      campaignId: 'campaign-2',
      reelId: 'reel-2',
      viewerHmac: getViewerHmacCandidates(createViewerToken())[0],
      issuedAt: Math.floor(Date.now() / 1000) - 30,
      expiresAt: Math.floor(Date.now() / 1000) + 5,
    })
    const tamperedToken = `${token.split('.')[0]}.00${token.split('.')[1].slice(2)}`
    expect(verifyVideoDeliveryToken(tamperedToken)).toBeNull()
  })
})
