/**
 * MillionFlats — S3 Media Uploader for Project Import
 *
 * Downloads images/videos from URLs and uploads to S3.
 * Uses @aws-sdk/client-s3 (v3) consistent with the existing codebase.
 *
 * S3 Structure:
 *   public/projects/damac/{slug}/hero/
 *   public/projects/damac/{slug}/gallery/
 *   public/projects/damac/{slug}/floorplans/
 *   public/projects/damac/{slug}/videos/
 */
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const axios = require("axios")
const crypto = require("crypto")
const path = require("path")

let s3Client = null

function getClient() {
    if (s3Client) return s3Client
    const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || "").trim()
    const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || "").trim()
    const region = (process.env.AWS_REGION || "").trim()
    if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error("Missing AWS credentials")
    }
    s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
    return s3Client
}

function guessExtension(contentType, url) {
    const ct = (contentType || "").toLowerCase()
    if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg"
    if (ct.includes("image/png")) return "png"
    if (ct.includes("image/webp")) return "webp"
    if (ct.includes("image/gif")) return "gif"
    if (ct.includes("image/avif")) return "avif"
    if (ct.includes("video/mp4")) return "mp4"
    if (ct.includes("video/webm")) return "webm"
    const ext = path.extname(new URL(url).pathname).replace(".", "").toLowerCase()
    if (["jpg", "jpeg", "png", "webp", "gif", "avif", "mp4", "webm"].includes(ext)) {
        return ext === "jpeg" ? "jpg" : ext
    }
    return "jpg"
}

/**
 * Upload a single media file to S3
 * @param {string} imageUrl - Source URL
 * @param {string} developerSlug - e.g. "damac"
 * @param {string} projectSlug - e.g. "safa-gate"
 * @param {"hero"|"gallery"|"floorplans"|"videos"} folder - Sub-folder
 * @returns {Promise<{s3Key, objectUrl, contentType}|null>}
 */
async function uploadMediaToS3(imageUrl, developerSlug, projectSlug, folder = "gallery") {
    const bucket = (process.env.AWS_S3_BUCKET || "").trim()
    const region = (process.env.AWS_REGION || "").trim()
    if (!bucket) throw new Error("Missing AWS_S3_BUCKET")

    const client = getClient()

    let response
    try {
        response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        })
    } catch (err) {
        console.warn(`  ⚠ Download failed: ${imageUrl} (${err.message})`)
        return null
    }

    const contentType = (response.headers["content-type"] || "image/jpeg").split(";")[0].trim()
    const ext = guessExtension(contentType, imageUrl)
    const uuid = crypto.randomUUID()
    const s3Key = `public/projects/${developerSlug}/${projectSlug}/${folder}/${uuid}.${ext}`

    try {
        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: Buffer.from(response.data),
            ContentType: contentType,
        }))
    } catch (err) {
        console.warn(`  ⚠ S3 upload failed: ${s3Key} (${err.message})`)
        return null
    }

    const objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`
    return { s3Key, objectUrl, contentType }
}

module.exports = uploadMediaToS3
