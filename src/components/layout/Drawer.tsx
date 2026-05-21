import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Home, Building2, Settings, User } from 'lucide-react'
import { cn } from '../../lib/cn'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Overzicht' },
  { to: '/properties', icon: Building2, label: 'Panden' },
  { to: '/account', icon: User, label: 'Account' },
  { to: '/settings', icon: Settings, label: 'Instellingen' },
]

export default function Drawer({ isOpen, onClose }: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            data-testid="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-[75vw] max-w-[280px] h-full flex flex-col bg-white/72 backdrop-blur-3xl border-r border-white/95"
            style={{ boxShadow: '4px 0 40px rgba(0,0,0,0.15)' }}
          >
            <div className="pt-14 px-5 pb-4 border-b border-white/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                  <Home size={16} className="text-white" />
                </div>
                <span className="text-lg font-extrabold text-slate-800 tracking-tight">KotStart</span>
              </div>
            </div>

            <nav className="flex-1 flex flex-col gap-1 p-4">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-2xl',
                      'text-sm font-semibold transition-colors duration-130',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-slate-700 hover:bg-white/60',
                    )
                  }
                >
                  <div className="w-8 h-8 rounded-xl bg-white/70 border border-white/90 flex items-center justify-center">
                    <Icon size={16} className="text-slate-600" />
                  </div>
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
