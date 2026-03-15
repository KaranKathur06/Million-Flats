/**
 * SEO Score Calculator
 * Checks various SEO factors and returns a score out of 100
 */

export interface SEOCheck {
  name: string;
  passed: boolean;
  weight: number;
  message: string;
}

export interface SEOResult {
  score: number;
  checks: SEOCheck[];
  grade: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

const MAX_SCORE = 100;

const GRADE_THRESHOLDS = {
  excellent: 80,
  good: 50,
  'needs-improvement': 0,
} as const;

export function calculateSEOScore(
  title: string,
  metaDescription: string,
  content: string,
  targetKeyword: string,
  hasFeaturedImage: boolean,
  featuredImageAlt: string | null | undefined,
  internalLinks: number,
  excerpt: string
): SEOResult {
  const checks: SEOCheck[] = [];

  // 1. Keyword in title (15 points)
  const titleLower = title.toLowerCase();
  const keywordInTitle = titleLower.includes(targetKeyword.toLowerCase());
  checks.push({
    name: 'Keyword in Title',
    passed: keywordInTitle,
    weight: 15,
    message: keywordInTitle
      ? 'Target keyword found in title'
      : 'Target keyword missing from title',
  });

  // 2. Keyword in meta description (15 points)
  const metaDescLower = metaDescription.toLowerCase();
  const keywordInMetaDesc = metaDescLower.includes(targetKeyword.toLowerCase());
  checks.push({
    name: 'Keyword in Meta Description',
    passed: keywordInMetaDesc,
    weight: 15,
    message: keywordInMetaDesc
      ? 'Target keyword found in meta description'
      : 'Target keyword missing from meta description',
  });

  // 3. Keyword in first paragraph (10 points)
  const firstParagraph = content.split('\n')[0] || content;
  const keywordInFirstPara = firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase());
  checks.push({
    name: 'Keyword in First Paragraph',
    passed: keywordInFirstPara,
    weight: 10,
    message: keywordInFirstPara
      ? 'Target keyword found in first paragraph'
      : 'Target keyword missing from first paragraph',
  });

  // 4. Meta title length (10 points) - ideal 50-60 chars
  const metaTitleLength = title.length;
  const metaTitleLengthOk = metaTitleLength >= 30 && metaTitleLength <= 70;
  checks.push({
    name: 'Meta Title Length',
    passed: metaTitleLengthOk,
    weight: 10,
    message: metaTitleLengthOk
      ? `Meta title length is optimal (${metaTitleLength} chars)`
      : `Meta title length should be 30-70 chars (currently ${metaTitleLength})`,
  });

  // 5. Meta description length (10 points) - ideal 150-160 chars
  const metaDescLength = metaDescription.length;
  const metaDescLengthOk = metaDescLength >= 120 && metaDescLength <= 200;
  checks.push({
    name: 'Meta Description Length',
    passed: metaDescLengthOk,
    weight: 10,
    message: metaDescLengthOk
      ? `Meta description length is optimal (${metaDescLength} chars)`
      : `Meta description should be 120-200 chars (currently ${metaDescLength})`,
  });

  // 6. Word count >= 800 (10 points)
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wordCountOk = wordCount >= 800;
  checks.push({
    name: 'Word Count',
    passed: wordCountOk,
    weight: 10,
    message: wordCountOk
      ? `Content has ${wordCount} words`
      : `Content should be at least 800 words (currently ${wordCount})`,
  });

  // 7. Featured image (10 points)
  checks.push({
    name: 'Featured Image',
    passed: hasFeaturedImage,
    weight: 10,
    message: hasFeaturedImage
      ? 'Featured image present'
      : 'Add a featured image',
  });

  // 8. Image alt text (5 points)
  const hasAltText = Boolean(hasFeaturedImage && featuredImageAlt && featuredImageAlt.trim().length > 0);
  checks.push({
    name: 'Image Alt Text',
    passed: hasAltText,
    weight: 5,
    message: hasAltText
      ? 'Featured image has alt text'
      : 'Add descriptive alt text to featured image',
  });

  // 9. Internal links >= 2 (10 points)
  const internalLinkCount = internalLinks;
  const hasEnoughInternalLinks = internalLinkCount >= 2;
  checks.push({
    name: 'Internal Links',
    passed: hasEnoughInternalLinks,
    weight: 10,
    message: hasEnoughInternalLinks
      ? `Found ${internalLinkCount} internal links`
      : `Add at least 2 internal links (currently ${internalLinkCount})`,
  });

  // 10. Excerpt filled (5 points)
  const excerptOk = Boolean(excerpt && excerpt.trim().length >= 50);
  checks.push({
    name: 'Excerpt',
    passed: excerptOk,
    weight: 5,
    message: excerptOk
      ? 'Excerpt is filled with good length'
      : 'Add a 50+ character excerpt',
  });

  // Calculate total score
  const score = checks.reduce((total, check) => {
    return total + (check.passed ? check.weight : 0);
  }, 0);

  // Determine grade
  let grade: SEOResult['grade'];
  if (score >= GRADE_THRESHOLDS.excellent) {
    grade = 'excellent';
  } else if (score >= GRADE_THRESHOLDS.good) {
    grade = 'good';
  } else if (score >= GRADE_THRESHOLDS['needs-improvement']) {
    grade = 'needs-improvement';
  } else {
    grade = 'poor';
  }

  return {
    score,
    checks,
    grade,
  };
}

export function getSEOScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

export function getSEOScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function estimateReadTime(wordCount: number): number {
  // Average reading speed: 200 words per minute
  return Math.ceil(wordCount / 200);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function extractInternalLinks(content: string, currentSlug: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];
    // Check if it's an internal link (same domain or relative path)
    if (url.startsWith('/') && !url.includes('http')) {
      links.push(url);
    }
  }

  return links;
}