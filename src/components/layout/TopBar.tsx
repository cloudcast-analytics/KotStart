import { Menu } from 'lucide-react'
import Chip from '../ui/Chip'

interface TopBarProps {
  schoolYear: string
  propertyName: string
  schoolYears: string[]
  propertyNames: string[]
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (name: string) => void
  onMenuClick: () => void
  showMenuButton: boolean
}

export default function TopBar({
  schoolYear,
  propertyName,
  onSchoolYearChange,
  onPropertyChange,
  onMenuClick,
  showMenuButton,
}: TopBarProps) {
  return (
    <div className="bg-white/38 backdrop-blur-xl border-b border-white/65 px-4 pt-3 pb-2.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1 min-w-0">
          <Chip
            label={schoolYear}
            onClick={() => {
              const next = schoolYear === '2025–2026' ? '2024–2025' : '2025–2026'
              onSchoolYearChange(next)
            }}
            className="flex-1 max-w-[130px]"
          />
          <Chip
            label={propertyName}
            onClick={() => {
              const next = propertyName === 'Residentie De Linde'
                ? 'Kot Guldensporenstraat'
                : 'Residentie De Linde'
              onPropertyChange(next)
            }}
            className="flex-1"
          />
        </div>
        {showMenuButton && (
          <button
            type="button"
            aria-label="Menu openen"
            onClick={onMenuClick}
            className="glass-chip w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center"
          >
            <Menu size={16} className="text-slate-500" />
          </button>
        )}
      </div>
    </div>
  )
}
