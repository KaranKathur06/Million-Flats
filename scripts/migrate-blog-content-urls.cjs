/**
 * Blog Content URL Migration Script
 * ─────────────────────────────────────────────────────────────────────
 * One-time Node.js script to normalize ALL S3 URLs in blog content.
 *
 * This handles edge cases that SQL REPLACE cannot:
 *   - Multiple S3 URL formats (virtual-hosted, path-style)
 *   - URL-encoded characters in paths
 *   - contentJson (TipTap JSON) image nodes
 *
 * Usage:
 *   npx tsx scripts/migrate-blog-content-urls.ts --dry-run
 *   npx tsx scripts/migrate-blog-content-urls.ts --execute
 *
 * SAFETY: Always run with --dry-run first to verify changes.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const S3_PREFIX = 'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com'
const CDN_BASE = 'https://cdn.millionflats.com'

// Match any S3 URL in HTML content
const S3_URL_REGEX = /https?:\/\/[a-z0-9.-]+\.?s3[.-][a-z0-9-]*\.amazonaws\.com\/[^"'\s)}\]]+/gi

function extractKeyFromS3Url(url) {
  // Virtual-hosted: bucket.s3.region.amazonaws.com/key
  const virtualMatch = url.match(
    /^https?:\/\/[a-z0-9.-]+\.s3[.-][a-z0-9-]*\.amazonaws\.com\/(.+)$/i
  )
  if (virtualMatch) return virtualMatch[1]

  // Path-style: s3.region.amazonaws.com/bucket/key
  const pathMatch = url.match(
    /^https?:\/\/s3[.-][a-z0-9-]*\.amazonaws\.com\/[a-z0-9.-]+\/(.+)$/i
  )
  if (pathMatch) return pathMatch[1]

  return null
}

function rewriteHtml(html) {
  if (!html) return { result: html, changed: false }

  let changed = false
  const result = html.replace(S3_URL_REGEX, (match) => {
    const key = extractKeyFromS3Url(match)
    if (key) {
      changed = true
      return `${CDN_BASE}/${key}`
    }
    return match
  })

  return { result, changed }
}

function rewriteJson(node) {
  if (!node || typeof node !== 'object') return { result: node, changed: false }

  let changed = false
  const result = JSON.parse(JSON.stringify(node)) // deep clone

  function walk(n) {
    if (!n || typeof n !== 'object') return

    // Image nodes
    if (n.type === 'image' && n.attrs?.src) {
      const key = extractKeyFromS3Url(n.attrs.src)
      if (key) {
        n.attrs.src = `${CDN_BASE}/${key}`
        changed = true
      }
    }

    // Link marks
    if (n.marks && Array.isArray(n.marks)) {
      for (const mark of n.marks) {
        if (mark.type === 'link' && mark.attrs?.href) {
          const key = extractKeyFromS3Url(mark.attrs.href)
          if (key) {
            mark.attrs.href = `${CDN_BASE}/${key}`
            changed = true
          }
        }
      }
    }

    // Recurse
    if (n.content && Array.isArray(n.content)) {
      for (const child of n.content) walk(child)
    }
  }

  walk(result)
  return { result, changed }
}

function stripToRelativeKey(url) {
  if (!url) return url

  // Strip S3 prefix
  if (url.includes('.amazonaws.com')) {
    const key = extractKeyFromS3Url(url)
    return key || url
  }

  // Strip CDN prefix
  if (url.startsWith(CDN_BASE + '/')) {
    return url.slice(CDN_BASE.length + 1)
  }

  return url
}

async function main() {
  const isDryRun = !process.argv.includes('--execute')

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  BLOG CONTENT URL MIGRATION`)
  console.log(`  Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '🔥 EXECUTE (writing to DB)'}`)
  console.log(`${'═'.repeat(60)}\n`)

  const blogs = await prisma.blog.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      featuredImageUrl: true,
      content: true,
      contentHtml: true,
      contentJson: true,
    },
  })

  console.log(`Found ${blogs.length} blogs to inspect.\n`)

  let totalAffected = 0
  let featuredImageFixed = 0
  let contentFixed = 0
  let contentHtmlFixed = 0
  let contentJsonFixed = 0

  for (const blog of blogs) {
    const updates = {}
    let blogChanged = false

    // 1. Featured image URL → relative key
    if (blog.featuredImageUrl && (blog.featuredImageUrl.includes('.amazonaws.com') || blog.featuredImageUrl.startsWith(CDN_BASE))) {
      const newUrl = stripToRelativeKey(blog.featuredImageUrl)
      if (newUrl !== blog.featuredImageUrl) {
        updates.featuredImageUrl = newUrl
        blogChanged = true
        featuredImageFixed++
        if (isDryRun) {
          console.log(`  [featuredImageUrl] ${blog.featuredImageUrl.substring(0, 80)}...`)
          console.log(`                   → ${newUrl}`)
        }
      }
    }

    // 2. Content HTML
    if (blog.content) {
      const { result, changed } = rewriteHtml(blog.content)
      if (changed) {
        updates.content = result
        blogChanged = true
        contentFixed++
      }
    }

    // 3. ContentHtml
    if (blog.contentHtml) {
      const { result, changed } = rewriteHtml(blog.contentHtml)
      if (changed) {
        updates.contentHtml = result
        blogChanged = true
        contentHtmlFixed++
      }
    }

    // 4. ContentJson
    if (blog.contentJson) {
      const { result, changed } = rewriteJson(blog.contentJson)
      if (changed) {
        updates.contentJson = result
        blogChanged = true
        contentJsonFixed++
      }
    }

    if (blogChanged) {
      totalAffected++
      console.log(`  ✏️  "${blog.title}" (${blog.slug})`)

      if (!isDryRun) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: updates,
        })
        console.log(`     ✅ Updated`)
      } else {
        console.log(`     📋 Would update: ${Object.keys(updates).join(', ')}`)
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  SUMMARY`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`  Total blogs inspected:    ${blogs.length}`)
  console.log(`  Total blogs affected:     ${totalAffected}`)
  console.log(`  featuredImageUrl fixed:   ${featuredImageFixed}`)
  console.log(`  content fixed:            ${contentFixed}`)
  console.log(`  contentHtml fixed:        ${contentHtmlFixed}`)
  console.log(`  contentJson fixed:        ${contentJsonFixed}`)

  if (isDryRun && totalAffected > 0) {
    console.log(`\n  ⚠️  Run with --execute to apply changes.`)
  } else if (!isDryRun) {
    console.log(`\n  ✅ All changes committed.`)
  } else {
    console.log(`\n  ✅ No changes needed — all URLs already clean.`)
  }

  console.log(`${'═'.repeat(60)}\n`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  prisma.$disconnect()
  process.exit(1)
})
