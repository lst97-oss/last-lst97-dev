import type { Where } from 'payload'

export function publishedAccess(): Where {
  return {
    and: [
      { status: { equals: 'published' } },
      { publishedAt: { less_than_equal: new Date().toISOString() } },
    ],
  }
}

/**
 * Single-operator site: nobody may create a user through the API.
 *
 * Payload's `auth: true` does NOT open a public register route, but it does
 * mount `POST /api/users/first-register`, which seeds the very first user and
 * then 403s forever once any user row exists. That guard is incidental — it
 * lives in a single `payload.db.findOne` call, so a wiped or restored-from-
 * scratch database would silently re-open account creation.
 *
 * `disableLocalStrategy` would close it unconditionally, but Payload checks
 * that flag for truthiness on the *login* path too
 * (`dist/auth/operations/login.js:32`), so setting it — even in the
 * `{ enableFields: true }` object form — throws Forbidden on every sign-in and
 * permanently locks the operator out of the admin panel.
 *
 * Denying `create` at the access layer is the equivalent guarantee without
 * that footgun. The parameter is accepted only to satisfy the AccessArgs
 * signature Payload invokes it with, and is never read: there is no
 * legitimate caller, so the answer is always no.
 */
export function denyUserCreation(_args?: unknown): false {
  return false
}
