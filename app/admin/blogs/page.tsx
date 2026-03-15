import { redirect } from 'next/navigation'

export default function BlogsIndexPage() {
  redirect('/admin/blogs/dashboard')
}