import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

// Bun-native: pure string merge, no Node APIs. Shared className helper for
// all components/ui/* primitives (shadcn-style cn contract).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
