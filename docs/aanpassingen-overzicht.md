# KotStart — Overzicht aanpassingen sinds 29 mei 2026

**Laatste samenkomst met Geert:** 29 mei 2026
**Periode:** 29 mei – 24 juni 2026

---

## 1. Contracten

### Nieuw contract aanmaken
- 3-stappenwizard: Kamer selecteren → Studentgegevens invullen → Overzicht en opslaan
- Contract wordt opgeslagen als concept (draft), daarna ondertekenen en versturen als aparte stappen
- Enkel vrije kamers worden getoond voor het gekozen schooljaar
- Huurprijs wordt automatisch geïndexeerd als indexatie actief is op het pand
- Studentenfoto kan via camera of galerij worden toegevoegd

### Contractverlenging
- Verlengingswizard met automatisch volgend schooljaar
- Mogelijkheid om de student naar een andere kamer te verplaatsen
- Studentgegevens (naam, e-mail, telefoon, geboortedatum) zijn bewerkbaar bij verlenging
- Huurindexatie wordt automatisch berekend en vooraf ingevuld
- Prijzen worden vastgelegd op het nieuwe contract (snapshot)

### Contractdetail
- 4-staps voortgangschecklist: aangemaakt → plaatsbeschrijving → ondertekend → verstuurd
- Conceptversie apart verstuurbaar (los van definitieve versie)
- Digitale handtekening verhuurder via tekenveld
- Contract-PDF wordt als bijlage meegestuurd per e-mail
- Ondersteuning voor dubbele kamers (twee studenten op één contract)

---

## 2. Plaatsbeschrijving (inspectie)

### Inspectiewizard
- Per categorie (keuken, badkamer, kamer, inkom, algemeen) items beoordelen met conditie: goed / matig / slecht / onbruikbaar
- Foto-upload per item
- Sleuteltelling als apart invoerveld
- Meterstanden (elektriciteit, gas, water) met eenheid
- 5 tot 8 verplichte overzichtsfoto's

### Inspectiedelegatie
- Verhuurder kan instellen dat de student zelf de plaatsbeschrijving invult
- Student ontvangt een unieke link per e-mail
- Student vult de inspectie in via een publieke pagina (geen account nodig)
- Verhuurder beoordeelt de ingevulde inspectie en keurt goed of wijst af

### Aanpasbare categorieën
- Via Instellingen kunnen de inspectiecategorieën en items per pand worden aangepast

---

## 3. Huurindexatie

- Automatische berekening op basis van de Belgische gezondheidsindex (Statbel, basis 2013=100)
- Per pand in/uit te schakelen via Instellingen
- Basishuurprijs en basisjaar worden vastgelegd bij het aanmaken van een kamer
- Formule: basishuur × (huidige augustusindex / aanvangsaugustusindex)
- Consistent toegepast op alle plekken in de app:
  - Pandenoverzicht (volgt het schooljaarfilter)
  - Nieuw contract aanmaken
  - Contract verlengen
- Info-tooltip met volledige berekening zichtbaar

---

## 4. Pandenbeheer

- Panden aanmaken en bewerken
- Kamers toevoegen, bewerken en verwijderen per pand
- Schooljaarfilter: dynamisch wisselen tussen schooljaren, volgend schooljaar toevoegen
- Bezettingsstatus per kamer: vrij of bezet (met studentnaam en contractstatus)
- Geïndexeerde huurprijs zichtbaar op kamerkaarten (past mee aan met schooljaarfilter)

---

## 5. Studentgegevens

- Uitgebreide adresgegevens: straat, huisnummer, bus, postcode, stad
- Belgische postcodevalidatie (4 cijfers)
- Onderwijsinstelling: zoekbare dropdown met lijst van alle Vlaamse hogescholen en universiteiten
- Faculteit als apart veld
- Voogdgegevens automatisch gevraagd bij minderjarige studenten (naam, e-mail, telefoon)
- Tweede student/medebewoner bij dubbele kamers

---

## 6. PDF-generatie

- Huurcontract conform het Vlaams Woninghuurdecreet (Art. 1–19 + Bijlage A plaatsbeschrijving)
- Digitale handtekening van de verhuurder als afbeelding in het contract
- Twee studenten als meervoud "HUURDERS" weergegeven
- Plaatsbeschrijving als apart PDF-document (los van het contract)
- Sleutelaantallen, meterstanden en overzichtsfoto's in de inspectie-PDF
- PDF wordt als bijlage meegestuurd via e-mail

---

## 7. Account & Authenticatie

- Registreren met e-mail/wachtwoord (met verificatiemail)
- Inloggen met Google
- Wachtwoord vergeten / resetten via e-mail
- E-mailadres en wachtwoord wijzigen via Accountpagina
- Verhuurder-profiel: naam, adres, telefoon, e-mail, IBAN (met Belgische validatie en auto-formattering)

---

## 8. Instellingen (per pand)

- Indexatie aan/uit per pand
- Inspectiedelegatie aan/uit per pand (student doet zelf plaatsbeschrijving)
- Inspectiecategorieën aanpasbaar per pand

---

## 9. E-mail

- Contract-PDF als bijlage versturen via Supabase Edge Function
- Conceptversie apart verstuurbaar
- Inspectiedelegatie-mail met unieke link naar de student
- Bij dubbele kamers: e-mail naar beide studenten
- Afzender via Cloudcast-domein (SPF/DKIM geconfigureerd)

---

## 10. Beveiliging

- Row Level Security: elke verhuurder ziet enkel eigen data
- Opslagbeveiliging voor studentfoto's en inspectiefoto's
- IBAN-encryptie in de database

---

## 11. Dashboard

- Studentenlijst gefilterd op pand en schooljaar
- Statusbadges per contract (concept / ondertekend / verstuurd)
- Gecombineerde naam bij dubbele kamers
- Pand-selectie wordt onthouden na herladen

---

*Document opgesteld op 24 juni 2026.*
