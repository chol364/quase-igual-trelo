import { randomUUID } from 'crypto'
import { del, get, put } from '@vercel/blob'

type StorageDriver = 'local' | 'vercel-blob'

type StoredFileResult = {
  key: string
  url: string
}

function getStorageDriver(): StorageDriver {
  if (process.env.STORAGE_DRIVER === 'vercel-blob') return 'vercel-blob'
  if (process.env.STORAGE_DRIVER === 'local') return 'local'
  return process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local'
}

function ensureSafeRelativePath(key: string) {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..')) {
    throw new Error('Storage key invalido.')
  }

  return normalized
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function encodePathSegments(key: string) {
  return ensureSafeRelativePath(key)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function decodePathSegments(segments: string[]) {
  return ensureSafeRelativePath(segments.map((segment) => decodeURIComponent(segment)).join('/'))
}

export function buildAttachmentStorageKey(cardId: string, fileName: string) {
  const safeName = sanitizeFileName(fileName)
  return ensureSafeRelativePath(`cards/${cardId}/${randomUUID()}-${safeName}`)
}

export function buildAttachmentUrl(key: string) {
  return `/api/uploads/${encodePathSegments(key)}`
}

export async function saveAttachmentFile(input: {
  cardId: string
  fileName: string
  contentType: string | null
  data: ArrayBuffer
}) {
  const key = buildAttachmentStorageKey(input.cardId, input.fileName)

  if (getStorageDriver() === 'vercel-blob') {
    await put(key, input.data, {
      access: 'private',
      addRandomSuffix: false,
      contentType: input.contentType ?? 'application/octet-stream',
    })
    return { key, url: buildAttachmentUrl(key) } satisfies StoredFileResult
  }

  const localStorage = await import('./local')
  await localStorage.saveLocalStoredFile({
    data: input.data,
    key,
    metadata: {
      contentType: input.contentType,
      fileName: input.fileName,
    },
  })
  return { key, url: buildAttachmentUrl(key) } satisfies StoredFileResult
}

export async function deleteStoredFile(key: string) {
  if (!key) return

  if (getStorageDriver() === 'vercel-blob') {
    await del(ensureSafeRelativePath(key)).catch(() => null)
    return
  }

  const localStorage = await import('./local')
  await localStorage.deleteLocalStoredFile(key)
}

export async function getStoredFileResponse(pathSegments: string[]) {
  const key = decodePathSegments(pathSegments)

  if (getStorageDriver() === 'vercel-blob') {
    const blob = await get(key, { access: 'private' })
    if (!blob || blob.statusCode !== 200) return null
    const fileName = key.split('/').at(-1) ?? 'arquivo'

    return new Response(blob.stream, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Type': blob.blob.contentType || 'application/octet-stream',
      },
    })
  }

  const localStorage = await import('./local')
  return localStorage.getLocalStoredFileResponse(key)
}
