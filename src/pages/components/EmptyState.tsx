import { FileText } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/55 backdrop-blur-xl border border-white/75 flex items-center justify-center mb-5 shadow-[0_4px_20px_rgba(0,0,0,0.07)]">
        <FileText size={36} className="text-slate-300" />
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1.5">Nog geen studenten</h3>
      <p className="text-sm text-slate-400 max-w-[240px] leading-relaxed">
        Klik op <span className="font-semibold text-accent">+ Nieuw Contract</span> om de eerste student aan dit pand toe te voegen.
      </p>
    </div>
  )
}
