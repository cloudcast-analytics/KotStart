import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react'
import StepIndicator from './StepIndicator'
import { cn } from '../../lib/cn'

interface WizardLayoutProps {
  steps: string[]
  currentStep: number
  onBack: () => void
  onNext: () => void
  canProceed: boolean
  isLastStep: boolean
  isSending: boolean
  children: ReactNode
}

export default function WizardLayout({
  steps,
  currentStep,
  onBack,
  onNext,
  canProceed,
  isLastStep,
  isSending,
  children,
}: WizardLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/65 bg-white/38 backdrop-blur-xl">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -90 && canProceed && !isSending) onNext()
              if (info.offset.x > 90 && !isSending) onBack()
            }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Terug"
          onClick={onBack}
          disabled={isSending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/60 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={15} />
          Terug
        </button>

        <button
          type="button"
          aria-label={isLastStep ? 'Opslaan als concept' : 'Volgende'}
          onClick={onNext}
          disabled={!canProceed || isSending}
          className={cn(
            'btn-primary flex flex-[2] items-center justify-center gap-2 py-3 text-sm transition-opacity',
            (!canProceed || isSending) && 'cursor-not-allowed opacity-50',
          )}
        >
          {isSending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Wordt opgeslagen...
            </>
          ) : isLastStep ? (
            <>
              Opslaan als concept
              <Save size={15} />
            </>
          ) : (
            <>
              Volgende
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>

      {isLastStep && !isSending && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Je kan daarna de plaatsbeschrijving doen en ondertekenen.
        </p>
      )}
    </div>
  )
}
