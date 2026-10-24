import { describe, expect, it } from '@jest/globals'
import { UploadServiceError } from '@/services/uploadService'
import { LEAD_MAGNET_MAX_FILE_SIZE_BYTES } from '@/lib/leadMagnets/fileTypes'
import { validateLeadMagnetFile } from '@/lib/leadMagnets/fileValidation'

const fileSignatures = [
  { name: 'guide.pdf', type: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { name: 'cover.png', type: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: 'cover.jpg', type: 'image/jpeg', signature: [0xff, 0xd8, 0xff, 0x00] },
  { name: 'cover.webp', type: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50] },
]

function createFile(name: string, type: string, signature: number[], size = signature.length) {
  const bytes = new Uint8Array(size)
  bytes.set(signature)
  const file = new File([bytes], name, { type })
  Object.defineProperty(file, 'slice', {
    value: () => ({ arrayBuffer: async () => bytes.buffer }),
  })
  return file
}

describe('lead magnet file validation', () => {
  it.each(fileSignatures)('accepts a valid $type file', async ({ name, type, signature }) => {
    await expect(validateLeadMagnetFile(createFile(name, type, signature))).resolves.toMatchObject({ name, type })
  })

  it('infers the MIME type from a valid signature when the browser omits it', async () => {
    const file = createFile('cover.png', '', fileSignatures[1].signature)

    await expect(validateLeadMagnetFile(file)).resolves.toMatchObject({ name: 'cover.png', type: 'image/png' })
  })

  it('adds the detected extension to a supported file that has no extension', async () => {
    const file = createFile('cover', '', fileSignatures[1].signature)

    await expect(validateLeadMagnetFile(file)).resolves.toMatchObject({ name: 'cover.png', type: 'image/png' })
  })

  it('rejects unsupported MIME types and mismatched content signatures', async () => {
    await expect(validateLeadMagnetFile(createFile('cover.svg', 'image/svg+xml', [0x3c, 0x73, 0x76, 0x67])))
      .rejects.toBeInstanceOf(UploadServiceError)
    await expect(validateLeadMagnetFile(createFile('cover.png', 'image/png', fileSignatures[2].signature)))
      .rejects.toThrow('File type does not match its content')
    await expect(validateLeadMagnetFile(createFile('cover.pdf', 'image/png', fileSignatures[1].signature)))
      .rejects.toThrow('File extension does not match its content type')
  })

  it('rejects files larger than 10 MB before reading the content', async () => {
    const file = createFile('guide.pdf', 'application/pdf', fileSignatures[0].signature, LEAD_MAGNET_MAX_FILE_SIZE_BYTES + 1)

    await expect(validateLeadMagnetFile(file)).rejects.toThrow('File too large (max 10MB)')
  })
})
