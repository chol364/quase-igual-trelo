import { getStoredFileResponse } from '@/lib/storage'

interface Params {
  params: Promise<{ path: string[] }>
}

export async function GET(_request: Request, { params }: Params) {
  const { path } = await params
  const response = await getStoredFileResponse(path)
  if (response) return response

  return new Response('Arquivo nao encontrado.', { status: 404 })
}
