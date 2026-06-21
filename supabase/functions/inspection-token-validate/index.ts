import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method niet toegestaan' }, 405)
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) return jsonResponse({ error: 'Token ontbreekt', code: 'invalid' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: tokenRow, error: tokenError } = await supabase
      .from('inspection_tokens')
      .select('*, contracts!inner(student_id, room_id), properties!inner(name), rooms:contracts!inner(rooms!inner(room_number))')
      .eq('token', token)
      .maybeSingle()

    if (tokenError || !tokenRow) {
      return jsonResponse({ error: 'Ongeldige link.', code: 'invalid' }, 404)
    }

    if (tokenRow.status !== 'pending') {
      return jsonResponse({ error: 'Deze plaatsbeschrijving is al ingevuld.', code: 'used' }, 410)
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return jsonResponse({ error: 'Deze link is verlopen. Neem contact op met je verhuurder.', code: 'expired' }, 410)
    }

    const { data: student } = await supabase
      .from('students')
      .select('first_name')
      .eq('id', tokenRow.contracts.student_id)
      .single()

    const { data: room } = await supabase
      .from('rooms')
      .select('room_number')
      .eq('id', tokenRow.contracts.room_id)
      .single()

    const { data: templateData } = await supabase
      .from('inspection_templates')
      .select('categories')
      .eq('owner_id', tokenRow.owner_id)
      .eq('property_id', tokenRow.property_id)
      .maybeSingle()

    const defaultCategories = [
      { id: 'kitchen', label: 'Keuken', items: [
        { name: 'Aanrecht', type: 'condition' }, { name: 'Gootsteen & kraan', type: 'condition' },
        { name: 'Oven/kookplaat', type: 'condition' }, { name: 'Koelkast', type: 'condition' },
        { name: 'Microgolf', type: 'condition' }, { name: 'Kasten', type: 'condition' },
        { name: 'Vloer', type: 'condition' },
      ]},
      { id: 'bathroom', label: 'Badkamer', items: [
        { name: 'Wastafel & kraan', type: 'condition' }, { name: 'Douche/bad', type: 'condition' },
        { name: 'Toilet', type: 'condition' }, { name: 'Toiletbril', type: 'condition' },
        { name: 'Spiegel', type: 'condition' }, { name: 'Afvoer', type: 'condition' },
        { name: 'Vloer', type: 'condition' },
      ]},
      { id: 'living', label: 'Kamer', items: [
        { name: 'Vloer', type: 'condition' }, { name: 'Muren', type: 'condition' },
        { name: 'Plafond', type: 'condition' }, { name: 'Raam/ramen', type: 'condition' },
        { name: 'Gordijnen/rolgordijnen', type: 'condition' }, { name: 'Deur', type: 'condition' },
        { name: 'Kledingkast', type: 'condition' },
      ]},
      { id: 'hall', label: 'Inkom', items: [
        { name: 'Vloer', type: 'condition' }, { name: 'Muren', type: 'condition' },
        { name: 'Voordeur', type: 'condition' }, { name: 'Brievenbus', type: 'condition' },
        { name: 'Deurbel', type: 'condition' },
      ]},
      { id: 'general', label: 'Algemeen', items: [
        { name: 'Verwarming', type: 'condition' },
        { name: 'Elektriciteitsmeter', type: 'meter', unit: 'kWh' },
        { name: 'Gasmeter', type: 'meter', unit: 'm³' },
        { name: 'Watermeter', type: 'meter', unit: 'm³' },
        { name: 'Sleutels', type: 'count' },
      ]},
    ]

    const allCategories = templateData?.categories ?? defaultCategories

    // Filter out meter/count items — those are landlord-only
    const studentCategories = (allCategories as Array<{ id: string; label: string; items: Array<{ name: string; type: string; unit?: string }> }>)
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.type === 'condition'),
      }))
      .filter(cat => cat.items.length > 0)

    return jsonResponse({
      propertyName: tokenRow.properties.name,
      roomNumber: room?.room_number ?? '',
      studentFirstName: student?.first_name ?? '',
      categories: studentCategories,
    })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Onbekende fout', code: 'error' }, 500)
  }
})
