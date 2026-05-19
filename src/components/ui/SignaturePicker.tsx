'use client'
import type { SignatureOption } from '@/lib/signatures'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  options: SignatureOption[]
  roleHint?: string
  required?: boolean
  inputCls?: string
  labelCls?: string
  placeholder?: string
}

const DEFAULT_INPUT =
  'w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition'
const DEFAULT_LABEL =
  'block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide'

export default function SignaturePicker({
  label,
  value,
  onChange,
  options,
  roleHint,
  required,
  inputCls,
  labelCls,
  placeholder,
}: Props) {
  const presetNames = options.filter(o => o.name !== 'Other').map(o => o.name)
  const isOther = value !== '' && !presetNames.includes(value)
  const selectVal = isOther ? 'Other' : value

  const _inputCls = inputCls || DEFAULT_INPUT
  const _labelCls = labelCls || DEFAULT_LABEL

  return (
    <div>
      <label className={_labelCls}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={selectVal}
        onChange={e => {
          const v = e.target.value
          onChange(v === 'Other' ? '' : v)
        }}
        className={_inputCls}
        required={required}
      >
        <option value="">Select…</option>
        {options.map(o => (
          <option key={o.name} value={o.name}>{o.name}</option>
        ))}
      </select>
      {(selectVal === 'Other' || isOther) && (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || `Type ${label.toLowerCase()} name…`}
          className={`${_inputCls} mt-2`}
          autoFocus={selectVal === 'Other' && !value}
        />
      )}
      {roleHint && <p className="text-[11px] text-gray-400 mt-1.5">{roleHint}</p>}
    </div>
  )
}
