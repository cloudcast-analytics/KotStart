# Claude Code prompt — Contractgeneratie koppelen aan de wizard

## Context

In `docs/contracts/modelcontract_studentenhuur_2025_2026.docx` staat het officiële
Vlaams modelcontract voor studentenhuur (academiejaar 2025–2026), volledig uitgewerkt
voor gebruik in Gent. Dit contract moet de basis worden voor de PDF-generatie in de app.

Het contract volgt het Vlaams Woninghuurdecreet (9 november 2018) en bevat:
- Art. 1–19: alle wettelijk verplichte bepalingen
- Bijlage A: beginplaatsbeschrijving met alle 5 categorieën

## Opdracht

Pas `src/lib/pdfDocuments.ts` aan zodat de app een volledig ingevuld huurcontract
genereert op basis van de data uit de contractwizard. Gebruik de structuur van het
modelcontract als basis.

### Gevraagde output

Wanneer de verhuurder op "Contract versturen" klikt (stap 4 van de wizard, of vanuit
ContractDetailPage), moet de app een print-ready HTML-pagina genereren die:

1. **Alle partijen invult** op basis van wizard-data:
   - Verhuurder: naam, adres, telefoon, e-mail (ophalen uit `settings` of hardcoded
     als mock: "Geert Vandenberghe, Veldstraat 89, 9000 Gent")
   - Huurder: voornaam + achternaam, geboortedatum, studentennummer, e-mail, telefoon,
     hoofdverblijf (uit `Student`-object)
   - Bij dubbele kamer: beide studenten vermelden

2. **De kamerbeschrijving invult** (Art. 1 & 2):
   - Adres van het pand + kamernummer (uit `Room` + `Property`)
   - Kamertype (studio / enkelpersoon / tweepersoon)

3. **De financiële voorwaarden invult** (Art. 3–6):
   - Huurperiode: schooljaar → startdatum 3e maandag van september, einddatum 30 juni
   - Huurprijs: `monthlyRent` uit `Room`
   - Vaste kosten: `fixedCosts` uit `Room`
   - Studentenbelasting: `studentTax` uit `Room`
   - Waarborg: `deposit` uit `Room`
   - Totaal maandelijks = huurprijs + vaste kosten

4. **Plaatsbeschrijvingstabel** (Bijlage A):
   - Als er een `Inspection` van type `start` gekoppeld is aan het contract:
     vul de toestand per item in (good → "Goed", moderate → "Matig", bad → "Slecht",
     unusable → "Onbruikbaar") + opmerkingen
   - Zonder inspection: lege tabel afdrukken (in te vullen op papier)

5. **Handtekeningblokken** voor verhuurder en huurder (onderaan contract én bijlage)

### Technische aanpak

- Gebruik de bestaande `window.print()` flow in `pdfDocuments.ts`
- Maak een functie `generateContractHtml(bundle: ContractBundle): string` die de
  volledige HTML teruggeeft
- `ContractBundle` = `{ contract, room, property, student, secondStudent?, inspection?, inspectionItems? }`
- Stijl via inline CSS (geen Tailwind — print CSS werkt beter met inline styles):
  - Wit papier, zwarte tekst, Arial 10pt
  - Paginamarges: 2cm rondom
  - Articelnummers bold, tekst justified
  - Tabel plaatsbeschrijving: lichte achtergrond voor categorieheaders
  - `@media print { @page { size: A4; margin: 2cm; } }`

### Bestaande code die je gebruikt/aanpast

- `src/lib/pdfDocuments.ts` → vervang de huidige mock-implementatie door de nieuwe
  `generateContractHtml` functie
- `src/lib/data.ts` → `getContractBundleData(contractId)` geeft al
  `{ contract, room, student, property }` terug; voeg optioneel inspection + items toe
- `src/pages/ContractDetailPage.tsx` → de "PDF afdrukken" knop roept al
  `pdfDocuments.ts` aan; zorg dat die ook de inspection data doorgeeft indien aanwezig

### Mock data

Voor de mock-modus (geen Supabase): genereer een realistisch voorbeeld met:
- Verhuurder: Geert Vandenberghe, Veldstraat 89, 9000 Gent
- Huurder: data uit `STUDENTS[0]` in `mockData.ts`
- Kamer + pand: eerste kamer van eerste pand in `ROOMS` / `PROPERTIES`

### Wat je NIET hoeft te doen

- Geen echte e-mailintegratie (dat is fase 2)
- Geen digitale handtekening (buiten scope fase 1)
- Geen .docx generatie vanuit de browser (print naar PDF is voldoende)

### Tests

Voeg minimaal één test toe in `src/__tests__/pdfDocuments.test.ts`:
- `generateContractHtml` met mock-bundle → geeft string terug die de naam van de
  student, het adres van het pand en de huurprijs bevat

---

Referentiedocument: `docs/contracts/modelcontract_studentenhuur_2025_2026.docx`
Alle artikelnummers en juridische tekst in die file zijn correct — gebruik ze als
basis voor de statische contracttekst in de HTML-template.
