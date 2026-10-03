import { cn } from 'cn'

/**
 * Semantic token utilities only — the placeholder inverts with the theme.
 */
const PLACEHOLDER_TONES = [
  'bg-primary',
  'bg-accent',
  'bg-secondary',
  'bg-success-muted',
  'bg-info-muted',
  'bg-warning-muted',
  'bg-error-muted',
  'bg-muted',
] as const

/**
 * Tailwind's scanner only sees literal class strings, so every span width is
 * spelled out here instead of interpolated.
 */
const SPAN_CLASS = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
} as const

type Cell = readonly [colSpan: 1 | 2 | 3 | 4, toneOffset: number]
type Row = readonly Cell[]
type Pattern = readonly Row[]

/** Six templates of four rows; every row's column spans sum to 4. */
const PLACEHOLDER_PATTERNS: readonly Pattern[] = [
  [
    [
      [3, 0],
      [1, 1],
    ],
    [
      [2, 2],
      [2, 3],
    ],
    [
      [1, 4],
      [1, 5],
      [2, 6],
    ],
    [[4, 7]],
  ],
  [
    [
      [1, 0],
      [3, 1],
    ],
    [
      [2, 2],
      [2, 3],
    ],
    [
      [1, 4],
      [3, 5],
    ],
    [[4, 6]],
  ],
  [
    [
      [1, 0],
      [3, 1],
    ],
    [[4, 2]],
    [
      [3, 3],
      [1, 4],
    ],
    [
      [1, 5],
      [1, 6],
      [2, 7],
    ],
  ],
  [
    [
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [[4, 3]],
    [
      [1, 4],
      [1, 5],
      [2, 6],
    ],
    [
      [3, 7],
      [1, 0],
    ],
  ],
  [
    [[4, 0]],
    [
      [2, 1],
      [2, 2],
    ],
    [
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
    ],
    [
      [2, 7],
      [2, 0],
    ],
  ],
  [
    [
      [2, 0],
      [2, 1],
    ],
    [
      [1, 2],
      [3, 3],
    ],
    [[4, 4]],
    [
      [2, 5],
      [2, 6],
    ],
  ],
]

/** FNV-1a 32-bit — pure, so server and client markup stay identical. */
function seedHash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193)
  }
  return h >>> 0
}

export function PlaceholderArt({ seed, label }: { seed: string; label?: string }) {
  const hash = seedHash(seed)
  const rows = PLACEHOLDER_PATTERNS[hash % PLACEHOLDER_PATTERNS.length] ?? PLACEHOLDER_PATTERNS[0]

  return (
    <div
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="grid size-full grid-cols-4 grid-rows-4 gap-1 p-1"
      role={label ? 'img' : undefined}
    >
      {rows.map((row, r) =>
        row.map(([colSpan, toneOffset], c) => (
          <span
            className={cn(
              PLACEHOLDER_TONES[(hash + r * 3 + c * 5 + toneOffset) % PLACEHOLDER_TONES.length],
              SPAN_CLASS[colSpan],
            )}
            key={`${r}-${c}`}
          />
        )),
      )}
    </div>
  )
}
