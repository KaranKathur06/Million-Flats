const { PrismaClient } = require('@prisma/client')
const { Storage } = require('@google-cloud/storage')

const prisma = new PrismaClient()

function requireEnv(name, fallback = '') {
  const value = String(process.env[name] || fallback).trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'blog'
}

function isCanonicalBlogUrl(url) {
  if (!url) return false
  return String(url).includes('/public/blogs/')
}

async function readImageSource(url) {
  const source = String(url || '').trim()
  if (!source) throw new Error('Empty image source')

  if (source.startsWith('data:image/')) {
    const match = source.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid data URL format')
    return {
      body: Buffer.from(match[2], 'base64'),
      contentType: match[1],
    }
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(`Failed to fetch source (${response.status})`)
  }
  const arr = await response.arrayBuffer()
  return {
    body: Buffer.from(arr),
    contentType: response.headers.get('content-type') || 'image/jpeg',
  }
}

async function main() {
  const projectId = requireEnv('GCP_PROJECT_ID')
  const bucketName = requireEnv('GCP_STORAGE_BUCKET')
  const storage = new Storage({ projectId })
  const bucket = storage.bucket(bucketName)

  const blogs = await prisma.blog.findMany({
    where: { featuredImageUrl: { not: null } },
    select: { id: true, slug: true, title: true, featuredImageUrl: true },
  })

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const blog of blogs) {
    const currentUrl = String(blog.featuredImageUrl || '').trim()
    if (!currentUrl) {
      skipped++
      continue
    }

    if (isCanonicalBlogUrl(currentUrl)) {
      skipped++
      continue
    }

    const slug = slugify(blog.slug || blog.title)
    const key = `public/blogs/${slug}/featured.jpg`

    try {
      const image = await readImageSource(currentUrl)
      await bucket.file(key).save(image.body, {
        resumable: false,
        metadata: {
          contentType: image.contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })

      const cdnBase = String(process.env.CDN_BASE_URL || process.env.NEXT_PUBLIC_CDN_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
      const nextUrl = cdnBase
        ? `https://${cdnBase}/${key}`
        : `https://storage.googleapis.com/${bucketName}/${key}`
      await prisma.blog.update({
        where: { id: blog.id },
        data: { featuredImageUrl: nextUrl },
      })

      migrated++
      console.log(`Migrated: ${blog.id} -> ${nextUrl}`)
    } catch (error) {
      failed++
      console.error(`Failed: ${blog.id} (${blog.title})`, error?.message || error)
    }
  }

  console.log('Done.')
  console.log(`Migrated: ${migrated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed: ${failed}`)
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
