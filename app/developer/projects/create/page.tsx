'use client'

import Link from 'next/link'
import ProjectEditorForm from '@/components/admin/projects/ProjectEditorForm'

export default function ProjectCreatePage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/developer/projects" className="text-gray-400 transition-colors hover:text-gray-700">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
      </div>
      <ProjectEditorForm mode="create" />
    </div>
  )
}
