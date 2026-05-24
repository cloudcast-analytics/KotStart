# KotStart — Student Onboarding PWA

Digitale tool voor Belgische studentenverhuurders: contracten opstellen, plaatsbeschrijvingen opmaken en contracten ondertekenen en versturen — conform het Vlaams Woninghuurdecreet.

## Wat doet de app?

1. **Contractwizard** — vul kamer, student en eventuele tweede partij in en sla op als concept.
2. **Voortgangschecklist** — na het aanmaken zie je op de contractpagina vier stappen: aanmaken → startplaatsbeschrijving → handtekening verhuurder → versturen naar student. Elke stap is pas beschikbaar als de vorige klaar is (wettelijk verplichte volgorde).
3. **Plaatsbeschrijving** — start- en eindplaatsbeschrijving per kamer, met foto's per ruimte en item.
4. **PDF** — druk contracten en plaatsbeschrijvingen af vanuit de app.
5. **Pandenbeheer** — overzicht van panden, kamers en huurprijzen.

## Vereisten

- Node.js 20+
- npm 10+

## Installatie

```bash
npm install
```

## Ontwikkeling

```bash
npm run dev
```

Opent op `http://localhost:5173`. Zonder Supabase-variabelen draait de app op mock-data (lees-only, geen opslag).

## Tests

```bash
npm run test:run   # eenmalig (CI)
npm test           # watch mode
```

22 testbestanden, 104 tests — alles groen.

## Bouwen voor productie

```bash
npm run build
```

Vereist Node 20. Als je lokaal Node 18 hebt: `nvm use 20 && npm run build`.

## Omgevingsvariabelen

Kopieer `.env.example` naar `.env.local`:

```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

Zonder deze variabelen werkt de app op lokale mock-data. `VITE_DEMO_MODE` is verouderd en niet meer nodig.

## Deployment

De app draait op Railway: `https://kotstart.up.railway.app`

Redeploy na een push naar `master` gaat automatisch als Railway aan de GitHub-repo is gekoppeld.

## Database

Supabase (project `tsieqsxzjrfnevcrbswg`). Migraties staan in `supabase/migrations/`. Toepassen:

```bash
npx supabase link --project-ref tsieqsxzjrfnevcrbswg
npx supabase db push
```

## E-mail

Contracten worden verstuurd via Resend vanuit de Supabase Edge Function `send-contract-email`. Afzender: `info@cloudcastanalytics.com`. DNS-records (DKIM, SPF, MX) zijn geconfigureerd bij one.com.

## Status (mei 2026)

- Contractwizard: aanwezig + wettelijk correcte flow afgedwongen
- Plaatsbeschrijving (start + einde): aanwezig
- Handtekening verhuurder: aanwezig (canvas, opgeslagen als data URL in sessie)
- E-mail versturen na handtekening: aanwezig
- Pandenbeheer: gedeeltelijk (zichtbaar, beheer van kamers)
- Studentendashboard: aanwezig
- Authenticatie: e-mail/wachtwoord via Supabase Auth
