import { redirect } from 'next/navigation'

type LegacyBlogSlugProps = {
  params: { slug: string }
}

export const revalidate = 60

export default function LegacyBlogSlugPage({ params }: LegacyBlogSlugProps) {
  redirect(`/blogs/${params.slug}`)
}
