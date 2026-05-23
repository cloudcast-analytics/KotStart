import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import { X } from 'lucide-react'

interface SignatureModalProps {
  onConfirm: (dataUrl: string) => void
  onClose: () => void
}

export default function SignatureModal({ onConfirm, onClose }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resize() {
      if (!canvas) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(ratio, ratio)
      padRef.current?.clear()
    }

    padRef.current = new SignaturePad(canvas, {
      penColor: '#1e3a5f',
      backgroundColor: 'rgb(255,255,255)',
    })

    padRef.current.addEventListener('endStroke', () => {
      setIsEmpty(padRef.current?.isEmpty() ?? true)
    })

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function handleClear() {
    padRef.current?.clear()
    setIsEmpty(true)
  }

  function handleConfirm() {
    if (!padRef.current || padRef.current.isEmpty()) return
    onConfirm(padRef.current.toDataURL('image/png'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Handtekening verhuurder</h2>
            <p className="text-xs text-slate-500">Teken hieronder met uw vinger of muis</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none rounded-2xl"
            style={{ cursor: 'crosshair' }}
          />
          {isEmpty && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              Teken hier uw handtekening
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Wissen
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isEmpty}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            Ondertekenen &amp; Versturen
          </button>
        </div>
      </div>
    </div>
  )
}
