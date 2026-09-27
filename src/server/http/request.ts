export function requestIdFrom(request: Request): string {
  const supplied = request.headers.get('x-request-id')?.trim()
  if (supplied && /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied)) {
    return supplied
  }
  return crypto.randomUUID()
}

export function jsonResponse(
  requestId: string,
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-request-id': requestId,
      ...extraHeaders,
    },
  })
}

export type JsonBodyResult = { ok: true; value: unknown } | { ok: false; reason: 'too_large' | 'invalid_json' }

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return { ok: false, reason: 'too_large' }
  if (!request.body) return { ok: false, reason: 'invalid_json' }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        return { ok: false, reason: 'too_large' }
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, reason: 'invalid_json' }
  } finally {
    reader.releaseLock()
  }
}
