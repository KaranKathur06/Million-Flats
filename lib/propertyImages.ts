export function resolvePropertyImages(args: {
  propertyType: string
  images?: string[]
  seed: string
}) {
  return (args.images || []).filter(Boolean)
}

export function resolveImagesForProperty(property: Pick<{ id: string; propertyType: string; images: string[] }, 'id' | 'propertyType' | 'images'>) {
  return resolvePropertyImages({
    propertyType: property.propertyType,
    images: property.images,
    seed: property.id,
  })
}
