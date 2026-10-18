import { describe, expect, it } from '@jest/globals'
import { MEDIA_FALLBACKS, resolveProjectImage } from '@/lib/media/resolveMedia'

describe('project image fallback', () => {
  it('uses the supplied default image when project media is missing or unusable', () => {
    expect(MEDIA_FALLBACKS.project).toBe('/default%20Image.jpeg')
    expect(resolveProjectImage({ coverImage: null, media: [] })).toBe('/default%20Image.jpeg')
    expect(resolveProjectImage({ coverImage: '   ', media: [{ mediaUrl: 'null' }] }))
      .toBe('/default%20Image.jpeg')
  })

  it('keeps valid project media ahead of the default image', () => {
    expect(resolveProjectImage({
      coverImage: '/project-cover.jpg',
      media: [{ mediaUrl: '/featured.jpg', mediaType: 'featured' }],
    })).toBe('/featured.jpg')
  })
})
