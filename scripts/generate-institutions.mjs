// Hergenereert src/lib/institutions.ts uit het Hoger Onderwijsregister.
// Draaien: npm run institutions:update
// Bevestig SOURCE_URL via de Network-tab op
// https://www.hogeronderwijsregister.be/instellingen (zoek de JSON-fetch).
import { writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://www.hogeronderwijsregister.be/instellingen'
const OUTPUT = new URL('../src/lib/institutions.ts', import.meta.url)

// Haal de namen uit de JSON-respons. De HOR-respons is een lijst van objecten;
// we proberen de gangbare naam-velden in volgorde van voorkeur.
function extractNames(json) {
  const rows = Array.isArray(json) ? json : json.data ?? json.instellingen ?? json.results ?? []
  return rows
    .map(row => row.naam ?? row.name ?? row.instellingsnaam ?? row.label ?? '')
    .map(name => String(name).trim())
    .filter(Boolean)
}

async function main() {
  const response = await fetch(SOURCE_URL, { headers: { accept: 'application/json' } })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('json')) {
    console.error(
      `Bron gaf geen JSON terug (status ${response.status}, type "${contentType}").\n` +
        'Bevestig de JSON-endpoint-URL via de Network-tab en zet die in SOURCE_URL.',
    )
    process.exit(1)
  }

  const json = await response.json()
  const names = [...new Set(extractNames(json))].sort((a, b) => a.localeCompare(b, 'nl'))
  if (names.length === 0) {
    console.error('Geen instellingsnamen gevonden — controleer extractNames() tegen de JSON-vorm.')
    process.exit(1)
  }

  const body =
    '// Erkende Vlaamse hogeronderwijsinstellingen.\n' +
    '// AUTOGEGENEREERD via `npm run institutions:update` — niet handmatig bewerken.\n' +
    '// Bron: https://www.hogeronderwijsregister.be/instellingen\n' +
    'export const VLAAMSE_INSTELLINGEN: string[] = [\n' +
    names.map(name => `  ${JSON.stringify(name)},`).join('\n') +
    '\n]\n'

  await writeFile(OUTPUT, body, 'utf8')
  console.log(`institutions.ts bijgewerkt met ${names.length} instellingen.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
