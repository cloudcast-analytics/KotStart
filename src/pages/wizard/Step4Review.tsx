import { Home, User } from 'lucide-react'
import type { Room } from '../../types'
import { isMinor, type StudentFormData } from './types'

interface Step4ReviewProps {
  room: Room
  students: StudentFormData[]
}

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
          <Icon size={14} className="text-accent" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100/60 py-1 last:border-0">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="break-words text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

export default function Step4Review({ room, students }: Step4ReviewProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <SectionCard icon={Home} title="Kamer">
        <InfoRow label="Kamer" value={`Kamer ${room.roomNumber}`} />
        <InfoRow label="Type" value={ROOM_TYPE_LABEL[room.roomType]} />
        <InfoRow label="Huurprijs" value={`€ ${room.monthlyRent}/maand`} />
        <InfoRow label="Vaste kosten" value={`€ ${room.fixedCosts}/maand`} />
        <InfoRow label="Studentenbelasting" value={`€ ${room.studentTax}/maand`} />
        <InfoRow label="Waarborg" value={`€ ${room.deposit}`} />
      </SectionCard>

      {students.map((student, index) => {
        const minor = isMinor(student.dateOfBirth)
        return (
          <SectionCard key={index} icon={User} title={students.length > 1 ? `Student ${index + 1}` : 'Student'}>
            {student.photoUrl && (
              <img
                src={student.photoUrl}
                alt="Foto student"
                className="mb-3 h-14 w-14 rounded-xl border-2 border-accent/20 object-cover"
              />
            )}
            <InfoRow label="Naam" value={`${student.firstName} ${student.lastName}`} />
            <InfoRow label="E-mail" value={student.email} />
            {student.phone && <InfoRow label="Telefoon" value={student.phone} />}
            <InfoRow label="Geboortedatum" value={student.dateOfBirth} />
            {minor && (
              <div className="mt-2 flex flex-col gap-1 border-t border-slate-100/60 pt-2">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Voogd</p>
                <InfoRow label="Naam" value={student.guardianName ?? ''} />
                <InfoRow label="E-mail" value={student.guardianEmail ?? ''} />
                {student.guardianPhone && <InfoRow label="Telefoon" value={student.guardianPhone} />}
              </div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}
