import { ClipboardList, CalendarPlus, ClipboardCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { StudentDashboardRow } from '../../types'

interface StudentRowProps {
  row: StudentDashboardRow
  isEven?: boolean
  onStartInspection: (contractId: string) => void
  onRenew: (contractId: string) => void
  onEndInspection: (contractId: string) => void
  onOpenContract: (contractId: string) => void
}

export default function StudentRow({
  row,
  isEven = false,
  onStartInspection,
  onRenew,
  onEndInspection,
  onOpenContract,
}: StudentRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b border-slate-200/55',
        isEven ? 'bg-white/30' : '',
        'hover:bg-white/50 transition-colors duration-130',
      )}
    >
      <button
        type="button"
        onClick={() => onOpenContract(row.contractId)}
        className="flex-1 min-w-0 text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20"
        aria-label={`Contract openen voor ${row.firstName} ${row.lastName}`}
      >
        <p className="text-sm font-semibold text-slate-900 truncate">
          {row.firstName} {row.lastName}
          {row.secondFirstName && row.secondLastName && ` & ${row.secondFirstName} ${row.secondLastName}`}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-0.5 md:hidden">{row.roomNumber}</p>
      </button>

      <button
        type="button"
        onClick={() => onOpenContract(row.contractId)}
        className="hidden md:block w-[72px] flex-shrink-0 text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20"
        aria-label={`Contract openen kamer ${row.roomNumber}`}
      >
        <span className="text-sm font-medium text-slate-500">{row.roomNumber}</span>
      </button>

      <div className="flex items-center gap-1.5 w-[136px] justify-end flex-shrink-0">
        <button
          type="button"
          aria-label="Startplaatsbeschrijving"
          onClick={() => onStartInspection(row.contractId)}
          className={cn('btn-action', row.startInspectionDone ? 'btn-action-start-done' : 'btn-action-start')}
        >
          <ClipboardList size={15} className={row.startInspectionDone ? 'text-green-100' : 'text-start-green'} />
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-green-400 to-green-700 text-white text-[7px] font-black flex items-center justify-center border-[1.5px] border-white">
            S
          </span>
        </button>

        <button
          type="button"
          aria-label="Contract verlengen"
          onClick={() => onRenew(row.contractId)}
          className={cn('btn-action', row.renewDone ? 'btn-action-renew-done' : 'btn-action-renew')}
        >
          <CalendarPlus size={15} className={row.renewDone ? 'text-blue-100' : 'text-renew-blue'} />
        </button>

        <button
          type="button"
          aria-label="Eindplaatsbeschrijving"
          onClick={() => onEndInspection(row.contractId)}
          className={cn('btn-action', row.endInspectionDone ? 'btn-action-end-done' : 'btn-action-end')}
        >
          <ClipboardCheck size={15} className={row.endInspectionDone ? 'text-purple-100' : 'text-end-purple'} />
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-purple-400 to-purple-700 text-white text-[7px] font-black flex items-center justify-center border-[1.5px] border-white">
            E
          </span>
        </button>
      </div>
    </div>
  )
}
