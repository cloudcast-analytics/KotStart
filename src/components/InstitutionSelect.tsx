import { useState } from 'react'
import { VLAAMSE_INSTELLINGEN } from '../lib/institutions'

interface InstitutionSelectProps {
  value: string
  onChange: (value: string) => void
  id?: string
  ariaLabel?: string
}

const inputClass =
  'w-full rounded-xl border border-white/90 bg-white/60 px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20'

export default function InstitutionSelect({ value, onChange, id, ariaLabel }: InstitutionSelectProps) {
  const [mode, setMode] = useState<'list' | 'other'>(
    value && !VLAAMSE_INSTELLINGEN.includes(value) ? 'other' : 'list',
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  if (mode === 'other') {
    return (
      <div className="flex flex-col gap-1">
        <input
          id={id}
          aria-label="Andere onderwijsinstelling"
          type="text"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="Naam onderwijsinstelling"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => {
            setMode('list')
            setQuery('')
            onChange('')
          }}
          className="self-start text-xs font-semibold text-accent"
        >
          &larr; Kies uit lijst
        </button>
      </div>
    )
  }

  const filtered = query
    ? VLAAMSE_INSTELLINGEN.filter(name => name.toLowerCase().includes(query.toLowerCase()))
    : VLAAMSE_INSTELLINGEN

  return (
    <div className="relative">
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        value={open ? query : value}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Zoek je onderwijsinstelling"
        className={inputClass}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/90 bg-white shadow-xl">
          {filtered.map(name => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                  setQuery('')
                }}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-accent/10"
              >
                {name}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setMode('other')
                setOpen(false)
                onChange('')
              }}
              className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent/10"
            >
              Andere&hellip;
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
