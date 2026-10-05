import { describe, expect, it } from 'bun:test'

/**
 * Pins the abuse-prevention settings on the real Payload config so a future
 * refactor cannot silently reopen an endpoint or drop the login lockout.
 * These are behavioural guarantees, not implementation details: each one
 * corresponds to a documented production-abuse control.
 */
// `buildConfig` returns a Promise, so the config can only be read through a
// dynamic import at the top level. A static import would bind the unresolved
// promise and fail typecheck.
const config = await (await import('../../payload.config')).default

const users = config.collections.find((collection) => collection.slug === 'users')

describe('payload config abuse prevention', () => {
  it('locks out repeated failed logins', () => {
    // Payload already defaults to 5 attempts / 10 minutes, so the effective
    // guarantee is what matters: the values must exist and must not have been
    // loosened. Declaring them explicitly pins the intent against a future
    // change to the library default.
    expect(users?.auth).toBeDefined()
    const auth = users?.auth as { maxLoginAttempts?: number; lockTime?: number }
    expect(auth.maxLoginAttempts).toBeGreaterThanOrEqual(3)
    expect(auth.maxLoginAttempts).toBeLessThanOrEqual(10)
    expect(auth.lockTime).toBeGreaterThanOrEqual(60_000)
  })

  it('never allows the API to create a user', async () => {
    // buildConfig wraps every access function in withBaseAccess, so it takes
    // a full access-args object and returns a promise.
    const access = users?.access as { create?: (args: unknown) => Promise<unknown> }
    expect(typeof access.create).toBe('function')
    expect(await access.create!({ req: { payload: { config: {} } } })).toBe(false)
  })

  it('keeps local auth enabled so the operator can still sign in', () => {
    // `disableLocalStrategy` must stay falsy: Payload checks it for
    // truthiness on the login path, so setting it — even as
    // `{ enableFields: true }` — permanently locks the admin panel out.
    const auth = users?.auth as { disableLocalStrategy?: unknown }
    expect(auth.disableLocalStrategy).toBeFalsy()
  })

  it('does not register the GraphQL route', () => {
    // Nothing queries GraphQL; the REST route is the only read path. Leaving
    // it mounted exposes schema introspection and unbounded query cost.
    expect(config.graphQL?.disable).toBe(true)
  })

  it('caps relationship depth below the default of 10', () => {
    // A self-referential relationship can otherwise recurse deep enough to
    // stall a request.
    expect(config.maxDepth).toBeDefined()
    expect(config.maxDepth as number).toBeLessThan(10)
  })

  it('resolves an absolute serverURL rather than leaving it undefined', () => {
    expect(typeof config.serverURL).toBe('string')
    expect(config.serverURL).toMatch(/^https?:\/\//)
  })
})

describe('public collection access', () => {
  it('keeps media publicly readable but not anonymously writable', async () => {
    const media = config.collections.find((collection) => collection.slug === 'media')
    const access = media?.access as {
      read?: (args: unknown) => Promise<unknown>
      create?: (args: unknown) => Promise<unknown>
    }
    const args = { req: { payload: { config: {} } } }

    // Cover images are served to anonymous visitors on purpose.
    expect(await access.read!(args)).toBe(true)

    // create is not declared, so Payload falls back to defaultAccess, which
    // requires an authenticated user. Assert the effective behaviour rather
    // than the absence of a key, since buildConfig supplies that default.
    expect(await access.create!(args)).toBe(false)
  })

  it('restricts uploads to images', () => {
    const media = config.collections.find((collection) => collection.slug === 'media')
    expect(media?.upload?.mimeTypes).toEqual(['image/*'])
  })
})
