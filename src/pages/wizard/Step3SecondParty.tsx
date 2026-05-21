import { AlertCircle, Building2, Shield, User } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Room } from '../../types'
import type { GuardianData, SecondPartyData } from './types'

type PartyField = 'name' | 'email' | 'phone'

interface Step3SecondPartyProps {
  roomType: Room['roomType']
  hasMinor: boolean
  secondLandlord: SecondPartyData | null
  secondTenant: SecondPartyData | null
  guardian: GuardianData | null
  onSecondLandlordChange: (data: SecondPartyData | null) => void
  onSecondTenantChange: (data: SecondPartyData | null) => void
  onGuardianChange: (data: GuardianData | null) => void
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3"
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-slate-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

function PartyFields({
  prefix,
  value,
  onChange,
  fields,
}: {
  prefix: string
  value: { name?: string; email?: string; phone?: string }
  onChange: (field: PartyField, value: string) => void
  fields: Array<{ field: PartyField; label: string; type: string; required?: boolean }>
}) {
  return (
    <div className="flex flex-col gap-2 pt-3">
      {fields.map(({ field, label, type, required = true }) => (
        <div key={field}>
          <label
            htmlFor={`${prefix}-${field}`}
            className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500"
          >
            {label}
            {required && ' *'}
          </label>
          <input
            id={`${prefix}-${field}`}
            aria-label={label}
            type={type}
            value={value[field] ?? ''}
            onChange={event => onChange(field, event.target.value)}
            className="w-full rounded-xl border border-white/90 bg-white/60 px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder={label}
          />
        </div>
      ))}
    </div>
  )
}

export default function Step3SecondParty({
  roomType,
  hasMinor,
  secondLandlord,
  secondTenant,
  guardian,
  onSecondLandlordChange,
  onSecondTenantChange,
  onGuardianChange,
}: Step3SecondPartyProps) {
  const showLandlord = secondLandlord !== null
  const showTenant = secondTenant !== null
  const nothingExtra = !showLandlord && (roomType === 'double' || !showTenant) && !hasMinor

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <Building2 size={15} className="text-teal-600" />
          </div>
          <Toggle
            label="Tweede verhuurder"
            checked={showLandlord}
            onChange={value => onSecondLandlordChange(value ? { name: '', email: '' } : null)}
          />
        </div>
        {showLandlord && (
          <PartyFields
            prefix="landlord"
            value={secondLandlord}
            onChange={(field, value) =>
              onSecondLandlordChange({ ...(secondLandlord ?? { name: '', email: '' }), [field]: value })
            }
            fields={[
              { field: 'name', label: 'Naam verhuurder', type: 'text' },
              { field: 'email', label: 'E-mail verhuurder', type: 'email' },
            ]}
          />
        )}
      </div>

      {roomType !== 'double' && (
        <div className="rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <User size={15} className="text-renew-blue" />
            </div>
            <Toggle
              label="Tweede bewoner"
              checked={showTenant}
              onChange={value => onSecondTenantChange(value ? { name: '', email: '' } : null)}
            />
          </div>
          {showTenant && (
            <PartyFields
              prefix="tenant"
              value={secondTenant}
              onChange={(field, value) =>
                onSecondTenantChange({ ...(secondTenant ?? { name: '', email: '' }), [field]: value })
              }
              fields={[
                { field: 'name', label: 'Naam bewoner', type: 'text' },
                { field: 'email', label: 'E-mail bewoner', type: 'email' },
              ]}
            />
          )}
        </div>
      )}

      {hasMinor && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Shield size={15} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Voogd</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Vereist, student is minderjarig
              </span>
            </div>
          </div>
          <PartyFields
            prefix="guardian"
            value={guardian ?? { name: '', email: '', phone: '' }}
            onChange={(field, value) =>
              onGuardianChange({ ...(guardian ?? { name: '', email: '', phone: '' }), [field]: value })
            }
            fields={[
              { field: 'name', label: 'Naam voogd', type: 'text' },
              { field: 'email', label: 'E-mail voogd', type: 'email' },
              { field: 'phone', label: 'Telefoon voogd', type: 'tel', required: false },
            ]}
          />
        </div>
      )}

      {nothingExtra && (
        <div className="py-8 text-center text-slate-400">
          <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold">Geen extra partijen vereist</p>
          <p className="mt-1 text-xs">Klik op Volgende om door te gaan</p>
        </div>
      )}
    </div>
  )
}
