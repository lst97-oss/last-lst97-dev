import * as React from 'react'

type ReactCompilerInternals = {
  H: { useMemoCache(size: number): unknown } | null
}

type ReactWithCompilerInternals = typeof React & {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: ReactCompilerInternals
}

const reactInternals = (React as ReactWithCompilerInternals).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

export function c(size: number): unknown {
  const dispatcher = reactInternals.H

  if (dispatcher === null) {
    console.error('Invalid hook call. React compiler runtime was used outside a component.')
    return undefined
  }

  return dispatcher.useMemoCache(size)
}

export default { c }
