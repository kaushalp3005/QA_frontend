'use client'

import { useState } from 'react'

export interface FloorOption {
  id: number
  floor_name: string
  sort_order?: number
}

interface Props {
  value: string
  onChange: (v: string) => void
  /** Floors for the active plant, from /qc/dropdown/factories-floors. */
  options: FloorOption[]
  placeholder?: string
  className?: string
  /** Placeholder for the free-text box revealed by "Other". */
  otherPlaceholder?: string
}

const OTHER = '__other__'

/**
 * Location / floor dropdown with a free-text escape hatch.
 *
 * The list is the plant's configured floors (managed at
 * /documentations/ipqc/settings), so a new area normally belongs there rather
 * than typed here. "Other" exists for the case where a record has to be logged
 * against an area that isn't in the list yet — without it, the entry can't be
 * saved at all until someone edits the settings.
 *
 * A value that isn't in the list — a floor since renamed, or one typed through
 * "Other" — keeps showing in the text box rather than silently resetting to
 * blank when the record is reopened.
 */
export default function FloorSelect({
  value,
  onChange,
  options,
  placeholder = 'Select location…',
  className = 'input-base',
  otherPlaceholder = 'Type the location…',
}: Props) {
  const inList = !!value && options.some((fl) => fl.floor_name === value)
  // Sticky: staying in "Other" mode while the box is empty, so the text input
  // doesn't vanish the moment the user clears what they typed.
  const [other, setOther] = useState(!!value && !inList)
  const showOther = other || (!!value && !inList)

  return (
    <>
      <select
        value={showOther ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true)
            onChange('')
          } else {
            setOther(false)
            onChange(e.target.value)
          }
        }}
        className={className}
      >
        <option value="">{placeholder}</option>
        {options.map((fl) => (
          <option key={fl.id} value={fl.floor_name}>{fl.floor_name}</option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {showOther && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          className={`${className} mt-2`}
          autoFocus={other && !value}
        />
      )}
    </>
  )
}
