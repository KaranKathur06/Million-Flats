import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp, open, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, getS3StorageConfig, getS3ObjectMetadata } from '@/lib/s3'
import { parseBoundedPositiveInt } from '@/lib/videoReels/config'

const execFileAsync = promisify(execFile)
const DEFAULT_MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const MAX_VIDEO_DURATION_MS = 60_000

export class VideoMediaError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_MEDIA' | 'MEDIA_INSPECTOR_UNAVAILABLE' | 'MEDIA_STORAGE_UNAVAILABLE',
  ) {
    super(message)
    this.name = 'VideoMediaError'
  }
}

function isReadable(value: unknown): value is Readable {
  return value instanceof Readable
}

function getAllowedUploadSize() {
  return parseBoundedPositiveInt(
    process.env.VIDEO_REEL_MAX_SIZE_BYTES,
    DEFAULT_MAX_VIDEO_BYTES,
    MAX_VIDEO_BYTES,
  )
}

export async function inspectVideoObject(params: {
  key: string
  expectedContentType: 'video/mp4' | 'video/webm'
  expectedSizeBytes: number
}) {
  if (!params.key.startsWith('private/video-reels/')) {
    throw new VideoMediaError('Media object is outside the private reels namespace', 'INVALID_MEDIA')
  }
  if (
    !Number.isSafeInteger(params.expectedSizeBytes)
    || params.expectedSizeBytes < 1
    || params.expectedSizeBytes > getAllowedUploadSize()
  ) {
    throw new VideoMediaError('Media size is outside the allowed limit', 'INVALID_MEDIA')
  }

  let metadata: Awaited<ReturnType<typeof getS3ObjectMetadata>>
  try {
    metadata = await getS3ObjectMetadata({ key: params.key })
  } catch {
    throw new VideoMediaError('Uploaded media could not be verified in storage', 'MEDIA_STORAGE_UNAVAILABLE')
  }
  if (metadata.sizeBytes !== params.expectedSizeBytes || metadata.contentType !== params.expectedContentType) {
    throw new VideoMediaError('Uploaded media metadata does not match the declared upload', 'INVALID_MEDIA')
  }

  const { bucket } = getS3StorageConfig()
  const tempDirectory = await mkdtemp(join(tmpdir(), 'millionflats-video-'))
  const filePath = join(tempDirectory, 'uploaded-media')

  try {
    const response = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: params.key }))
    if (!isReadable(response.Body)) {
      throw new VideoMediaError('Uploaded media could not be read for inspection', 'MEDIA_STORAGE_UNAVAILABLE')
    }

    await pipeline(response.Body, createWriteStream(filePath, { flags: 'wx' }))
    const file = await open(filePath, 'r')
    const header = Buffer.alloc(16)
    try {
      const { bytesRead } = await file.read(header, 0, header.length, 0)
      const isMp4 = bytesRead >= 8 && header.toString('ascii', 4, 8) === 'ftyp'
      const isWebm = bytesRead >= 4 && header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      if ((params.expectedContentType === 'video/mp4' && !isMp4)
        || (params.expectedContentType === 'video/webm' && !isWebm)) {
        throw new VideoMediaError('Uploaded media bytes do not match the declared format', 'INVALID_MEDIA')
      }
    } finally {
      await file.close()
    }

    const fileInfo = await stat(filePath)
    if (fileInfo.size !== params.expectedSizeBytes || fileInfo.size > getAllowedUploadSize()) {
      throw new VideoMediaError('Stored media size does not match the upload', 'INVALID_MEDIA')
    }

    let probeOutput: string
    try {
      const result = await execFileAsync(
        String(process.env.VIDEO_REELS_FFPROBE_PATH || 'ffprobe'),
        [
          '-v', 'error',
          '-show_entries', 'format=duration:stream=codec_type',
          '-of', 'json',
          filePath,
        ],
        { timeout: 30_000, maxBuffer: 64 * 1024, windowsHide: true },
      )
      probeOutput = result.stdout
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : ''
      if (code === 'ENOENT') {
        throw new VideoMediaError('Server-side video inspection is not configured', 'MEDIA_INSPECTOR_UNAVAILABLE')
      }
      throw new VideoMediaError('Uploaded media could not be inspected', 'INVALID_MEDIA')
    }

    let probe: { format?: { duration?: string }; streams?: Array<{ codec_type?: string }> }
    try {
      probe = JSON.parse(probeOutput) as typeof probe
    } catch {
      throw new VideoMediaError('Media inspector returned invalid metadata', 'INVALID_MEDIA')
    }

    const durationSeconds = Number(probe.format?.duration)
    const hasVideoStream = probe.streams?.some((stream) => stream.codec_type === 'video') === true
    const durationMs = Math.round(durationSeconds * 1000)
    if (!hasVideoStream || !Number.isSafeInteger(durationMs) || durationMs < 1 || durationMs > MAX_VIDEO_DURATION_MS) {
      throw new VideoMediaError('Videos must contain a video stream and be no longer than 60 seconds', 'INVALID_MEDIA')
    }

    return { durationMs, sizeBytes: fileInfo.size, contentType: metadata.contentType }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
}
