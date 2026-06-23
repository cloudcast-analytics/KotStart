# Huurindexatie in België — Hoe werkt het?

## Wat is een index?

Een index is een getal dat **prijsveranderingen over tijd** meet. Je kiest een startpunt (basisjaar) en zegt: "dat is 100." Alles daarna is relatief aan dat punt.

- Index = 100 → prijzen zijn gelijk aan het basisjaar
- Index = 110 → prijzen zijn 10% gestegen sinds het basisjaar
- Index = 95 → prijzen zijn 5% gedaald

Het is een manier om inflatie uit te drukken als één getal.

## Waarom bestaat de gezondheidsindex?

België heeft twee indexen:

| Index | Wat zit erin? | Waarvoor gebruikt? |
|-------|--------------|-------------------|
| **Consumptieprijsindex (CPI)** | Alles (incl. alcohol, tabak, benzine) | Algemene inflatiemeting |
| **Gezondheidsindex** | Zelfde mand, maar *zonder* alcohol, tabak en motorbrandstoffen | Lonen, uitkeringen, **huurprijzen** |

De gezondheidsindex is in 1994 ingevoerd zodat lonen en huurprijzen niet meestijgen met accijnsverhogingen op tabak en benzine. Als de overheid morgen sigaretten €2 duurder maakt, mag jouw huur daar niet door stijgen.

**De wet (Vlaams Woninghuurdecreet) zegt: huurindexatie mag enkel op basis van de gezondheidsindex.**

## Het basisjaar

Statistiekbureaus "resetten" het basisjaar periodiek zodat de getallen niet te groot of onoverzichtelijk worden:

| Basisjaar | Status |
|-----------|--------|
| 1996 = 100 | Historisch |
| 2004 = 100 | Historisch |
| **2013 = 100** | Huidige standaard voor huurcontracten |
| 2025 = 100 | Nieuw sinds januari 2026, nog niet gangbaar voor huur |

Alle huurcontracten die nu lopen gebruiken **2013 = 100** als referentie. De Statbel-huurcalculator gebruikt dit ook standaard.

## De formule

```
Geïndexeerde huur = basishuurprijs × (nieuwe index / aanvangsindex)
```

### Componenten

| Term | Betekenis |
|------|-----------|
| **Basishuurprijs** | De originele huurprijs uit het eerste contract (zonder kosten/lasten). Blijft altijd hetzelfde, ook na eerdere indexaties. |
| **Aanvangsindex** | Gezondheidsindex van de maand **vóór** de inwerkingtreding van het huurcontract. |
| **Nieuwe index** | Gezondheidsindex van de maand **vóór** de verjaardag van het contract. |

### Rekenvoorbeeld

| Gegeven | Waarde |
|---------|--------|
| Contract ingegaan | 1 september 2020 |
| Basishuurprijs | €500 |
| Aanvangsindex (aug 2020, basis 2013) | 107.89 |
| Nieuwe index (aug 2025, basis 2013) | 129.42 |

**Berekening:** €500 × (129.42 / 107.89) = **€599.81**

De huur stijgt mee met de levensduurte, maar altijd op basis van de *originele* huurprijs en de verhouding tussen twee indexcijfers.

### Wat mag geïndexeerd worden?

Volgens het Vlaams Woninghuurdecreet mag **enkel de basishuurprijs** geïndexeerd worden:

- ✅ Basishuurprijs (monthlyRent)
- ❌ Vaste kosten/lasten (fixedCosts)
- ❌ Studentenbelasting (studentTax)
- ❌ Waarborg (deposit)

## Waar komen de indexcijfers vandaan?

**Statbel** (het Belgisch statistiekbureau, FOD Economie) publiceert elke maand het nieuwe indexcijfer.

- **Website:** [statbel.fgov.be/nl/themas/consumptieprijsindex/gezondheidsindex](https://statbel.fgov.be/nl/themas/consumptieprijsindex/gezondheidsindex)
- **Huurcalculator:** [statbel.fgov.be/nl/themas/consumptieprijsindex/huurcalculator](https://statbel.fgov.be/nl/themas/consumptieprijsindex/huurcalculator)
- **Open data API (CSV):** `https://bestat.statbel.fgov.be/bestat/api/views/d9a303dc-d393-4686-8fe2-234e03a857b8/result/CSV`
- **Publicatiemoment:** rond de 28e van elke maand verschijnt het nieuwe cijfer
- **Toegang:** gratis, geen authenticatie nodig

### API-formaat

De CSV bevat kolommen: `Jaar`, `Maand`, `Niveau 1`, `Basisjaar`, `Consumptieprijsindex` (= de indexwaarde).

Filter op `Basisjaar = "2013 = 100"` en `Niveau 1 = "Gezondheidsindex"` voor de juiste waarden.

## Toepassing in KotStart

In KotStart gaan alle studentencontracten in op **1 september**. Dat betekent:

- **Aanvangsindex** = gezondheidsindex van **augustus** van het eerste schooljaar
- **Nieuwe index** = gezondheidsindex van **augustus** van het nieuwe schooljaar
- Indexatie wordt berekend bij **contractverlenging** en bij het jaarlijks bijwerken van kamerprijzen

De verhuurder kan indexatie per pand aan- of uitzetten via de Instellingen-pagina.
