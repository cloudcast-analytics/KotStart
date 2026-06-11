# Contractverlenging — Design

**Datum:** 2026-06-11
**Status:** Ontwerp goedgekeurd door Vince, klaar voor implementatieplan

## Scope

`ContractRenewPage.tsx` ("Contract verlengen") heeft nu een knop "Verlenging
versturen" die niets echt doet (`window.setTimeout(() => navigate('/'), 1200)`). Dit
ontwerp maakt deze flow echt:

- Er wordt een **nieuw contract** aangemaakt voor het **volgende schooljaar**, automatisch
  berekend (geen keuzelijst meer).
- De student(en) worden **één-op-één overgenomen** van het vorige contract — geen
  nieuwe gegevens invoeren.
- De verhuurder kan in de verlengflow kiezen of de student in **dezelfde kamer** blijft of
  naar een **andere kamer binnen hetzelfde pand** verhuist.
- Huurprijs, vaste kosten en studentenbelasting krijgen een **eigen snapshot per
  contract**: het oude contract blijft voor altijd vastliggen op zijn eigen waarden, ook al
  wijzigen de prijzen nadien. Wijzigt de verhuurder de prijzen tijdens het verlengen, dan
  wordt de **kamer** (`rooms`-tabel) zelf bijgewerkt naar de nieuwe waarden (geldt dan voor
  toekomstige contracten/verlengingen).
- Het nieuwe contract verschijnt in het overzichtsdashboard van het volgende schooljaar.
- Een kamer kan niet méér studenten krijgen dan zijn capaciteit toelaat (1 voor
  studio/enkel, 2 voor dubbel) — de kamerkeuze in de verlengflow toont enkel kamers met nog
  vrije plaats voor het volgende schooljaar.

**Expliciet uit scope (latere sessies):**

- **Waarborg (`deposit`)** krijgt geen eigen contract-snapshot en blijft kamergebonden
  (`room.deposit`). Hoe de waarborg precies "verlengt" (blijft staan, wordt aangepast,
  terugbetaling) is een apart bedrijfslogica-vraagstuk voor later.
- **Cross-pand kamerkeuze** (student verhuist naar een kamer in een ander pand) — voor nu
  blijft de kamerkeuze beperkt tot kamers binnen hetzelfde pand.
- **Bezettingscontrole bij een gloednieuw contract** (`Step1Room` in de "nieuw
  contract"-wizard, `ContractNewPage.tsx`) heeft hetzelfde lek (onbeperkt studenten op
  dezelfde kamer), maar wordt in een **aparte, volgende aanpassing** behandeld. Deze spec
  voegt de capaciteitscheck alléén toe aan de verlengflow, zodat verlengingen het probleem
  niet erger maken.

Geraakte bestanden: `src/types/index.ts`, `src/lib/data.ts`, `src/lib/mockData.ts`,
`src/pages/ContractRenewPage.tsx`, `src/pages/ContractNewPage.tsx`,
`src/pages/ContractDetailPage.tsx`, `src/lib/pdfDocuments.ts`, `supabase/migrations/`,
`supabase/staging-bootstrap.sql`, en de bijhorende tests in `src/__tests__/`.

---

## 1. Datamodel: prijssnapshot per contract

### Types (`src/types/index.ts`)

`Contract` krijgt drie nieuwe optionele velden:

```ts
export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
  signedAt?: string
  sentAt?: string
  monthlyRent?: number
  fixedCosts?: number
  studentTax?: number
}
```

Optioneel zodat bestaande/oude rijen (vóór backfill, of als de migratie nog niet draait)
geldig blijven. Overal waar getoond wordt, geldt de fallback `contract.X ?? room.X`.

### Supabase migratie

Nieuw bestand `supabase/migrations/<timestamp>_contract_rent_snapshot.sql`:

```sql
alter table contracts
  add column if not exists monthly_rent numeric,
  add column if not exists fixed_costs numeric,
  add column if not exists student_tax numeric;

-- Bestaande contracten bevriezen op de huidige kamerprijzen, zodat ze vanaf nu
-- onveranderlijk zijn ook al wijzigen de kamerprijzen later.
update contracts c
set monthly_rent = r.monthly_rent,
    fixed_costs = r.fixed_costs,
    student_tax = r.student_tax
from rooms r
where c.room_id = r.id
  and c.monthly_rent is null;
```

`supabase/staging-bootstrap.sql` krijgt dezelfde drie kolommen in de `contracts`-tabel
definitie. Net als bij eerdere clusters wordt de migratie via de Supabase MCP toegepast op
**staging**.

