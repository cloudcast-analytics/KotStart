import { type RefObject, useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import { X } from 'lucide-react'

interface SignatureModalProps {
  studentName: string
  studentSignatureLabel?: string
  onConfirm: (signatures: { landlord: string; student: string }) => void
  onClose: () => void
}

export default function SignatureModal({ studentName, studentSignatureLabel, onConfirm, onClose }: SignatureModalProps) {
  const landlordCanvasRef = useRef<HTMLCanvasElement>(null)
  const studentCanvasRef = useRef<HTMLCanvasElement>(null)
  const landlordPadRef = useRef<SignaturePad | null>(null)
  const studentPadRef = useRef<SignaturePad | null>(null)
  const [emptyState, setEmptyState] = useState({ landlord: true, student: true })

  useEffect(() => {
    function setupPad(
      canvas: HTMLCanvasElement | null,
      assignPad: (pad: SignaturePad) => void,
      setEmpty: (isEmpty: boolean) => void,
    ) {
      if (!canvas) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(ratio, ratio)

      const pad = new SignaturePad(canvas, {
        penColor: '#1e3a5f',
        backgroundColor: 'rgb(255,255,255)',
      })
      pad.addEventListener('endStroke', () => setEmpty(pad.isEmpty()))
      assignPad(pad)
    }

    setupPad(landlordCanvasRef.current, pad => { landlordPadRef.current = pad }, isEmpty => {
      setEmptyState(previous => ({ ...previous, landlord: isEmpty }))
    })
    setupPad(studentCanvasRef.current, pad => { studentPadRef.current = pad }, isEmpty => {
      setEmptyState(previous => ({ ...previous, student: isEmpty }))
    })

    return () => {
      landlordPadRef.current?.off()
      studentPadRef.current?.off()
    }
  }, [])

  function handleClear(which: 'landlord' | 'student') {
    const pad = which === 'landlord' ? landlordPadRef.current : studentPadRef.current
    pad?.clear()
    setEmptyState(previous => ({ ...previous, [which]: true }))
  }

  function handleConfirm() {
    if (
      !landlordPadRef.current ||
      !studentPadRef.current ||
      landlordPadRef.current.isEmpty() ||
      studentPadRef.current.isEmpty()
    ) {
      return
    }

    onConfirm({
      landlord: landlordPadRef.current.toDataURL('image/png'),
      student: studentPadRef.current.toDataURL('image/png'),
    })
  }

  const canConfirm = !emptyState.landlord && !emptyState.student

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Handtekeningen opslaan</h2>
            <p className="text-xs text-slate-500">Teken hieronder met vinger of muis</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <SignatureBox
          label="Handtekening verhuurder"
          canvasRef={landlordCanvasRef}
          isEmpty={emptyState.landlord}
          onClear={() => handleClear('landlord')}
        />
        <SignatureBox
          label={studentSignatureLabel ?? `Handtekening student (${studentName})`}
          canvasRef={studentCanvasRef}
          isEmpty={emptyState.student}
          onClear={() => handleClear('student')}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            Handtekeningen opslaan
          </button>
        </div>
      </div>
    </div>
  )
}

function SignatureBox({
  label,
  canvasRef,
  isEmpty,
  onClear,
}: {
  label: string
  canvasRef: RefObject<HTMLCanvasElement>
  isEmpty: boolean
  onClear: () => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Wissen
        </button>
      </div>
      <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none rounded-2xl"
          style={{ cursor: 'crosshair' }}
        />
        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">
            Teken hier
          </p>
        )}
      </div>
    </div>
  )
}
