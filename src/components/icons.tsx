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

/** SF `square.and.arrow.up` — the platform share affordance on iOS. */
export const ShareUp = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} strokeWidth={2.4} className={className}>
    <path d="M12 3.4v11.2" />
    <path d="M8.1 7.2 12 3.3l3.9 3.9" />
    <path d="M8.2 10.4H5.6A1.6 1.6 0 0 0 4 12v7.4A1.6 1.6 0 0 0 5.6 21h12.8a1.6 1.6 0 0 0 1.6-1.6V12a1.6 1.6 0 0 0-1.6-1.6h-2.6" />
  </svg>
)

/** SF `checkmark`, for the moment after a copy. */
export const Checkmark = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4.8 12.6 9.7 17.5 19.2 6.8" />
  </svg>
)

/** SF `printer`. */
export const Printer = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} strokeWidth={2.2} className={className}>
    <path d="M7 9.4V4.4h10v5" />
    <path d="M7 17H5.4A1.4 1.4 0 0 1 4 15.6v-4.8a1.4 1.4 0 0 1 1.4-1.4h13.2A1.4 1.4 0 0 1 20 10.8v4.8a1.4 1.4 0 0 1-1.4 1.4H17" />
    <path d="M7.4 14h9.2v5.6H7.4z" />
  </svg>
)

/** SF `magnifyingglass`, marking the direct date entry. */
export const MagnifyingGlass = ({ className = 'h-[1em] w-[1em]' }: IconProps) => (
  <svg {...base} strokeWidth={2.4} className={className}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.4 15.4 4.3 4.3" />
  </svg>
)