### `mapContract` (`src/lib/data.ts`)

```ts
function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    roomId: row.room_id,
    schoolYear: row.school_year,
    studentId: row.student_id,
    secondStudentId: row.second_student_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    signedAt: row.signed_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    monthlyRent: row.monthly_rent != null ? asNumber(row.monthly_rent) : undefined,
    fixedCosts: row.fixed_costs != null ? asNumber(row.fixed_costs) : undefined,
    studentTax: row.student_tax != null ? asNumber(row.student_tax) : undefined,
  }
}
```

`ContractRow` krijgt `monthly_rent?: number | string | null`, `fixed_costs?: number |
string | null`, `student_tax?: number | string | null`.

### `createContractDraft` (gloednieuw contract) snapshot ook bij aanmaak

Een nieuw contract via de gewone wizard (`ContractNewPage.tsx`) krijgt vanaf nu meteen ook
zijn eigen snapshot, zodat elk contract — nieuw of verlengd — vanaf het begin
onveranderlijke eigen prijzen heeft.

`CreateContractDraftInput` krijgt drie extra velden:

```ts
interface CreateContractDraftInput {
  roomId: string
  schoolYear: string
  students: ContractDraftStudent[]
  monthlyRent: number
  fixedCosts: number
  studentTax: number
}
```

`ContractNewPage.tsx` geeft deze mee vanuit de al-geladen `selectedRoom`
(`selectedRoom.monthlyRent`, `.fixedCosts`, `.studentTax`) — geen extra databasecall nodig.

In `createContractDraft` wordt de contract-insert uitgebreid met `monthly_rent:
input.monthlyRent, fixed_costs: input.fixedCosts, student_tax: input.studentTax`, met een
`isMissingColumnError`-fallback die zonder deze drie velden insert (zelfde patroon als
`updateContractStatus`, regel ~919) zodat de app blijft werken als de migratie nog niet is
uitgevoerd op de live database.

---

## 2. Schooljarenlijst (`src/lib/mockData.ts`)

```ts
export const SCHOOL_YEARS = ['2024–2025', '2025–2026', '2026–2027', '2027–2028']
```

Eenvoudige uitbreiding van de bestaande statische lijst met twee toekomstige jaren. Dit is
de enige wijziging die nodig is opdat een verlengd contract voor `2026–2027` zichtbaar en
selecteerbaar is in de schooljaar-filters van `AppShell`, `DashboardPage`, `AccountPage`,
`PropertiesPage` en `SettingsPage` — geen van die bestanden vereist verdere aanpassingen.

---

## 3. Bezettingscontrole bij kamerkeuze (`src/lib/data.ts`)

```ts
const ROOM_CAPACITY: Record<Room['roomType'], number> = {
  studio: 1,
  single: 1,
  double: 2,
}

function isRoomAvailable(
  room: Room,
  schoolYear: string,
  contracts: Contract[],
  excludeContractId: string,
): boolean {
  const occupants = contracts.filter(
    contract =>
      contract.roomId === room.id &&
      contract.schoolYear === schoolYear &&
      contract.id !== excludeContractId &&
      (contract.status === 'signed' || contract.status === 'sent'),
  ).length
  return occupants < ROOM_CAPACITY[room.roomType]
}

export async function getAvailableRoomsForRenewal(
  propertyId: string,
  schoolYear: string,
  currentContractId: string,
): Promise<Room[]> {
  const [rooms, contracts] = await Promise.all([getRooms(), getContracts()])
  return rooms
    .filter(room => room.propertyId === propertyId)
    .filter(room => isRoomAvailable(room, schoolYear, contracts, currentContractId))
}
```

- Enkel `signed`/`sent` contracten tellen mee als "bezet" — een `draft` blokkeert geen
  plaats.
- `excludeContractId` (het contract dat verlengd wordt) telt nooit mee voor zijn eigen
  huidige kamer, zodat die kamer normaal als optie blijft staan.
- Werkt zowel in Supabase- als demo-modus, want `getRooms()`/`getContracts()` wisselen zelf
  al tussen mock-data en Supabase.

---

## 4. Verlengflow (`src/pages/ContractRenewPage.tsx`)

- **Schooljaar**: niet langer een `<select>`. `nextSchoolYear` wordt geëxporteerd vanuit
  `src/lib/data.ts` (de bestaande private helper, regel ~369) en hier gebruikt om
  `nextSchoolYear(contract.schoolYear)` te tonen als read-only `ReadonlyField` (zoals
  "Huidig schooljaar" nu al getoond wordt). De lokale duplicate-`nextSchoolYear` en de
  `SCHOOL_YEARS`-import worden verwijderd.
