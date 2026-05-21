import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start px-4 py-4">
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const isDone = stepNumber < currentStep
        const isActive = stepNumber === currentStep

        return (
          <div key={label} className="relative flex flex-1 flex-col items-center">
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-1/2 top-3.5 h-0.5 w-full transition-colors duration-300',
                  isDone ? 'bg-accent' : 'bg-slate-200/80',
                )}
              />
            )}

            <div
              data-testid={`step-${stepNumber}`}
              data-active={isActive ? 'true' : 'false'}
              data-done={isDone ? 'true' : 'false'}
              className={cn(
                'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                isDone && 'border-accent bg-accent text-white',
                isActive &&
                  'border-accent-dark bg-gradient-to-br from-accent to-accent-dark text-white shadow-[0_0_0_3px_rgba(99,102,241,0.2)]',
                !isDone && !isActive && 'border-slate-200 bg-slate-100 text-slate-400',
              )}
            >
              {isDone ? <Check size={14} strokeWidth={3} aria-label="Voltooid" /> : stepNumber}
            </div>

            <span
              className={cn(
                'mt-1.5 text-center text-[9.5px] font-semibold leading-tight',
                isActive ? 'text-accent' : isDone ? 'text-accent/70' : 'text-slate-400',
              )}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
