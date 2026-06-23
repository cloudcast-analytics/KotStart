import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STATBEL_CSV_URL =
  'https://bestat.statbel.fgov.be/bestat/api/views/d9a303dc-d393-4686-8fe2-234e03a857b8/result/CSV'

const MONTH_MAP: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6,
  juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12,
}

function parseMonth(raw: string): { year: number; month: number } | null {
  const cleaned = raw.replace(/"/g, '').trim().toLowerCase()
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (cleaned.startsWith(name)) {
      const yearMatch = cleaned.match(/(\d{4})/)
      if (yearMatch) return { year: Number(yearMatch[1]), month: num }
    }
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const response = await fetch(STATBEL_CSV_URL)
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Statbel CSV fetch failed', status: response.status }), { status: 502 })
    }

    const text = await response.text()
    const lines = text.split('\n').slice(1) // skip header

    const rows: Array<{ year: number; month: number; value: number }> = []

    for (const line of lines) {
      if (!line.trim()) continue
      const cols = line.split(',').map(c => c.replace(/"/g, '').trim())
      // Format: Jaar, Maand, Niveau 1, Basisjaar, Consumptieprijsindex
      const basisjaar = cols[3] ?? ''
      const niveau = cols[2] ?? ''

      if (!basisjaar.includes('2013') || !niveau.toLowerCase().includes('gezondheidsindex')) continue

      const parsed = parseMonth(cols[1] ?? '')
      const value = Number(cols[4])
      if (parsed && Number.isFinite(value)) {
        rows.push({ year: parsed.year, month: parsed.month, value })
      }
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid rows parsed from CSV' }), { status: 422 })
    }

    const { error } = await supabase
      .from('health_index')
      .upsert(rows, { onConflict: 'year,month' })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ synced: rows.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
