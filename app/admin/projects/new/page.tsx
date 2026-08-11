'use client'

import ProjectForm from '@/components/admin/projects/ProjectForm/ProjectForm'

export default function AdminAddProjectPage() {
    return (
        <div className="w-full">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-white/95">Add Project</h1>
                <p className="mt-1 text-sm text-white/40">Create a new developer project (saved as Draft)</p>
            </div>
            <ProjectForm mode="create" />
        </div>
    )
}
