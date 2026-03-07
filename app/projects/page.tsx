import type { Metadata } from 'next'
import ProjectsGridClient from './ProjectsGridClient'

export const metadata: Metadata = {
    title: 'Off-Plan Projects | MillionFlats',
    description:
        'Discover premium off-plan developments across Dubai and the UAE. Browse luxury projects by top developers with Golden Visa eligibility, and find your next investment opportunity.',
    keywords:
        'off-plan projects Dubai, new developments UAE, Golden Visa projects, luxury developments Dubai, DAMAC projects, Emaar projects',
    openGraph: {
        title: 'Off-Plan Projects | MillionFlats',
        description:
            'Discover premium off-plan developments across Dubai and the UAE. Browse luxury projects by top developers.',
        type: 'website',
    },
}

export default function ProjectsPage() {
    return <ProjectsGridClient />
}
