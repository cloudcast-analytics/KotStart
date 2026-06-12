import { cn } from '../../lib/cn'

type SortKey = 'student' | 'room'
type SortDir = 'asc' | 'desc'

interface ActionBarProps {
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onNewContract: () => void
}

export default function ActionBar({ sortKey, sortDir, onSort, onNewContract }: ActionBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white/22 border-b border-slate-200/45">
      <div className="flex gap-4">
        {(['student', 'room'] as SortKey[]).map(key => (
          <button
            key={key}
            type="button"
            aria-label={key === 'student' ? 'Student' : 'Kamer'}
            onClick={() => onSort(key)}
            className={cn(
              'flex items-center gap-1 text-[10.5px] font-bold tracking-[0.05em] uppercase transition-colors',
              sortKey === key ? 'text-accent' : 'text-slate-400 hover:text-slate-600',
            )}
          >
            {key === 'student' ? 'Student' : 'Kamer'}
            {sortKey === key && (
              <span data-testid="sort-arrow" className="text-accent text-[10px]">
                {sortDir === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNewContract}
        className="btn-primary text-xs font-bold px-3 py-2 min-h-[32px]"
        aria-label="Nieuw Contract aanmaken"
      >
        + Nieuw Contract
      </button>
    </div>
  )
}
