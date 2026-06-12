import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface FilterDropdownExtraAction {
  label: string
  onClick: () => void
}

interface FilterDropdownProps {
  label: string
  options: string[]
  onSelect: (value: string) => void
  extraAction?: FilterDropdownExtraAction
  className?: string
}

export default function FilterDropdown({ label, options, onSelect, extraAction, className }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'glass-chip flex items-center gap-1.5 px-2.5 py-2 rounded-xl w-full',
          'text-slate-800 text-xs font-semibold',
          'hover:bg-white/80 transition-colors duration-150',
          'min-h-[36px]',
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={12} className="text-slate-400 flex-shrink-0 ml-auto" />
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/90 bg-white shadow-xl">
          {options.map(option => (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  onSelect(option)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm font-medium hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none',
                  option === label ? 'font-semibold text-accent' : 'text-slate-700',
                )}
              >
                {option}
              </button>
            </li>
          ))}
          {extraAction && (
            <li>
              <button
                type="button"
                onClick={() => {
                  extraAction.onClick()
                  setOpen(false)
                }}
                className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none"
              >
                {extraAction.label}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
