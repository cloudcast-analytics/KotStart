# Resterende "Aanpassingen KotStart" — Clustering voor losse vervolggesprekken

**Datum:** 2026-06-08
**Status:** Door Vince doorgenomen en bevestigd item-per-item; klaar als naslag voor aparte cluster-gesprekken
**Context:** Cluster B (studentdata) en Cluster D (tweede persoon) zijn **af** en gepusht naar `staging`.
Dit document legt vast wat er nog open staat uit `aanpassingen kotstart.docx` (15 items), plus
gloednieuwe wensen die Vince tijdens deze sessie heeft geuit (niet in het origineel document).
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

N6 en N7 raken dezelfde bestanden (`pdfDocuments.ts`, `InspectionDetailPage.tsx`) en dezelfde
onderliggende vraag — "wat bevat het contract-PDF en hoe verwijst het naar de plaatsbeschrijving"
— als #8 (pandspecifieke contractgeneratie), die toch al in Cluster A gepland staat. Vince heeft
bevestigd dat ze daarom bij **Cluster A** horen, als onderdeel van de contract-PDF-herziening
(samen met #8), in plaats van een eigen cluster te vormen.

## Voorgestelde clustering voor de vervolggesprekken

Met B en D klaar, blijven er drie zinvolle clusters over:

### Cluster C — Inspectie/Plaatsbeschrijving
*(was al gescoped vóór deze sessie, simpelweg de eerstvolgende in de oorspronkelijke volgorde
B → D → **C** → A)*
- #1 overzichtsfoto's 5-8
- #2 sleutels: aantal i.p.v. staat

### Cluster A — Contract- & verhuurderflow
*(grootste resterende cluster — bevat alles wat met de ondertekenings-/verzend-/aanmaakflow van
het contract te maken heeft; was toch al de plek waar "wie ondertekent bij minderjarigheid" naartoe
verschoven is vanuit Cluster D)*
- #7 datum concept vs. definitief contract (+ datumcorrectie bij effectieve ondertekening)
- #8 contracten automatisch per pand genereren (locatie-specifieke velden i.p.v. hardcoded Gent)
- #13 verhuurdergegevens compleet vóór contract aanmaken mogelijk is
- N6 PDF-knop verplaatsen naar `InspectionDetailPage.tsx` ("PDF opmaken", pas na afronden zichtbaar)
- N7 contract-PDF en plaatsbeschrijving-PDF loskoppelen tot twee aparte documenten
  *(N6/N7 horen bij de contract-PDF-herziening en starten samen met #8 — zie "Nieuwe items")*
- (overgeërfd uit Cluster D) wie ondertekent bij minderjarigheid:
  wettelijke vertegenwoordiger/voogd verplicht; student eventueel mee als akkoord/kennisname,
  maar niet als enige rechtsbasis

### Nieuw Cluster E — Instellingen & Profiel
*(volledig nieuw, ontstaan uit Vince's wensen deze sessie — niet in de docx)*
- ✅ N1 verhuurderprofiel van Instellingen naar Profiel verplaatsen
- N2 zelf samen te stellen plaatsbeschrijvingscategorieën
- N3 dark/light thema
- N4 taalkeuze
- N5 (nog te specifiëren — eerst aan Vince vragen bij start van dit cluster)
- mogelijk #15 (backup/herstel) — zie "Open vragen"

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

## Aanbevolen volgorde

**C → A → E** (E hangt het minst samen met de rest en kan het laatst, A is het meest verweven met
de bestaande contractflow dus best vroeg na C zodat de inzichten uit C — bv. plaatsbeschrijving in
de 4-stappen-checklist — nog vers zijn).

## Hoe een vervolggesprek te starten

Geef in de openingsprompt van het nieuwe gesprek mee:
- Welk cluster (C, A, of E) en de bijhorende items uit dit document
- Dat dit deel uitmaakt van de "Aanpassingen KotStart"-launchwerk (specs/plans van B en D als
  referentie voor stijl: `docs/superpowers/specs/2026-06-06-cluster-b-studentdata-design.md`,
  `docs/superpowers/specs/2026-06-07-cluster-d-tweede-persoon-design.md`)
- Branch: `staging`, working dir `C:\shit\Bezig\KotKlusser\KotStart\KotStartGit`
- Start met de **brainstorming**-skill (niet meteen plannen/implementeren) — elk cluster doorloopt
  zijn eigen spec → plan → implement-cyclus
