# Resterende "Aanpassingen KotStart" — Clustering voor losse vervolggesprekken

**Datum:** 2026-06-08 (laatst bijgewerkt: 2026-06-24)
**Status:** B/D/C/A/contractverlenging/dropdowns/E-partial/N10 allemaal af; N11 design klaar, N12 nieuw
**Context:** Meerdere clusters zijn afgerond op `staging`. Dit document legt vast wat er nog open
staat uit `aanpassingen kotstart.docx` (15 items), plus gloednieuwe wensen die Vince heeft geuit.
Doel: elk overblijvend cluster kan in een **eigen, verse conversatie** gebrainstormd en uitgevoerd
worden — dat bespaart tokens t.o.v. één steeds langer wordende sessie.

## Status van de 15 originele items

| # | Item | Besluit |
|---|------|---------|
| 1 | Plaatsbeschrijving overzichtsfoto's: max 1 → moet 5-8 worden | → **Cluster C** |
| 2 | "Sleutel"-onderdeel: aantal sleutels i.p.v. staat | → **Cluster C** |
| 3 | Verstuurd contract is blanco, moet ingevuld zijn | ✅ **al afgerond** — weglaten |
| 4 | E-mail via geert.lovani.be i.p.v. Cloudcast | **later** — pas bij de echte/productieversie zodra het juiste mailadres er is |
| 5 | Accountaanmaak moet geverifieerd worden | **later** — uitgesteld, voorlopig niet meenemen in Cluster A |
| 6 | Betalingen voor kotbaas | **later** — eerst verder bespreken met de "codebaas" over waarvoor dit precies dient, voorlopig niet clusteren |
| 7 | Datum concept én (definitief) contract apart tonen; datum van het echte contract aanpassen bij effectieve ondertekening (na het versturen van een concept) | → **Cluster A** (toevoegen — hoort bij de bredere herziening van de ondertekenings-/verzendflow die daar toch al gepland stond) |
| 8 | Contracten per pand automatisch genereren met locatie-specifieke velden (nu hardcoded op Gent) | → **Cluster A** (voorlopig; kan afgesplitst worden tot eigen cluster als A te groot wordt — zie "Open vragen") |
| 9 | Domicilieadres opsplitsen (Straat/Huisnummer/Bus/Postcode/Gemeente) | ✅ **af** (Cluster B) |
| 10 | Rijksregisternummer uniform formaat | ✅ **vervallen** — het veld zelf is volledig verwijderd (commit `1faf825`) |
| 11 | Onderwijsinstelling als dropdown | ✅ **af** (Cluster B) |
| 12 | Tweede persoon zichtbaar + contract versturen naar beiden | ✅ **af** (Cluster D) |
| 13 | Verhuurdergegevens "achter slotje" — contract pas aanmaakbaar als alles is ingevuld | → **Cluster A** |
| 14 | "Laatste actie ongedaan maken"-knop (Ctrl+Z) in pandensectie | **niet doen** — Vince: "kan je beter gewoon laten" (laten vallen, niet implementeren) |
| 15 | Backup/herstel van per ongeluk verwijderde data | **toe te wijzen, locatie nog onbeslist** — zie "Open vragen" |

## Nieuwe items (niet in het origineel document — door Vince deze sessie geopperd)

Vince wil daarnaast, los van de docx-lijst:

- ✅ **N1 — Verhuurderprofiel verplaatsen**: de verhuurdergegevens die je nu bij **Instellingen**
  (`SettingsPage.tsx`) invult, moeten naar het **profielgedeelte** van de verhuurder
  (`AccountPage.tsx`) verhuizen. **Uitgevoerd in Cluster E-slice.**
- **N2 — Aanpasbare plaatsbeschrijvingscategorieën**: in **Instellingen** zelf de categorieën
  kunnen samenstellen/bewerken die bij een plaatsbeschrijving gebruikt worden (i.p.v. vaste,
  hardcoded categorieën).
- **N3 — Dark/light thema-toggle**: in Instellingen het thema van de app kunnen omschakelen.
- **N4 — Taalkeuze**: in Instellingen de taal van de app kunnen instellen.
- **N5 — "andere aanpassingen die niet in het document staan"**: Vince noemde dit expliciet maar
  heeft de concrete punten nog niet benoemd. **Open — bij de start van het Instellingen/Profiel-
  cluster eerst aan Vince vragen wat dit precies inhoudt**, zodat het meegenomen kan worden in die
  brainstorm in plaats van later weer apart te moeten.

N1–N4 horen inhoudelijk samen (allemaal Instellingen/Profiel-gerelateerd) en vormen een logisch
nieuw cluster.

Daarnaast kwamen er, tijdens het live testen van de Cluster C-feature (plaatsbeschrijving), twee
extra wensen naar boven die niet in de docx stonden:

- **N6 — PDF-knop verplaatsen**: de knop "PDF voorbeeld maken" hoort niet thuis in de
  plaatsbeschrijvingswizard (`InspectionNewPage.tsx`, stap overzichtsfoto's). Hij moet naar
  `InspectionDetailPage.tsx` (bereikt via een student z'n naam in het overzichtsdashboard), als
  knop "PDF opmaken" onderaan, en pas zichtbaar/bruikbaar **nadat de plaatsbeschrijving is
  afgerond**.
- **N7 — Plaatsbeschrijving loskoppelen van het contract**: het contract-PDF en de
  plaatsbeschrijving-PDF moeten twee volledig aparte documenten worden — een contractdocument dat
  louter naar de plaatsbeschrijving *verwijst*, en een op zichzelf staand, afdrukbaar
  plaatsbeschrijvingsdocument (vergelijkbaar met/herbruikbaar voor de eindplaatsbeschrijving),
  i.p.v. de huidige opzet waarin `generateContractHtml` de volledige plaatsbeschrijving inline
  in het contract rendert.
- ✅ **N8 — E-mailadres/wachtwoord wijzigen functioneel maken**: volledig werkend via
  `supabase.auth.updateUser()` met `emailRedirectTo`; inline bewerkingsflows in AccountPage;
  Supabase "Secure email change" uitgezet (enkel nieuw adres bevestigen). Commit `2cff386` +
  `16cc8a4` op `staging`.
- **N9 — Wachtwoord vergeten / reset flow**: gebruiker klikt "Wachtwoord vergeten?" op de
  loginpagina, vult e-mail in, ontvangt een reset-link via `supabase.auth.resetPasswordForEmail()`,
  klikt de link, komt terug op een `/reset-password` pagina, stelt nieuw wachtwoord in via
  `updateUser({ password })`. Design goedgekeurd 2026-06-19, implementatieplan volgt.
- **N10 — Plaatsbeschrijving uitbesteden aan student**: verhuurder kan kiezen of de
  plaatsbeschrijving (inspectie) **samen** met de student wordt ingevuld (huidige flow) of
  **uitbesteed** wordt aan de student. Bij uitbesteding ontvangt de student een link naar een
  **gesloten omgeving** (geen toegang tot contracten, dashboard, of andere verhuurderdata) waar
  enkel de plaatsbeschrijving ingevuld kan worden. Na afronden krijgt de student een **PDF-versie**
  die gedownload of per e-mail verstuurd kan worden. **Belangrijk**: meterstanden (elektriciteit,
  gas, water) moeten **altijd samen** met de verhuurder worden ingevuld, ook bij uitbesteding — deze
  worden uit de student-flow gehaald. Bij **contractverlenging** is geen nieuwe startplaatsbeschrijving
  nodig (de originele loopt door tot het einde van de huurperiode), tenzij de student naar een ander
  pand/kamer verhuist. Nog te brainstormen: exacte authenticatie/tokenmodel voor de studentlink,
  scope van de gesloten omgeving, hoe meterstanden apart afgehandeld worden.
- **N11 — Indexatie automatisch toepassen**: een knop "Indexatie toevoegen" waarmee huurprijzen
  automatisch geïndexeerd worden (conform de wettelijke gezondheidsindex). Nog te brainstormen:
  welke waarden geïndexeerd worden (huur, vaste kosten, studentenbelasting), welk indexcijfer
  gebruikt wordt, en of dit bij contractverlenging of op pandniveau gebeurt.

N6 en N7 raken dezelfde bestanden (`pdfDocuments.ts`, `InspectionDetailPage.tsx`) en dezelfde
onderliggende vraag — "wat bevat het contract-PDF en hoe verwijst het naar de plaatsbeschrijving"
— als #8 (pandspecifieke contractgeneratie), die toch al in Cluster A gepland staat. Vince heeft
bevestigd dat ze daarom bij **Cluster A** horen, als onderdeel van de contract-PDF-herziening
(samen met #8), in plaats van een eigen cluster te vormen.

## Voorgestelde clustering voor de vervolggesprekken

Met B en D klaar, blijven er drie zinvolle clusters over:

### Cluster C — Inspectie/Plaatsbeschrijving ✅ AFGEROND
*(commits `64cc975`..`e8a91d1` op `staging`, 2026-06-11)*
- ✅ #1 overzichtsfoto's 5-8
- ✅ #2 sleutels: aantal i.p.v. staat

### Cluster A — Contract- & verhuurderflow ✅ AFGEROND
*(commits op `staging`, 2026-06-18 + eerder)*

- ✅ #7 stepper vereenvoudigd, concept sturen, verhuurder datum fix
- ✅ #8 contracten per pand (locatie-specifieke velden)
- ✅ #13 verhuurdergegevens → verplaatst naar Supabase (N1)
- ✅ N6 PDF-knop verplaatst naar `InspectionDetailPage.tsx`
- ✅ N7 contract-PDF en plaatsbeschrijving-PDF losgekoppeld
- ✅ Minderjarigheid: wettelijke vertegenwoordiger/voogd handtekening afgedwongen
  (`isMinor()` detectie, voogdvelden in wizard, aangepast handtekeninglabel in SignatureModal + PDF)

### Nieuw Cluster E — Instellingen & Profiel (DEELS AFGEROND)
*(volledig nieuw, ontstaan uit Vince's wensen — niet in de docx)*
- ✅ N1 verhuurderprofiel van Instellingen naar Profiel verplaatsen
- ✅ N2 zelf samen te stellen plaatsbeschrijvingscategorieën (per pand)
- ✅ N8 e-mailadres/wachtwoord wijzigen functioneel maken
- N3 dark/light thema
- N4 taalkeuze
- N5 (nog te specifiëren — eerst aan Vince vragen)
- N9 wachtwoord vergeten / reset flow ← **implementatieplan klaar, uitvoering nu**
- mogelijk #15 (backup/herstel) — zie "Open vragen"

### Nieuw Cluster F — Plaatsbeschrijving uitbesteden & indexatie (DEELS AFGEROND)
*(nieuwe wensen, 2026-06-19)*
- ✅ N10 plaatsbeschrijving uitbesteden aan student (gesloten omgeving, tokenlink, meterstanden apart)
  *(commits `0807fee`..`53be0f1` op `staging`)*
- N11 indexatie automatisch toepassen — **design goedgekeurd 2026-06-24**, implementatie volgt
  *(spec: `docs/superpowers/specs/2026-06-24-huurindexatie-design.md`)*
  Edge Function synct gezondheidsindex van Statbel; toggle per pand in Instellingen;
  automatische berekening bij contractverlenging; kamerprijzen worden bijgewerkt met
  `base_rent` + `base_rent_year` voor correcte formule
- **N12 — Contractlengtes correctie**: de huidige weergave van contractlengtes klopt niet.
  Nog te brainstormen en specificeren.

### Afgeronde losse features (geen cluster)
- ✅ Contractverlenging (commits `00d405c`..`592d19e` op `staging`, 2026-06-12)
- ✅ Schooljaar/pand-dropdowns (commits `34d7b31`..`55665e6` op `staging`, 2026-06-13)

### Niet geclusterd / bewust uitgesteld
- #4 e-maildomein → wacht op de echte/productie-mailbox
- #5 accountverificatie → uitgesteld, voorlopig niet meenemen in Cluster A
- #6 kotbaas-betalingen → eerst bespreken met de codebaas over het doel ervan
- #14 undo-knop → niet implementeren, laten zoals het is
- #3, #10 → al afgerond / vervallen, geen verdere actie

## Open vragen (te beslissen vóór of bij de start van het betreffende cluster-gesprek)

1. **#8 (pandspecifieke contracten)** — Vince twijfelt of dit bij Cluster A hoort of een eigen
   cluster verdient. Voorstel: start het in Cluster A (het is in essentie een verfijning van de
   contractgeneratie die daar toch al herzien wordt); als die brainstorm te veel beslaat,
   splits het er dan alsnog uit.
2. **#15 (backup/herstel verwijderde data)** — Vince weet zelf nog niet waar dit het beste past.
   Voorstel: bespreek dit bij de start van Cluster E (Instellingen is een plausibele plek voor een
   "recent verwijderd"-overzicht), met de optie om het tijdens die brainstorm alsnog naar een eigen
   cluster te verplaatsen als het te veel impact heeft op meerdere pagina's.
3. **N5 ("andere aanpassingen")** — nog volledig open; eerste vraag bij de start van Cluster E.

## Aanbevolen volgorde (bijgewerkt 2026-06-24)

**N11 (indexatie, nu) → E-rest (N3/N4/N5) → N12 (contractlengtes)**

N11 design is goedgekeurd, implementatie start nu. E-rest zijn UI-instellingen (dark/light thema,
taalkeuze). N12 (contractlengtes) is nieuw geïdentificeerd en moet nog gebrainstormd worden.

## Hoe een vervolggesprek te starten

Geef in de openingsprompt van het nieuwe gesprek mee:
- Welk cluster (C, A, of E) en de bijhorende items uit dit document
- Dat dit deel uitmaakt van de "Aanpassingen KotStart"-launchwerk (specs/plans van B en D als
  referentie voor stijl: `docs/superpowers/specs/2026-06-06-cluster-b-studentdata-design.md`,
  `docs/superpowers/specs/2026-06-07-cluster-d-tweede-persoon-design.md`)
- Branch: `staging`, working dir `C:\shit\Bezig\KotKlusser\KotStart\KotStartGit`
- Start met de **brainstorming**-skill (niet meteen plannen/implementeren) — elk cluster doorloopt
  zijn eigen spec → plan → implement-cyclus
