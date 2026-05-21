# Student Onboarding PWA — Designspec

**Datum:** 2026-05-21
**Status:** Goedgekeurd — klaar voor implementatie
**Opdrachtgever:** Geert (kotbaas)
**Taal:** Nederlands (nl-BE)

---

## 1. Context & doel

Vervanging van een Microsoft Power Apps prototype dat niet publiceerbaar was naar de App Store. De app beheert het volledige student-onboarding proces voor een kotbaas met meerdere panden: contract opstellen, ondertekenen en plaatsbeschrijving opmaken.

**Primaire gebruiker:** De verhuurder (kotbaas) — beheert de app solo, kent zijn studenten niet altijd van gezicht.

---

## 2. Tech stack

| Onderdeel | Keuze |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 (utility-only, geen custom CSS files) |
| Animaties | Framer Motion |
| Backend / Auth | Supabase (database, auth, file storage) |
| PWA | vite-plugin-pwa (manifest + service worker) |
| Iconen | Lucide React (SVG, geen emoji's) |
| Font | Bricolage Grotesque (Google Fonts) |
| Fase 1 | Mock data — geen Supabase wiring |

---

## 3. Design systeem

### 3.1 Esthetiek: Liquid Glass

Geïnspireerd op Apple's iOS 26 design language. Kenmerken:
- **Achtergrond:** Kleurrijke gradient mesh (blauw → paars → roze → groen) met ambient radial orbs
- **Glaskaarten:** `backdrop-filter: blur(24px) saturate(180%)` + `rgba(255,255,255,0.52)` achtergrond
- **Randen:** `rgba(255,255,255,0.78)` — subtiele highlight, geen harde lijnen
- **Schaduwen:** Zacht, gelaagd (`0 4px 28px rgba(0,0,0,0.07)`)
- **Knoppen (primair):** Indigo gradient `#6366f1 → #4f46e5` met speculaire highlight

### 3.2 Kleurpalet

| Token | Waarde | Gebruik |
|---|---|---|
| `accent` | `#6366f1` / `#4f46e5` | Primaire acties, actieve staat sidebar |
| `start-green` | `#16a34a` / `rgba(220,252,231,0.82)` | Startplaatsbeschrijving icoon |
| `renew-blue` | `#3b82f6` / `rgba(219,234,254,0.82)` | Contract verlengen icoon |
| `end-purple` | `#9333ea` / `rgba(243,232,255,0.82)` | Eindplaatsbeschrijving icoon |
| `text-primary` | `#0f172a` | Namen, koppen |
| `text-secondary` | `#64748b` | Kamernummers, subtekst |
| `text-muted` | `#94a3b8` | Kolomheaders, placeholder |

### 3.3 Typografie

- **Font:** Bricolage Grotesque (laden via Google Fonts, `font-display: swap`)
- **Fallback:** `system-ui, sans-serif`
- **Schaal:** Tailwind default scale (xs=12px, sm=14px, base=16px)

### 3.4 Icoonset

Lucide React. Gebruikte iconen:
- `ClipboardList` — startplaatsbeschrijving (badge S, groen)
- `CalendarPlus` — contract verlengen (blauw)
- `ClipboardCheck` — eindplaatsbeschrijving (badge E, paars)
- `Home` — Overzicht (sidebar)
- `Building2` — Panden (sidebar)
- `Settings` — Instellingen (sidebar)
- `ChevronDown` — dropdown chips
- `ChevronLeft` / `ChevronRight` — sidebar toggle
- `Menu` — hamburger (mobiel)
- `Camera` — foto vastleggen (wizard)
- `Plus` — nieuwe items toevoegen
- `Check` — bevestiging / ondertekend

---

## 4. Responsief layout systeem

| Breakpoint | Gedrag |
|---|---|
| `< 768px` (telefoon) | Linker drawer via hamburger, geen kolomheader "Kamer", kamernummer klein onder naam |
| `768px – 1024px` (tablet/iPad) | Permanente inklapbare sidebar (200px uitgebreid / 56px ingeklapt), kolomheaders uitgelijnd |
| `> 1024px` (desktop) | Zelfde als tablet maar breder, meer witruimte |

**Sidebar gedrag (tablet/desktop):**
- Staat standaard uitgebreid
- Toggle knop (ChevronLeft/Right) in de sidebar header
- Bij ingeklapt: enkel iconen zichtbaar, labels verborgen via opacity transitie
- Breedte-overgang: CSS `transition: width 0.25s ease`

**Mobiel:**
- Hamburger icoon (rechts in topbar) opent linker drawer
- Drawer: 75% schermbreedte, rest verduisterd als backdrop
- Framer Motion slide-in van links

---

## 5. Schermontwerpen

### 5.1 Dashboard (`/`)

**Doel:** Overzicht van alle studenten voor een geselecteerd schooljaar en pand.

**Layout (drie zones):**

**Zone 1 — Topbar**
- Links: twee filter-chips naast elkaar
  - Schooljaar (bv. "2025–2026")
  - Pand (bv. "Residentie De Linde")
  - Styled als frosted glass chips met ChevronDown icoon
- Rechts: hamburger knop (mobiel) OF geen knop (tablet/desktop, sidebar is al aanwezig)

**Zone 2 — Actiebalk**
- Links: kolomheaders "Student" ↑ en "Kamer" (klikbaar, toggle sortering)
  - Actieve sortering toont pijl (↑ / ↓) in accentkleur
  - Op mobiel: enkel "Student" header (geen Kamer kolom)
- Rechts: "+ Nieuw Contract" knop (accent gradient, afgerond)

**Zone 3 — Studentenlijst**
- Rijen gesorteerd op kamernummer (standaard)
- Elke rij:
  - Links: voornaam + achternaam (bold), kamernummer eronder (klein, grijs) — op tablet/desktop in aparte kolom
  - Op tablet/desktop: kamernummer enkel als cijfer (bv. "01"), niet "Kamer 01"
  - Rechts: drie actieknoppen (altijd zichtbaar):
    1. `ClipboardList` — Startplaatsbeschrijving (groen, badge "S")
    2. `CalendarPlus` — Contract verlengen (blauw)
    3. `ClipboardCheck` — Eindplaatsbeschrijving (paars, badge "E")
  - Afwisselende achtergrond op even rijen

**Lege staat:**
- Gecentreerde illustratie (eenvoudige SVG), kop "Nog geen studenten", subtekst "Klik op '+ Nieuw Contract' om de eerste student toe te voegen."

**Linker drawer (mobiel):**
- App logo + naam bovenaan
- Items: Overzicht, Panden, Instellingen (elk met icoon)
- Framer Motion: slide-in van links, backdrop tikt om te sluiten

---

### 5.2 Nieuw Contract Wizard (`/contracts/new`)

Stap-indicator bovenaan toont voortgang (bv. "Stap 2 van 4").

**Stap 1 — Kamer kiezen**
- Lijst van beschikbare kamers voor geselecteerd pand
- Geselecteerde kamer toont een samenvatting-card:
  - Kamernummer, type (studio / enkel / dubbel), huurprijs/maand, studentenbelasting, vaste kosten, waarborg
- Bij kamertype "dubbel": duidelijke indicator dat er twee studentenformulieren volgen

**Stap 2 — Studentgegevens**
- Enkelvoudige kamer: één formulier
- Dubbele kamer: twee afzonderlijke formulieren, elk met eigen foto
- Per student: voornaam, achternaam, e-mail, telefoon, geboortedatum, foto (Camera icoon → preview na capture)
- **Automatische detectie:** als geboortedatum < 18 jaar → bewaarder-sectie verschijnt automatisch in stap 3

**Stap 3 — Tweede partij**
- Toggle-schakelaar: "Tweede bewoner" — **enkel zichtbaar bij kamertype enkel of studio**. Bij dubbele kamer zijn twee studenten al standaard aanwezig via stap 2 en verschijnt deze toggle niet.
- Toggle-schakelaar: "Tweede verhuurder" → naam + e-mail
- **Automatisch (geen toggle):** als student < 18 jaar → voogd-sectie (naam, e-mail, telefoon) verplicht zichtbaar
- Enkel actieve secties zijn uitgevouwen

**Stap 4 — Overzicht & versturen**
- Samenvatting van alles: kamer, student(en), tweede partij
- CTA knop: "Contract versturen" → verstuurt draft per e-mail naar betrokken partijen
- Loading state op knop bij versturen

**Navigatie:**
- "Vorige" en "Volgende" knoppen onderaan
- Swipe-gestures tussen stappen (Framer Motion)
- Inline validatie: valideer bij `blur` (niet bij eerste render), foutboodschap direct onder het veld, geen errors getoond voor de gebruiker het veld heeft aangeraakt

---

### 5.3 Contract verlengen (`/contracts/:id/renew`)

- Vult automatisch alle gegevens van het bestaande contract in
- Verhuurder kan aanpassen: huurprijs, vaste kosten, studentenbelasting, schooljaar
- Overige velden (student, kamer) zijn vooraf ingevuld en alleen-lezen
- Zelfde visuele stijl als wizard, maar vereenvoudigd (2 stappen: Gegevens aanpassen → Overzicht)

---

### 5.4 Plaatsbeschrijving (`/inspections/new`)

**Flow:** één categorie per scherm, navigatie via "Volgende" knop of swipe.

**Categorieën (in volgorde):**
1. Keuken (aanrecht, gootsteen & kraan, oven/kookplaat, koelkast, microgolf, kasten, vloer)
2. Badkamer (wastafel & kraan, douche/bad, toilet, toiletbril, spiegel, afvoer, vloer)
3. Slaap-/woonkamer (vloer, muren, plafond, raam/ramen, gordijnen/rolgordijnen, deur, kledingkast)
4. Inkom / gang (vloer, muren, voordeur, brievenbus, deurbel)
5. Algemeen (verwarming, elektriciteitsmeter, watermeter, rookmelder, sleutels)

**Per onderdeel:**
- Naam van het onderdeel
- Toestandsselector — 4-optie segmented pill control (horizontaal):
  - `Goed` (groen) | `Matig` (geel) | `Slecht` (oranje) | `Onbruikbaar` (rood)
- Als "Slecht" of "Onbruikbaar" geselecteerd: foto-upload slot animeert in (Framer Motion height reveal)

**Laatste scherm:**
- Overzichtsfoto van de volledige ruimte (verplicht)
- "Plaatsbeschrijving afronden" knop

---

### 5.5 Contractdetail (`/contracts/:id`)

- Header: studentfoto, naam, kamerinformatie
- Status-tijdlijn: Concept → Verstuurd → Ondertekend (visuele stepper)
- Inspectiepaspoort: link naar bijhorende plaatsbeschrijving
- Contractgegevens samenvatting (huurprijs, kosten, schooljaar)

---

### 5.6 Pandenbeheer (`/properties`)

- Lijst van panden
- Per pand: naam, adres, aantal kamers
- Doorklikken naar pand → lijst van kamers
- Per kamer: nummer, type, huurprijs, vaste kosten, studentenbelasting, waarborg
- Bewerkbaar via modal (niet inline — vermijdt accidentele bewerkingen)

---

## 6. Databaseschema (Supabase SQL migratie)

```sql
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  room_number text not null,
  room_type text check (room_type in ('studio','single','double')) not null,
  monthly_rent numeric(10,2),
  student_tax numeric(10,2),
  fixed_costs numeric(10,2),
  deposit numeric(10,2)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  photo_url text,
  created_at timestamptz default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id),
  school_year text not null,
  student_id uuid references students(id),
  second_student_id uuid references students(id),
  second_landlord_name text,
  second_landlord_email text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  status text check (status in ('draft','sent','signed')) default 'draft',
  created_at timestamptz default now()
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id),
  type text check (type in ('start','end')) not null,
  overview_photo_url text,
  created_at timestamptz default now()
);

create table inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  category text not null,
  item_name text not null,
  condition text check (condition in ('good','moderate','bad','unusable')),
  photo_url text,
  notes text
);
```

**Aanpassingen t.o.v. origineel schema:**
- `contracts` tabel: `guardian_name`, `guardian_email`, `guardian_phone` toegevoegd voor voogd bij minderjarige studenten

---

## 7. Componentstructuur

```
/src
  /components
    /ui
      Button.tsx          — primaire / secundaire / ghost varianten
      Badge.tsx           — contract status badge
      Card.tsx            — glaskaart wrapper
      Chip.tsx            — filter dropdown chip
      StepIndicator.tsx   — voortgangsbalk wizard
      ConditionPicker.tsx — 4-optie segmented pill (Goed/Matig/Slecht/Onbruikbaar)
      PhotoCapture.tsx    — camera knop + preview
      Toggle.tsx          — aan/uit schakelaar
    /layout
      Sidebar.tsx         — inklapbare sidebar (tablet/desktop)
      Drawer.tsx          — mobiele linker drawer + backdrop
      TopBar.tsx          — topbar met filter-chips
  /pages
    DashboardPage.tsx
    ContractNewPage.tsx
    ContractRenewPage.tsx
    ContractDetailPage.tsx
    InspectionNewPage.tsx
    PropertiesPage.tsx
    PropertyDetailPage.tsx
    AccountPage.tsx
    SettingsPage.tsx
  /lib
    supabase.ts           — Supabase client init
    mockData.ts           — mock data voor alle schermen
  /hooks
    useContracts.ts       — stub
    useInspection.ts      — stub
    useProperties.ts      — stub
  /types
    index.ts              — TypeScript interfaces voor alle DB-entiteiten
```

---

## 8. PWA configuratie

- `vite-plugin-pwa` met `generateSW` strategie
- Manifest: naam "KotBeheer", kort naam "KotBeheer", accent kleur `#6366f1`
- Icons: 192x192 en 512x512 (te genereren)
- Offline: cache-first voor assets, network-first voor API

---

## 9. Beslissingen vastgelegd

| Onderwerp | Beslissing |
|---|---|
| Navigatie mobiel | Linker drawer (hamburger), geen bottom nav |
| Navigatie tablet/desktop | Inklapbare sidebar (standaard uitgebreid) |
| Kamernummer weergave | Enkel het nummer ("01"), niet "Kamer 01" |
| Verlengingsicoon | `CalendarPlus` (Lucide) — blauw |
| Emoji's | Geen — uitsluitend SVG iconen (Lucide React) |
| Taal | Nederlands (nl-BE) |
| Voogd-detectie | Automatisch op basis van geboortedatum (< 18 jaar) |
| Dubbele kamer | Twee volledige studentenformulieren in stap 2, elk met eigen foto |
| Inspectiecategorieën | 5 categorieën, zie §5.4 |
| Bouwvolgorde | Screen by screen — dashboard eerst |
| Supabase wiring | Fase 1: enkel mock data |

---

## 10. Open punten (buiten scope fase 1)

- Juridische uitwerking digitale handtekening (GDPR-compliant, rechtsgeldig)
- Uitrol naar andere kotbazen (multi-tenant)
- App Store publicatie
- E-mail integratie voor contractversturen