- **Kamerkeuze**: nieuw `<select>`-veld "Kamer", bevolkt via
  `getAvailableRoomsForRenewal(property.id, nextSchoolYear(contract.schoolYear),
  contract.id)` (opgehaald in dezelfde `loadContract`-effect als de rest van de bundle).
  Opties tonen `Kamer ${room.roomNumber}`. Standaard geselecteerd: de huidige kamer
  (`room.id`) als die in de lijst zit, anders de eerste beschikbare kamer.
- **`RenewForm`** krijgt een `roomId: string` veld. Bij wijziging van de kamerkeuze worden
  `monthlyRent`/`fixedCosts`/`studentTax` herladen met de huidige tarieven van de nieuw
  gekozen kamer (uit de al opgehaalde lijst beschikbare kamers).
- De drie `MoneyField`s (huurprijs, vaste kosten, studentenbelasting) blijven zoals nu
  bewerkbaar, initieel voorgevuld met de tarieven van de huidige kamer.
- **`canProceed()`**: vereist nu ook `form.roomId`. Als de lijst beschikbare kamers leeg is
  (zeer randgeval — alle kamers van het pand al volzet voor volgend jaar), toont de pagina
  een melding "Geen beschikbare kamers voor het volgende schooljaar" en blijft "Volgende"
  uitgeschakeld.
- **Stap 2 (overzicht)**: toont het gekozen kamernummer (kan afwijken van de huidige kamer)
  i.p.v. altijd `room.roomNumber`.
- **`handleNext()` stap 2** roept `createContractRenewal(...)` aan (zie §5) met:
  `previousContractId: contract.id`, `roomId: form.roomId`, `schoolYear:
  nextSchoolYear(contract.schoolYear)`, en de drie ingevulde bedragen omgezet naar
  `number` via `Number(form.monthlyRent)` / `Number(form.fixedCosts)` /
  `Number(form.studentTax)` (de `RenewForm`-velden zijn strings, zoals nu al het geval is
  voor de `MoneyField`s).
  - Bij succes (Supabase, nieuw `contractId`): `navigate(`/contracts/${contractId}`, {
    state: { savedDraft: true } })` — zelfde patroon als `ContractNewPage.tsx` na
    `createContractDraft`.
  - Bij `null` (demo-modus): bestaand gedrag blijft behouden —
    `window.setTimeout(() => navigate('/'), 1200)`.

---

## 5. `createContractRenewal` (`src/lib/data.ts`)

```ts
export interface CreateContractRenewalInput {
  previousContractId: string
  roomId: string
  schoolYear: string
  monthlyRent: number
  fixedCosts: number
  studentTax: number
}

export async function createContractRenewal(input: CreateContractRenewalInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const [contracts, rooms] = await Promise.all([getContracts(), getRooms()])

  const previous = contracts.find(c => c.id === input.previousContractId)
  if (!previous) throw new Error('Vorig contract niet gevonden')

  const room = rooms.find(r => r.id === input.roomId)
  if (!room) throw new Error('Kamer niet gevonden')

  // Side-effect: kamerprijzen bijwerken als de verhuurder ze tijdens het verlengen wijzigt.
  if (
    room.monthlyRent !== input.monthlyRent ||
    room.fixedCosts !== input.fixedCosts ||
    room.studentTax !== input.studentTax
  ) {
    await updateRoomData({
      ...room,
      monthlyRent: input.monthlyRent,
      fixedCosts: input.fixedCosts,
      studentTax: input.studentTax,
    })
  }

  const payload = {
    room_id: input.roomId,
    school_year: input.schoolYear,
    student_id: previous.studentId,
    second_student_id: previous.secondStudentId ?? null,
    status: 'draft' as const,
    monthly_rent: input.monthlyRent,
    fixed_costs: input.fixedCosts,
    student_tax: input.studentTax,
  }

  const { data, error } = await supabase.from('contracts').insert(payload).select().single()

  if (isMissingColumnError(error)) {
    const { monthly_rent, fixed_costs, student_tax, ...fallbackPayload } = payload
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('contracts')
      .insert(fallbackPayload)
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return (fallbackData as ContractRow).id
  }

  if (error) throw error
  return (data as ContractRow).id
}
```

Belangrijke punten:

