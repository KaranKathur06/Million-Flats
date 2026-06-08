import { redirect } from 'next/navigation'

// This route previously held a blog dashboard that was incorrectly placed here.
// Admin main dashboard is at /admin. Blog dashboard is at /admin/blogs/dashboard.
export default function OldDashboardRedirect() {
  redirect('/admin')
}