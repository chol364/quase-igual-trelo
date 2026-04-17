import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'

type StoredFileMetadata = {
  contentType: string | null
  fileName: string
}

function getLocalStorageRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_LOCAL_PATH ?? './storage')
}

function getLocalStoragePaths(key: string) {
  const root = getLocalStorageRoot()
  const filePath = path.join(root, key)
  const metadataPath = `${filePath}.meta.json`
  return { filePath, metadataPath }
}

async function writeLocalMetadata(metadataPath: string, metadata: StoredFileMetadata) {
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8')
}

async function readLocalMetadata(metadataPath: string) {
  const raw = await readFile(metadataPath, 'utf8').catch(() => null)
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredFileMetadata
  } catch {
    return null
  }
}

export async function saveLocalStoredFile(input: {
  key: string
  metadata: StoredFileMetadata
  data: ArrayBuffer
}) {
  const { filePath, metadataPath } = getLocalStoragePaths(input.key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, Buffer.from(input.data))
  await writeLocalMetadata(metadataPath, input.metadata)
}

export async function deleteLocalStoredFile(key: string) {
  const { filePath, metadataPath } = getLocalStoragePaths(key)
  await Promise.all([
    unlink(filePath).catch(() => null),
    unlink(metadataPath).catch(() => null),
  ])
}

export async function getLocalStoredFileResponse(key: string) {
  const { filePath, metadataPath } = getLocalStoragePaths(key)
  const [fileBuffer, metadata] = await Promise.all([
    readFile(filePath).catch(() => null),
    readLocalMetadata(metadataPath),
  ])

  if (!fileBuffer) return null

  const contentType = metadata?.contentType || 'application/octet-stream'
  const fileName = metadata?.fileName || path.basename(filePath)

  return new Response(fileBuffer, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Type': contentType,
    },
  })
}
