# KotStart — Student Onboarding PWA

Digitale onboarding voor verhuurders: contracten opstellen, ondertekenen en plaatsbeschrijvingen opmaken.

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

Opent op `http://localhost:5173`.

## Tests

```bash
npm run test:run   # eenmalig
npm test           # watch mode
```

## Bouwen voor productie

```bash
npm run build
npm run preview
```

## Omgevingsvariabelen

Kopieer `.env.example` naar `.env.local`:

```
VITE_DEMO_MODE=true
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

Gebruik `VITE_DEMO_MODE=true` alleen voor lokale demo/mock data. Zet deze waarde uit of weg in productie en configureer dan Supabase.

## Databasemigratie

```bash
supabase db push
# of manueel via Supabase Studio: supabase/migrations/*.sql
```

De hardening-migratie zet RLS aan en maakt storage buckets privé. Koppel bestaande seed-data eerst aan een `owner_id` voor je die migratie op een bestaande productie-database toepast.

## Fasen

- **Foundation + Dashboard:** aanwezig
- **Contract Wizard:** aanwezig voor nieuw contract en verlenging
- **Plaatsbeschrijving:** aanwezig als inspectieflow
- **Pandenbeheer:** gedeeltelijk aanwezig, momenteel nog disabled in de UI