- **Geen nieuwe `students`-rijen** — `student_id`/`second_student_id` worden
  één-op-één overgenomen van `previous`. Dit voldoet aan "zelfde gegevens overnemen, niet
  opnieuw invullen".
- **Status altijd `'draft'`** voor het nieuwe contract — het doorloopt dezelfde
  voortgangschecklist (startplaatsbeschrijving → ondertekenen → versturen) als een
  gloednieuw contract. Omdat het nieuwe contract geen gekoppelde `inspections` heeft, staan
  de start/eind-iconen op het dashboard voor dit contract terecht weer "uit" — dit lost de
  eerder open vraag over de startplaatsbeschrijving op: die moet sowieso opnieuw voor het
  nieuwe schooljaar.
- **Het vorige contract (`previous`) wordt nergens aangepast** — zijn `monthly_rent`,
  `fixed_costs`, `student_tax` (en alle andere velden) blijven exact zoals opgeslagen.
- De kamerprijs-update (`updateRoomData`) gebeurt **vóór** de contract-insert. Als de
  contract-insert daarna faalt, blijft de kamer-update wel staan — dit is een bewust
  aanvaard, klein randgeval (geen rollback-mechanisme nodig voor deze schaal van app).

---

## 6. Weergave: `ContractDetailPage.tsx` en `pdfDocuments.ts`

Beide plekken berekenen voortaan effectieve waarden:

```ts
const effectiveMonthlyRent = contract.monthlyRent ?? room.monthlyRent
const effectiveFixedCosts = contract.fixedCosts ?? room.fixedCosts
const effectiveStudentTax = contract.studentTax ?? room.studentTax
```

### `ContractDetailPage.tsx` (regel ~348-358)

De "Contract"-`InfoCard` gebruikt de effectieve waarden voor huurprijs, vaste kosten en
studentenbelasting. "Waarborg" blijft ongewijzigd `room.deposit`.

### `pdfDocuments.ts` — `generateContractHtml(bundle)`

Alle plekken die nu `room.monthlyRent`, `room.fixedCosts` of `room.studentTax` lezen
(regels 173, 268-270, 335) gebruiken voortaan de effectieve waarden:

- regel 173: `totalMonthly = effectiveMonthlyRent + effectiveFixedCosts`
- regel 268-270: huurprijs/vaste kosten/studentenbelasting-tekst
- regel 335: schadevergoeding bij vroegtijdige beëindiging (`effectiveMonthlyRent * 2`)

Regel 285 (huurwaarborgtekst, "twee maanden huurprijs: 2 × € X") gebruikt voor de
leesbaarheid ook `effectiveMonthlyRent` in plaats van `room.monthlyRent`, zodat het bedrag
consistent is met de rest van hetzelfde contract-PDF. Het waarborgbedrag zelf
(`room.deposit`) blijft ongewijzigd room-gebonden.

---

## 7. Mockdata (`src/lib/mockData.ts`)

`CONTRACTS` krijgt voor elk bestaand contract de drie snapshotvelden, gelijk aan de
huidige tarieven van de bijhorende kamer (zelfde "bevriezen op huidig tarief"-principe als
de SQL-backfill):

```ts
export const CONTRACTS: Contract[] = [
  { id: 'c1', roomId: 'r1', schoolYear: '2025–2026', studentId: 's1', status: 'signed', createdAt: '2025-08-20', signedAt: '2025-09-12T10:00:00.000Z', monthlyRent: 450, fixedCosts: 60, studentTax: 12 },
  { id: 'c2', roomId: 'r2', schoolYear: '2025–2026', studentId: 's2', status: 'signed', createdAt: '2025-08-20', signedAt: '2025-09-12T10:00:00.000Z', monthlyRent: 470, fixedCosts: 60, studentTax: 12 },
  { id: 'c3', roomId: 'r4', schoolYear: '2025–2026', studentId: 's3', status: 'sent', createdAt: '2025-08-21', signedAt: '2025-09-13T10:00:00.000Z', sentAt: '2025-09-13T10:05:00.000Z', monthlyRent: 450, fixedCosts: 60, studentTax: 12 },
  { id: 'c4', roomId: 'r5', schoolYear: '2025–2026', studentId: 's4', status: 'draft', createdAt: '2025-08-22', monthlyRent: 460, fixedCosts: 60, studentTax: 12 },
  { id: 'c5', roomId: 'r7', schoolYear: '2025–2026', studentId: 's5', status: 'signed', createdAt: '2025-08-22', monthlyRent: 450, fixedCosts: 60, studentTax: 12 },
  { id: 'c-demo-student', roomId: 'r6', schoolYear: '2025–2026', studentId: 's-demo-student', secondStudentId: 's-demo-second-student', status: 'sent', createdAt: '2025-08-23', signedAt: '2025-09-14T10:00:00.000Z', sentAt: '2025-09-14T10:05:00.000Z', monthlyRent: 600, fixedCosts: 80, studentTax: 24 },
]
```

