import fs from 'node:fs'

export type GcsStorageConfig = {
  projectId: string
  bucket: string
  credentialsJson?: Record<string, unknown>
  keyFilename?: string
}

function readRequired(name: string): string {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function getGcsStorageConfig(): GcsStorageConfig {
  const projectId = readRequired('GCP_PROJECT_ID')
  const bucket = readRequired('GCP_STORAGE_BUCKET')

  const googleCredentials = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()
  if (googleCredentials) {
    if (!fs.existsSync(googleCredentials)) throw new Error('GOOGLE_APPLICATION_CREDENTIALS points to a missing file')
    return { projectId, bucket, keyFilename: googleCredentials }
  }

  const keyPath = String(process.env.GCP_SERVICE_ACCOUNT_KEY_PATH || '').trim()
  if (keyPath) {
    if (!fs.existsSync(keyPath)) throw new Error('GCP_SERVICE_ACCOUNT_KEY_PATH points to a missing file')
    return { projectId, bucket, keyFilename: keyPath }
  }

  const inlineJson = String(process.env.GCP_SERVICE_ACCOUNT_JSON || '').trim()
  if (inlineJson) {
    try {
      const credentials = JSON.parse(inlineJson) as Record<string, unknown>
      const credentialProjectId = String(credentials.project_id || '').trim()
      if (credentialProjectId && credentialProjectId !== projectId) {
        throw new Error('GCP service account project_id does not match GCP_PROJECT_ID')
      }
      return { projectId, bucket, credentialsJson: credentials }
    } catch (error) {
      throw new Error(`Invalid GCP_SERVICE_ACCOUNT_JSON: ${error instanceof Error ? error.message : 'unable to parse JSON'}`)
    }
  }

  return { projectId, bucket }
}
