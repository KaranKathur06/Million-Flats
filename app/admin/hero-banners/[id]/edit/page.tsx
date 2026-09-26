import HeroBannerEditorClient from '@/components/admin/HeroBannerEditorClient'

export const dynamic = 'force-dynamic'

export default async function EditHeroBannerPage({ params }: { params: { id: string } }) {
  return <HeroBannerEditorClient bannerId={params.id} />
}