(`SCHOOL_YEARS` zelf staat al in §2.)

---

## 8. Tests

- **`data.test.ts`**:
  - `mapContract`/`getContracts` geven `monthlyRent`/`fixedCosts`/`studentTax` door
    (incl. `undefined` als de kolommen ontbreken — `isMissingColumnError`-pad).
  - `createContractDraft` stuurt de drie snapshotvelden mee in de insert-payload, met
    fallback-pad zonder deze velden.
  - `getAvailableRoomsForRenewal`: filtert op pand, sluit volle dubbele/enkele kamers uit
    (gebaseerd op `signed`/`sent`-contracten voor het doelschooljaar), telt het te
    verlengen contract zelf niet mee voor zijn huidige kamer, negeert `draft`-contracten.
  - `createContractRenewal`: maakt nieuw `draft`-contract met overgenomen
    `studentId`/`secondStudentId` en nieuwe snapshotwaarden; roept `updateRoomData` aan
    wanneer bedragen wijzigen, niet wanneer ze gelijk blijven; laat het vorige contract
    ongewijzigd; `isMissingColumnError`-fallbackpad.
- **`ContractRenewPage.test.tsx`**:
  - Schooljaarveld toont automatisch berekend volgend schooljaar (read-only, geen
    `<select>` meer).
  - Kamer-dropdown toont enkel beschikbare kamers (gemockt via
    `getAvailableRoomsForRenewal`); standaard huidige kamer geselecteerd; wijzigen van
    kamer herlaadt de bedragvelden.
  - "Verlenging versturen" roept `createContractRenewal` met de verwachte payload en
    navigeert naar `/contracts/<nieuw-id>` bij een geretourneerde id, of naar `/` (huidig
    demo-gedrag) bij `null`.
  - Lege beschikbare-kamerlijst toont de foutmelding en houdt "Volgende" uitgeschakeld.
- **`ContractDetailPage.test.tsx`**: "Contract"-kaart toont `contract.monthlyRent` etc.
  wanneer aanwezig, en valt terug op `room.X` wanneer `undefined`.
- **`pdfDocuments.test.ts`**: contract-PDF gebruikt effectieve huurprijs/vaste
  kosten/studentenbelasting uit het contract i.p.v. de kamer, inclusief de
  waarborg-/schadevergoedingstekst die nu op `effectiveMonthlyRent` is gebaseerd.
- Bestaande dashboard-tests (`renewDone`, Part 1) blijven ongewijzigd geldig — een
  verlenging via `createContractRenewal` maakt nu een echt tweede contract met
  `schoolYear === nextSchoolYear(...)`, wat `renewDone` al detecteerde.

---

## 9. Foutafhandeling

- `getAvailableRoomsForRenewal` geeft een lege array terug als er geen kamers beschikbaar
  zijn — de pagina toont dit als blokkerende melding (zie §4), geen crash.
- `createContractRenewal` gooit een `Error` als het vorige contract of de gekozen kamer
  niet (meer) bestaat — `ContractRenewPage` vangt dit op zoals de bestaande
  `loadContract`-foutafhandeling (`setError`, foutmelding tonen).
- Demo-modus (`!isSupabaseConfigured`): `createContractRenewal` retourneert `null` zonder
  enige mutatie (geen kamer-update, geen nieuw mock-contract) — consistent met andere
  create-acties in demo-modus.

---

## Open punten voor latere sessies

1. **Waarborg-snapshot en verleng-logica** — of de waarborg per contract wordt vastgelegd,
   en wat er bij verlenging mee gebeurt (aanhouden, aanpassen, terugbetalen).
2. **Cross-pand kamerkeuze** bij verlenging.
3. **Bezettingscontrole bij `Step1Room`** in de "nieuw contract"-wizard — dezelfde
   capaciteitscheck (`ROOM_CAPACITY`/`isRoomAvailable` uit §3 kan hergebruikt worden) moet
   daar ook toegepast worden, zodat ook bij het aanmaken van een gloednieuw contract geen
   kamers overboekt kunnen worden.
