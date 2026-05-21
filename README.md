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
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

## Databasemigratie

```bash
supabase db push
# of manueel via Supabase Studio: supabase/migrations/20260521000000_initial.sql
```

## Fasen

- **Phase 1 (huidig):** Foundation + Dashboard — volledig met mock data
- **Phase 2:** Contract Wizard (nieuw contract + verlenging)
- **Phase 3:** Plaatsbeschrijving (inspectieflow)
- **Phase 4:** Pandenbeheer
