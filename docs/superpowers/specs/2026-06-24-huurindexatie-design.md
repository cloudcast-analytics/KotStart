# Huurindexatie — Design Spec

**Datum:** 2026-06-24
**Status:** Goedgekeurd
**Cluster:** F (N11)

## Doel

De verhuurder kan per pand automatische huurindexatie inschakelen. Wanneer actief:
- Wordt de basishuurprijs bij contractverlenging automatisch berekend op basis van de Belgische gezondheidsindex
- Worden kamerprijzen bijgewerkt naar de geïndexeerde waarde
- Enkel de basishuurprijs (monthlyRent) wordt geïndexeerd — niet fixedCosts, studentTax of deposit

## Wettelijke basis

**Formule (Vlaams Woninghuurdecreet):**

```
Geïndexeerde huur = basishuurprijs × (nieuwe index / aanvangsindex)
```

- **Basishuurprijs**: originele huurprijs bij eerste contractafsluiting
- **Aanvangsindex**: gezondheidsindex (basis 2013=100) van augustus van het eerste schooljaar
- **Nieuwe index**: gezondheidsindex (basis 2013=100) van augustus van het nieuwe schooljaar
- Alle contracten gaan in op 1 september → aanvangsmaand is altijd augustus

## Databron

Statbel (FOD Economie) publiceert maandelijks de gezondheidsindex.

- **API:** `https://bestat.statbel.fgov.be/bestat/api/views/d9a303dc-d393-4686-8fe2-234e03a857b8/result/CSV`
- **Formaat:** CSV met kolommen `Jaar`, `Maand`, `Niveau 1`, `Basisjaar`, `Consumptieprijsindex`
- **Filter:** `Basisjaar = "2013 = 100"` en `Niveau 1 = "Gezondheidsindex"`
- **Publicatie:** ±28e van elke maand
- **Toegang:** gratis, geen authenticatie

## Database

### Nieuwe tabel: `health_index`

```sql
CREATE TABLE health_index (
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  value decimal NOT NULL,
  PRIMARY KEY (year, month)
);
```

Bevat enkel waarden met basisjaar 2013=100. ±360 rijen (1994–heden), groeit met 1/maand.

### Uitbreiding `properties`

```sql
ALTER TABLE properties ADD COLUMN indexation_enabled boolean DEFAULT false;
```

### Uitbreiding `rooms`

```sql
ALTER TABLE rooms
  ADD COLUMN base_rent decimal,
  ADD COLUMN base_rent_year int;
```

- `base_rent`: de originele huurprijs bij aanmaak van de kamer
- `base_rent_year`: het jaar waarin de kamer is aangemaakt (bepaalt aanvangsindex = augustus van dat jaar)
- Bij bestaande kamers: `base_rent = monthlyRent`, `base_rent_year = year(createdAt)`

## Edge Function: `sync-health-index`

- Haalt de Statbel CSV op
- Parseert en filtert op basisjaar 2013
- Upsert naar `health_index` tabel
- Trigger: handmatig of via pg_cron (1x/maand)
- Foutafhandeling: bij Statbel-downtime blijft de bestaande data intact

## UI

### SettingsPage — Toggle per pand

In de bestaande per-pand instellingen, nieuwe sectie "Huurindexatie":
- Toggle "Automatische indexatie" (aan/uit)
- Info-tekst: "Bij contractverlenging wordt de basishuurprijs automatisch geïndexeerd aan de gezondheidsindex (Statbel). Enkel de basishuur wordt geïndexeerd, niet de kosten of lasten."

### ContractRenewPage — Geïndexeerde prijs

Wanneer indexatie ingeschakeld is voor het pand:
- Het huurprijs-veld wordt automatisch ingevuld met de geïndexeerde waarde
- Rechts in het veld: badge "Indexatie toegepast" met een ⓘ-icoon
- Klik op ⓘ toont een popover/tooltip met de berekening:
  - `€500 × (129.42 / 107.89) = €599,81`
  - `Aanvangsindex: aug 2020 = 107.89`
  - `Huidige index: aug 2026 = 129.42`
- De verhuurder kan het bedrag nog handmatig overschrijven
- fixedCosts en studentTax tonen geen indexatie-indicatie

### PropertiesPage — Indexatie-toggle en bijgewerkte prijzen

- Per pand: indexatie-toggle naast de pandnaam
- Kamerprijzen tonen altijd de huidige (geïndexeerde) waarde
- Bij het aanmaken van een nieuwe kamer wordt `base_rent` en `base_rent_year` automatisch gezet

## Data Layer

Nieuwe functies in `src/lib/data.ts`:

```typescript
getHealthIndex(year: number, month: number): Promise<number | null>
getHealthIndices(): Promise<Array<{ year: number; month: number; value: number }>>
calculateIndexedRent(baseRent: number, baseYear: number, targetYear: number): Promise<number>
getPropertyIndexation(propertyId: string): Promise<boolean>
savePropertyIndexation(propertyId: string, enabled: boolean): Promise<void>
```

## Migratiepad bestaande kamers

Bij het draaien van de migratie:
- `base_rent` wordt gevuld met de huidige `monthly_rent`
- `base_rent_year` wordt gevuld met het jaar van `created_at` van de kamer
- Dit garandeert dat bestaande kamers correct geïndexeerd kunnen worden

## Beperkingen / buiten scope

- Contractlengtes (huidige weergave klopt niet) → aparte sessie
- Basisjaar 2025=100 ondersteuning → pas relevant als Statbel dit verplicht voor huurcontracten
- Automatische pg_cron setup → handmatige sync volstaat voor MVP; cron kan later
