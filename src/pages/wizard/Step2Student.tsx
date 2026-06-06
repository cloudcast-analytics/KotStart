import { type ChangeEvent, useState } from 'react'
import { AlertCircle, Camera } from 'lucide-react'
import { cn } from '../../lib/cn'
import InstitutionSelect from '../../components/InstitutionSelect'
import { isValidBelgianPostalCode } from '../../lib/residence'
import {
  formatDateOfBirthForInput,
  isMinor,
  isValidDateOfBirth,
  isValidEmail,
  toIsoDateOfBirth,
  type StudentFormData,
} from './types'

interface Step2StudentProps {
  students: StudentFormData[]
  onChange: (index: number, field: keyof StudentFormData, value: string | null) => void
}

type TouchedState = Partial<Record<keyof StudentFormData, boolean>>

interface TextField {
  field: keyof StudentFormData
  label: string
  type: string
  required: boolean
}

const PERSONAL_FIELDS: TextField[] = [
  { field: 'firstName', label: 'Voornaam', type: 'text', required: true },
  { field: 'lastName', label: 'Achternaam', type: 'text', required: true },
  { field: 'email', label: 'E-mail', type: 'email', required: true },
  { field: 'phone', label: 'Telefoon', type: 'tel', required: false },
  { field: 'dateOfBirth', label: 'Geboortedatum', type: 'text', required: true },
]

const STUDY_FIELDS: TextField[] = [
  { field: 'faculty', label: 'Faculteit / opleiding', type: 'text', required: false },
  { field: 'studentNumber', label: 'Studentennummer', type: 'text', required: true },
]

const RESIDENCE_FIELDS: TextField[] = [
  { field: 'residenceStreet', label: 'Straat', type: 'text', required: true },
  { field: 'residenceNumber', label: 'Huisnummer', type: 'text', required: true },
  { field: 'residenceBox', label: 'Bus', type: 'text', required: false },
  { field: 'residencePostalCode', label: 'Postcode', type: 'text', required: true },
  { field: 'residenceCity', label: 'Gemeente', type: 'text', required: true },
]

function fieldError(student: StudentFormData, field: keyof StudentFormData, required: boolean): string | null {
  if (field === 'email' && student.email && !isValidEmail(student.email)) return 'Vul een geldig e-mailadres in'
  if (field === 'dateOfBirth' && student.dateOfBirth && !isValidDateOfBirth(student.dateOfBirth)) {
    return 'Gebruik formaat dd-mm-jjjj'
  }
  if (field === 'residencePostalCode' && student.residencePostalCode && !isValidBelgianPostalCode(student.residencePostalCode)) {
    return 'Gebruik 4 cijfers (bijv. 9000)'
  }
  if (required && !student[field]) return 'Dit veld is verplicht'
  return null
}

function formatDateTyping(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

function normalizeDateChange(value: string): string {
  const formatted = formatDateTyping(value)
  return isValidDateOfBirth(formatted) ? toIsoDateOfBirth(formatted) : formatted
}

function TextInput({
  student,
  index,
  config,
  touched,
  onTouch,
  onChange,
}: {
  student: StudentFormData
  index: number
  config: TextField
  touched: boolean
  onTouch: () => void
  onChange: (field: keyof StudentFormData, value: string | null) => void
}) {
  const { field, label, type, required } = config
  const error = touched ? fieldError(student, field, required) : null
  const isDate = field === 'dateOfBirth'

  return (
    <div>
      <label
        htmlFor={`student-${index}-${field}`}
        className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500"
      >
        {label}
        {required && ' *'}
      </label>
      <input
        id={`student-${index}-${field}`}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        type={type}
        inputMode={isDate ? 'numeric' : field === 'residencePostalCode' ? 'numeric' : undefined}
        autoComplete={isDate ? 'bday' : undefined}
        maxLength={isDate ? 10 : undefined}
        value={isDate ? formatDateOfBirthForInput(student.dateOfBirth) : (student[field] as string) ?? ''}
        onBlur={onTouch}
        onChange={event =>
          onChange(field, isDate ? normalizeDateChange(event.target.value) : event.target.value)
        }
        className={cn(
          'w-full rounded-xl border bg-white/60 px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2',
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-white/90 focus:border-accent/50 focus:ring-accent/20',
        )}
        placeholder={isDate ? 'dd-mm-jjjj' : label}
      />
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function StudentForm({
  student,
  index,
  showTitle,
  touched,
  onTouch,
  onChange,
}: {
  student: StudentFormData
  index: number
  showTitle: boolean
  touched: TouchedState
  onTouch: (field: keyof StudentFormData) => void
  onChange: (field: keyof StudentFormData, value: string | null) => void
}) {
  const minor = isMinor(student.dateOfBirth)

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange('photoUrl', reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-xl">
      {showTitle && (
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student {index + 1}</p>
      )}

      <div className="flex items-center gap-4">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt="Foto student"
            className="h-16 w-16 rounded-2xl border-2 border-accent/30 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-100">
            <Camera size={20} className="text-slate-400" />
          </div>
        )}
        <div>
          <label
            aria-label="Foto toevoegen"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-xs font-semibold text-accent"
          >
            <Camera size={13} />
            {student.photoUrl ? 'Foto wijzigen' : 'Foto toevoegen'}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
          </label>
          <p className="mt-1 text-[10px] text-slate-400">Selfie of portretfoto</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {PERSONAL_FIELDS.map(config => (
          <TextInput
            key={config.field}
            student={student}
            index={index}
            config={config}
            touched={Boolean(touched[config.field])}
            onTouch={() => onTouch(config.field)}
            onChange={onChange}
          />
        ))}
      </div>

      {minor && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-700">
          <AlertCircle size={13} />
          Minderjarig, voogd wordt vereist in de volgende stap
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-white/60 pt-3">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Studie</p>
        <div>
          <label
            htmlFor={`student-${index}-institution`}
            className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500"
          >
            Onderwijsinstelling *
          </label>
          <InstitutionSelect
            id={`student-${index}-institution`}
            ariaLabel="Onderwijsinstelling"
            value={student.institution}
            onChange={value => onChange('institution', value)}
          />
        </div>
        {STUDY_FIELDS.map(config => (
          <TextInput
            key={config.field}
            student={student}
            index={index}
            config={config}
            touched={Boolean(touched[config.field])}
            onTouch={() => onTouch(config.field)}
            onChange={onChange}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/60 pt-3">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          Hoofdverblijf (domicilie)
        </p>
        {RESIDENCE_FIELDS.map(config => (
          <TextInput
            key={config.field}
            student={student}
            index={index}
            config={config}
            touched={Boolean(touched[config.field])}
            onTouch={() => onTouch(config.field)}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}

export default function Step2Student({ students, onChange }: Step2StudentProps) {
  const [touched, setTouched] = useState<TouchedState[]>(students.map(() => ({})))
  const showTitles = students.length > 1

  return (
    <div className="flex flex-col gap-4 p-4">
      {students.map((student, index) => (
        <StudentForm
          key={index}
          student={student}
          index={index}
          showTitle={showTitles}
          touched={touched[index] ?? {}}
          onTouch={field =>
            setTouched(prev => {
              const next = [...prev]
              next[index] = { ...(next[index] ?? {}), [field]: true }
              return next
            })
          }
          onChange={(field, value) => onChange(index, field, value)}
        />
      ))}
    </div>
  )
}
