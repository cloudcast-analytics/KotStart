import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method niet toegestaan' }, 405)
  }

  try {
    const { token, studentItems, studentPhotoUrls } = await req.json() as {
      token?: string
      studentItems?: unknown
      studentPhotoUrls?: string[]
    }

    if (!token || !studentItems) {
      return jsonResponse({ error: 'Token en studentItems zijn verplicht' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: tokenRow, error: tokenError } = await supabase
      .from('inspection_tokens')
      .select('id, status, expires_at, owner_id, contract_id')
      .eq('token', token)
      .maybeSingle()

    if (tokenError || !tokenRow) {
      return jsonResponse({ error: 'Ongeldige link.' }, 404)
    }

    if (tokenRow.status !== 'pending') {
      return jsonResponse({ error: 'Deze plaatsbeschrijving is al ingevuld.' }, 410)
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return jsonResponse({ error: 'Deze link is verlopen.' }, 410)
    }

    const { error: updateError } = await supabase
      .from('inspection_tokens')
      .update({
        student_items: studentItems,
        student_photo_urls: studentPhotoUrls ?? [],
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', tokenRow.id)

    if (updateError) throw updateError

    // Send notification email to landlord
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (apiKey) {
      const { data: contract } = await supabase
        .from('contracts')
        .select('student_id, room_id')
        .eq('id', tokenRow.contract_id)
        .single()

      if (contract) {
        const [studentResult, roomResult, ownerResult] = await Promise.all([
          supabase.from('students').select('first_name, last_name').eq('id', contract.student_id).single(),
          supabase.from('rooms').select('room_number').eq('id', contract.room_id).single(),
          supabase.auth.admin.getUserById(tokenRow.owner_id),
        ])

        const studentName = studentResult.data ? `${studentResult.data.first_name} ${studentResult.data.last_name}` : 'Een student'
        const roomNumber = roomResult.data?.room_number ?? ''
        const landlordEmail = ownerResult.data?.user?.email

        if (landlordEmail) {
          const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? 'info@cloudcastanalytics.com'
          const fromName = Deno.env.get('RESEND_FROM_NAME') ?? 'KotStart'

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              from: `${fromName} <${fromAddress}>`,
              to: landlordEmail,
              subject: `Plaatsbeschrijving ingevuld — ${studentName} kamer ${roomNumber}`,
              html: `<p>Beste verhuurder,</p>
                     <p>${studentName} heeft de plaatsbeschrijving voor kamer ${roomNumber} ingevuld.</p>
                     <p>Log in op KotStart om deze te bekijken en goed te keuren.</p>
                     <p>Met vriendelijke groeten,<br>${fromName}</p>`,
            }),
          })
        }
      }
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Onbekende fout' }, 500)
  }
})
