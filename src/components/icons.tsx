/**
 * SF-Symbols-shaped glyphs, inline.
 *
 * Drawn rather than imported so the geometry matches iOS: SF's chevrons are a
 * bare angle with round terminals — no bounding box, no crossbar — at a heavier
 * stroke than most icon sets use, and its xmark is two strokes of that same
 * weight. An icon library's chevron is a different shape at a different weight,
 * which is the tell that a UI is "iOS-styled" rather than iOS.
 *
 * Every glyph inherits `currentColor` and sizes off the parent's font size via
 * `1em`, so a button controls its icon through text colour and text size alone.
 */

interface IconProps {
  /** Marks the glyph decorative. Every caller here labels its own button, so
      the icon must not add a second, redundant name to the accessibility tree. */
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

export const ChevronLeft = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M15 5 8 12l7 7" />
  </svg>
)

export const ChevronRight = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

/** SF `arrow.counterclockwise` — an open ring with an arrowhead on the tail. */
export const ArrowCounterclockwise = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} strokeWidth={2.5} className={className}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.2 4.6v4.2h4.2" />
  </svg>
)

/** SF `xmark`. */
export const XMark = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
