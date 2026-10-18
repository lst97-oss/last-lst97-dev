const PEM_BEGIN = '-----BEGIN CERTIFICATE-----'
const PEM_END = '-----END CERTIFICATE-----'

/**
 * Decodes the pinned Postgres server certificate. Railway exposes it as a
 * base64-encoded PEM (`PG_SSL_CERT_B64`); a raw PEM is accepted too so the
 * same variable works from a file copy.
 */
export function decodePostgresCa(raw: string | undefined): string | undefined {
  const value = raw?.trim()
  if (!value) return undefined

  const pem = value.includes(PEM_BEGIN) ? value : Buffer.from(value, 'base64').toString('utf8').trim()
  if (!pem.includes(PEM_BEGIN) || !pem.includes(PEM_END)) {
    throw new Error('POSTGRES_SSL_CA must be a PEM certificate or its base64 encoding')
  }
  return `${pem}\n`
}

/**
 * Removes the `sslmode` query parameter. node-postgres lets the connection
 * string override the pool's `ssl` option whenever the URL names a mode, so a
 * pinned CA would otherwise be ignored. The rest of the URL is preserved
 * byte-for-byte, including the password's percent-encoding.
 */
export function withoutSslMode(url: string): string {
  const stripped = url.replace(/([?&])sslmode=[^&#]*(?=&|#|$)/i, '$1')
  return stripped.replace(/\?&/, '?').replace(/([?&])(?=#|$)/, '')
}

/**
 * node-postgres replaces node:tls's `servername` with the dialed host, so the
 * hostname check cannot be satisfied against Railway's certificate (which names
 * `localhost` and the private domain). The pinned CA already authenticates the
 * server; this check additionally fails closed if the certificate stops naming
 * the expected `localhost` SAN.
 */
export function checkPinnedPostgresIdentity(_hostname: string, cert: { subjectaltname?: string }): Error | undefined {
  return cert.subjectaltname?.includes('DNS:localhost')
    ? undefined
    : new Error('Postgres certificate does not include the pinned localhost SAN')
}
