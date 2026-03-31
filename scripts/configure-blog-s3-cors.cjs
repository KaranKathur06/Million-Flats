const { PutBucketCorsCommand, S3Client } = require('@aws-sdk/client-s3')

function requireEnv(name, fallback = '') {
  const value = String(process.env[name] || fallback).trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function main() {
  const bucket = requireEnv('AWS_S3_BUCKET', 'millionflats-prod-assets')
  const region = requireEnv('AWS_REGION', 'eu-north-1')
  const client = new S3Client({ region })

  const corsRules = [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT'],
      AllowedOrigins: ['https://millionflats.com', 'http://localhost:3000'],
      ExposeHeaders: ['ETag'],
    },
  ]

  await client.send(new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules: corsRules },
  }))

  console.log(`Updated CORS for bucket: ${bucket}`)
}

main().catch((error) => {
  console.error('Failed to configure CORS:', error)
  process.exitCode = 1
})
