# KotStart — Contract Wizard Design Spec (Phase 2)

**Datum:** 2026-05-21
**Status:** Goedgekeurd — klaar voor implementatie

---

## Doel

Vervang de stub `ContractNewPage` door een volledig werkende 4-stappen wizard waarmee de verhuurder een nieuw huurcontract opstelt met mock data (geen Supabase wiring).

---

## Wizard structuur

Route: `/contracts/new`

4 stappen in volgorde:
1. **Kamer** — kamer kiezen uit beschikbare kamers
2. **Student** — persoonsgegevens + foto (twee formulieren bij dubbele kamer)
3. **Tweede partij** — tweede verhuurder / tweede bewoner / voogd (auto-detect)
4. **Overzicht** — samenvatting + "Contract versturen" knop → terug naar dashboard

---

## Stapindicator

- Stijl: genummerde cirkels met verbindingslijn (optie A)
- Op ALLE schermformaten (telefoon, tablet, desktop) hetzelfde
- Voltooide stappen: vinkje (✓) + paarse vulling
- Actieve stap: paarse cirkel met glow
- Toekomstige stappen: grijs
- Labels onder elke cirkel: "Kamer" · "Student" · "Partij" · "Overzicht"

---

## Navigatie

- Onderaan twee knoppen: "← Terug" (ghost) en "Volgende →" (primair accent)
- Laatste stap: "Volgende" wordt "Contract versturen" (loading state bij klik)
- Na versturen: navigate('/') terug naar dashboard
- Terug op stap 1: navigate(-1) terug naar dashboard
- Swipe-gestures (Framer Motion): links/rechts tussen stappen

---

## Stap 1 — Kamer kiezen

- Toont kamers van het geselecteerde pand (uit URL state of PROPERTIES[0])
- Elke kamer = klikbare glass-card met: kamernummer, type (studio/enkel/dubbel), huurprijs/maand
- Geselecteerde kamer krijgt accent-border + samenvatting-card eronder:
  - Kamernummer, type, huurprijs, studentenbelasting, vaste kosten, waarborg
  - Bij type "dubbel": badge "2 personen — twee studentformulieren volgen"
- Validatie: kamer moet geselecteerd zijn voor "Volgende"

---

## Stap 2 — Studentgegevens

- Enkelvoudige kamer (single/studio): één formulier
- Dubbele kamer: twee formulieren onder elkaar, elk met eigen sectie-kop ("Student 1" / "Student 2")

Per student:
- Voornaam (verplicht)
- Achternaam (verplicht)
- E-mail (verplicht, email-validatie)
- Telefoon (optioneel)
- Geboortedatum (verplicht, date picker) — als < 18 jaar: badge "Minderjarig — voogd vereist"
- Foto: grote knop met Camera-icoon → `<input type="file" accept="image/*" capture="user">` → preview cirkel na selectie

Validatie op blur. Geen errors getoond voor gebruiker het veld aanraakt.

**Guardian auto-detect:** als geboortedatum < 18 jaar → stap 3 toont automatisch de voogd-sectie (niet als toggle maar verplicht zichtbaar).

---

## Stap 3 — Tweede partij

Drie secties:

1. **Tweede verhuurder** (toggle aan/uit)
   - Als aan: naam (verplicht) + e-mail (verplicht)

2. **Tweede bewoner** (toggle aan/uit — ENKEL zichtbaar bij kamertype single of studio)
   - Als aan: naam (verplicht) + e-mail (verplicht)
   - Bij dubbele kamer: deze toggle niet tonen (tweede bewoner al ingevuld in stap 2)

3. **Voogd** (automatisch zichtbaar als student < 18 jaar, géén toggle)
   - Vaste sectie met badge "Vereist — student is minderjarig"
   - Naam (verplicht), e-mail (verplicht), telefoon (optioneel)
   - Als geen student minderjarig: sectie helemaal niet tonen

Als geen enkele sectie zichtbaar is (alle uit, geen minderjarigen): toon een lege staat "Geen extra partijen vereist. Klik op Volgende."

---

## Stap 4 — Overzicht

Samenvatting in glass-cards:

- **Kamer:** nummer, type, huurprijs/maand, kosten, waarborg
- **Student(en):** naam, e-mail, telefoon, geboortedatum, foto-preview
- **Tweede partij:** (indien aanwezig) verhuurder / bewoner / voogd gegevens
- Grote CTA knop: "Contract versturen →"
  - Loading state: spinner in knop, tekst "Wordt verstuurd..."
  - Na 1.5s mock delay: navigate('/')

---

## Componenten

```
src/pages/
  ContractNewPage.tsx         — orchestreert wizard state + navigatie

src/pages/wizard/
  WizardLayout.tsx            — wrapper: stepIndicator + back/next + swipe
  StepIndicator.tsx           — cirkels + lijn, 4 stappen
  Step1Room.tsx               — kamer selectie
  Step2Student.tsx            — student formulier(en) + foto
  Step3SecondParty.tsx        — tweede partij toggles
  Step4Review.tsx             — samenvatting + versturen
```

---

## State structuur (in ContractNewPage)

```ts
interface WizardState {
  currentStep: 1 | 2 | 3 | 4
  selectedRoomId: string | null
  students: StudentFormData[]        // 1 of 2 items afhankelijk van kamertype
  secondLandlord: SecondPartyData | null
  secondTenant: SecondPartyData | null
  guardian: GuardianData | null
}

interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null            // base64 preview
}

interface SecondPartyData {
  name: string
  email: string
}

interface GuardianData {
  name: string
  email: string
  phone: string
}
```

---

## Design tokens (zelfde als Phase 1)

- Liquid glass: `bg-white/55 backdrop-blur-2xl border border-white/75`
- Accent: `#6366f1 / #4f46e5`
- Font: Bricolage Grotesque
- Iconen: Lucide React (geen emoji's)
- Taal: Nederlands (nl-BE)

---

## Geen Supabase wiring

Alle data uit `mockData.ts`. Na "Contract versturen" alleen een mock delay + navigate('/').
