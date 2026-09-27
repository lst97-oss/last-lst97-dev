const VERIFICATION_HEADER = 'x-origin-verification'
const encoder = new TextEncoder()

export function hasTrustedCloudflareOrigin(request: Request, sharedSecret: string | undefined): boolean {
  const expected = sharedSecret?.trim()
  const provided = request.headers.get(VERIFICATION_HEADER)?.trim()
  if (!expected || !provided) return false

  const expectedBytes = encoder.encode(expected)
  const providedBytes = encoder.encode(provided)
  if (expectedBytes.length < 32 || providedBytes.length !== expectedBytes.length) return false

  let difference = 0
  for (let index = 0; index < expectedBytes.length; index += 1) {
    const expectedByte = expectedBytes.at(index) ?? 0
    const providedByte = providedBytes.at(index) ?? 0
    difference |= expectedByte ^ providedByte
  }
  return difference === 0
}
