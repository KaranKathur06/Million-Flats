'use client'

import PartnerMediaUploader from '../fields/PartnerMediaUploader'

type Props = {
  partnerId?: string
  logo: string
  coverImage: string
  onLogoUploaded: (url: string) => void
  onCoverUploaded: (url: string) => void
  onLogoDeleted: () => void
  onCoverDeleted: () => void
}

export default function PartnerMediaSection({
  partnerId,
  logo,
  coverImage,
  onLogoUploaded,
  onCoverUploaded,
  onLogoDeleted,
  onCoverDeleted,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold text-white">Media</h2>
      <p className="mt-0.5 text-xs text-white/40">Partner logo and cover image. Drag & drop or click to upload.</p>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PartnerMediaUploader
          partnerId={partnerId}
          mediaType="LOGO"
          currentUrl={logo || null}
          label="Logo"
          maxSizeMB={2}
          recommendedSize="200×200px · Square"
          helpText="Square format. PNG with transparency preferred."
          onUploaded={onLogoUploaded}
          onDeleted={onLogoDeleted}
        />

        <PartnerMediaUploader
          partnerId={partnerId}
          mediaType="COVER"
          currentUrl={coverImage || null}
          label="Cover Image"
          maxSizeMB={10}
          recommendedSize="1200×600px · 2:1"
          helpText="Wide format. Used on partner profile page hero."
          onUploaded={onCoverUploaded}
          onDeleted={onCoverDeleted}
        />
      </div>
    </div>
  )
}
