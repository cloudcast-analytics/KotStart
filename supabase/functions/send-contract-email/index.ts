import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function corsHeaders(req: Request) {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
  const requestOrigin = req.headers.get('Origin') ?? ''
  const origin = allowedOrigin === '*' || allowedOrigin === requestOrigin ? allowedOrigin : ''

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method niet toegestaan' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase env niet geconfigureerd')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonResponse(req, { error: 'Niet geauthenticeerd' }, 401)
    }

    const { to, name, html } = await req.json() as { to?: string; name?: string; html?: string }
    if (!to || !name || !html || !isValidEmail(to) || name.length > 120 || html.length > 500_000) {
      return jsonResponse(req, { error: 'Ongeldige payload' }, 400)
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error('RESEND_API_KEY niet geconfigureerd')

    const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `KotStart <${fromAddress}>`,
        to,
        subject: `Huurovereenkomst voor ${name}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend fout: ${body}`)
    }

    return jsonResponse(req, { ok: true })
  } catch (err) {
    return jsonResponse(req, { error: err instanceof Error ? err.message : 'Onbekende fout' }, 500)
  }
})
