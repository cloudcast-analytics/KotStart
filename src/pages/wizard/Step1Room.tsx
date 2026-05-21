import { Home, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Room } from '../../types'

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

interface Step1RoomProps {
  rooms: Room[]
  selectedRoomId: string | null
  onSelect: (id: string) => void
}

export default function Step1Room({ rooms, selectedRoomId, onSelect }: Step1RoomProps) {
  const selectedRoom = rooms.find(room => room.id === selectedRoomId) ?? null

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="mb-1 text-sm font-semibold text-slate-600">Kies een kamer</p>

      {rooms.map(room => {
        const isSelected = room.id === selectedRoomId
        const Icon = room.roomType === 'double' ? Users : Home

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            className={cn(
              'w-full rounded-2xl border-2 bg-white/55 px-4 py-3 text-left backdrop-blur-xl transition-all duration-150',
              isSelected
                ? 'border-accent shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
                : 'border-white/75 hover:border-white/90 hover:bg-white/70',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isSelected ? 'bg-accent/10' : 'bg-slate-100',
                  )}
                >
                  <Icon size={16} className={isSelected ? 'text-accent' : 'text-slate-500'} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">Kamer {room.roomNumber}</p>
                  <p className="text-xs text-slate-500">{ROOM_TYPE_LABEL[room.roomType]}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">€ {room.monthlyRent}</p>
                <p className="text-xs text-slate-400">/maand</p>
              </div>
            </div>

            {room.roomType === 'double' && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-200/60 bg-blue-50/80 px-2 py-0.5 text-[10px] font-bold text-renew-blue">
                <Users size={10} />
                2 personen, twee studentformulieren volgen
              </span>
            )}
          </button>
        )
      })}

      {selectedRoom && (
        <div className="glass mt-2 rounded-2xl p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Overzicht kamer {selectedRoom.roomNumber}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Type', ROOM_TYPE_LABEL[selectedRoom.roomType]],
              ['Huurprijs', `€ ${selectedRoom.monthlyRent}/maand`],
              ['Studentenbelasting', `€ ${selectedRoom.studentTax}/maand`],
              ['Vaste kosten', `€ ${selectedRoom.fixedCosts}/maand`],
              ['Waarborg', `€ ${selectedRoom.deposit}`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                <p className="text-sm font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
