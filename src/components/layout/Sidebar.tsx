import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Building2, Settings, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { cn } from '../../lib/cn'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Overzicht', iconColor: 'text-accent' },
  { to: '/properties', icon: Building2, label: 'Panden', iconColor: 'text-teal-500' },
  { to: '/account', icon: User, label: 'Account', iconColor: 'text-blue-500' },
  { to: '/settings', icon: Settings, label: 'Instellingen', iconColor: 'text-slate-500' },
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true)

  return (
    <aside
      className={cn(
        'flex-shrink-0 flex flex-col',
        'bg-white/42 backdrop-blur-xl border-r border-white/70',
        'transition-[width] duration-250 ease-in-out overflow-hidden',
        expanded ? 'w-[200px]' : 'w-14',
      )}
    >
      <div className="flex justify-end px-2.5 py-3 border-b border-white/60">
        <button
          type="button"
          aria-label={expanded ? 'Inklappen' : 'Uitklappen'}
          onClick={() => setExpanded(e => !e)}
          className="w-7 h-7 rounded-lg bg-white/65 border border-white/90 flex items-center justify-center hover:bg-white/90 transition-colors"
        >
          {expanded
            ? <ChevronLeft size={14} className="text-slate-500" />
            : <ChevronRight size={14} className="text-slate-500" />
          }
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label, iconColor }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2 py-2.5 rounded-xl',
                'text-sm font-medium text-slate-600 transition-colors duration-130',
                'overflow-hidden whitespace-nowrap',
                isActive
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'hover:bg-white/60',
              )
            }
          >
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
              iconColor === 'text-accent'
                ? 'bg-accent/12'
                : iconColor === 'text-teal-500'
                  ? 'bg-teal-50'
                  : iconColor === 'text-blue-500'
                    ? 'bg-blue-50'
                    : 'bg-slate-100'
            )}>
              <Icon size={15} className={iconColor} />
            </div>
            <span className={cn('transition-opacity duration-200', expanded ? 'opacity-100' : 'opacity-0')}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
