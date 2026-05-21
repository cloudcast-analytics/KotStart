import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ChipProps {
  label: string
  onClick: () => void
  className?: string
}

export default function Chip({ label, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'glass-chip flex items-center gap-1.5 px-2.5 py-2 rounded-xl',
        'text-slate-800 text-xs font-semibold',
        'hover:bg-white/80 transition-colors duration-150',
        'min-h-[36px]',
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
    </button>
  )
}
