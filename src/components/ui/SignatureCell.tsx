'use client'
import { getSignaturePath } from '@/lib/signatures'

interface Props {
  name?: string | null
  /** Max height of the signature image in px. Default 28 (suitable for table cells). */
  maxHeight?: number
  /** Max width of the signature image in px. Default 90. */
  maxWidth?: number
  /** Show the name as text below the image. Default true. */
  showName?: boolean
  /** Fallback shown when no name. Default '' */
  empty?: string
  className?: string
  /** Inline style overrides for the wrapper. */
  style?: React.CSSProperties
}

/**
 * Print-friendly signature cell.
 * - Renders the signature .png if `name` matches a preset in @/lib/signatures.
 * - Falls back to the name as plain text if no image exists.
 */
export default function SignatureCell({
  name,
  maxHeight = 28,
  maxWidth = 90,
  showName = true,
  empty = '',
  className,
  style,
}: Props) {
  if (!name) return <span className={className} style={style}>{empty}</span>
  const sig = getSignaturePath(name)
  if (!sig) {
    return <span className={className} style={style}>{name}</span>
  }
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1, ...style }}
    >
      <img
        src={sig}
        alt={name}
        style={{ maxHeight, maxWidth, objectFit: 'contain' }}
      />
      {showName && <span style={{ fontSize: '9px', color: '#444', marginTop: 2 }}>{name}</span>}
    </span>
  )
}
