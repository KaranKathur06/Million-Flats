import InternalPageBanner from '@/components/InternalPageBanner'

export default function PropertiesHero({ title, subtitle, breadcrumb, image }: any) {
  return <InternalPageBanner title={title} description={subtitle} image={image} breadcrumb={breadcrumb} />
}
