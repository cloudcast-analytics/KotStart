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
  showSchoolYearFilter?: boolean
  showPropertyFilter?: boolean
}

export default function TopBar({
  schoolYear,
  propertyName,
  schoolYears,
  propertyNames,
  onSchoolYearChange,
  onPropertyChange,
  onMenuClick,
  showMenuButton,
  showSchoolYearFilter = true,
  showPropertyFilter = true,
}: TopBarProps) {
  return (
    <div className="bg-white/38 backdrop-blur-xl border-b border-white/65 px-4 pt-3 pb-2.5">
      <div className="flex items-center gap-2">
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
        <div className="flex gap-1.5 flex-1 min-w-0">
          {showSchoolYearFilter && (
            <Chip
              label={schoolYear}
              onClick={() => {
                const currentIndex = schoolYears.indexOf(schoolYear)
                const next = schoolYears[(currentIndex + 1) % schoolYears.length] ?? schoolYear
                onSchoolYearChange(next)
              }}
              className="flex-1 max-w-[130px]"
            />
          )}
          {showPropertyFilter && (
            <Chip
              label={propertyName}
              onClick={() => {
                const currentIndex = propertyNames.indexOf(propertyName)
                const next = propertyNames[(currentIndex + 1) % propertyNames.length] ?? propertyName
                onPropertyChange(next)
              }}
              className="flex-1"
            />
          )}
        </div>
      </div>
    </div>
  )
}
