# Technische uitleg KotStart — voor niet-technische ondernemers

> **Geschreven voor:** Geert (kotbaas) en Arrya — geen technische voorkennis vereist.
> **Datum:** mei 2026

---

## De grote lijn in één zin

KotStart is een webapp die in je browser draait, je gegevens opslaat in een online database, en automatisch e-mails verstuurt — allemaal via afzonderlijke gespecialiseerde diensten die met elkaar praten.

---

## Onderdeel 1 — React + Vite + TypeScript (de app zelf)

### Wat is het en wat doet het?
Dit is de eigenlijke app die je op je scherm ziet: de knoppen, de lijsten, de formulieren. React bouwt de interface op, Vite zorgt dat alles snel laadt, en TypeScript is een "striktere" versie van JavaScript die fouten vroeg opspoort.

Vergelijk het met de buitenkant van een winkel: de etalage, de kassa, de inrichting — alles wat de klant ziet en aanraakt.

### Waarom dit gekozen?
React is de meest gebruikte interface-technologie ter wereld. Alternatieven zijn Vue.js of Angular, maar React heeft het grootste ecosysteem (meer plugins, meer developers, meer hulp online). TypeScript voorkomt een hele categorie bugs nog voor je de app publiceert.

### Wat als we dit weghalen?
Dan is er geen app. Dit is de kern.

### Hoe praat het met de rest?
- Stuurt vragen naar **Supabase** ("geef me de lijst studenten")
- Toont de antwoorden in de interface
- Vraagt Supabase om een e-mail te versturen na het aanmaken van een contract

---

## Onderdeel 2 — Supabase (database + login + serverlogica)

### Wat is het en wat doet het?
Supabase is drie dingen tegelijk:

1. **Database**: alle gegevens worden hier opgeslagen — studenten, kamers, contracten, plaatsbeschrijvingen. Denk aan een grote, veilige Excel-tabel in de cloud.
2. **Authenticatie**: het login-systeem. Zorgt dat alleen jij als verhuurder bij de data kan.
3. **Edge Functions**: kleine stukjes servercode die taken uitvoeren die de browser niet zelf mag doen, zoals e-mails versturen met een geheime API-sleutel.

### Waarom dit gekozen?
Het alternatief zou zijn: een aparte database (bijv. PostgreSQL), een aparte login-dienst (bijv. Auth0), en een aparte server (bijv. Node.js op een VPS) zelf opzetten en onderhouden. Supabase bundelt dit alles en heeft een gratis tier. Voor een startende app is dat ideaal.

### Wat als we dit weghalen?
Geen dataopslag, geen login, geen e-mailversturen. De app werkt dan alleen met demo-data en slaat niets op.

### Hoe praat het met de rest?
- Ontvangt vragen van de **React app** (bijv. "sla dit contract op")
- Roept **Resend** aan vanuit Edge Functions om e-mails te sturen
- Stuurt bestanden (foto's plaatsbeschrijving) op naar zijn eigen opslag (Storage Buckets)

---

## Onderdeel 3 — Resend (e-mail versturen)

### Wat is het en wat doet het?
Resend is een dienst die professionele e-mails verstuurt namens jouw domein (bijv. info@cloudcast-analytics.com). Het zorgt dat e-mails niet in de spam belanden en dat je kunt zien of ze zijn aangekomen.

Vergelijk het met een professioneel postbedrijf: je geeft het de brief en het adres, zij zorgen voor de bezorging met track & trace.

### Waarom dit gekozen?
Gewone e-mail (SMTP via Gmail of Outlook) werkt niet betrouwbaar voor geautomatiseerde e-mails vanuit apps — ze komen bijna altijd in spam. Alternatieven voor Resend zijn SendGrid of Mailgun, maar Resend heeft de eenvoudigste API en een genereuze gratis tier (3.000 e-mails/maand).

### Wat als we dit weghalen?
Contracten kunnen niet meer automatisch per e-mail verstuurd worden. Je zou ze manueel moeten kopiëren en versturen.

### Hoe praat het met de rest?
- Ontvangt opdrachten van **Supabase Edge Functions** ("stuur deze HTML als e-mail naar dit adres")
- Levert e-mails af bij de ontvanger (student, ouder, medeverhuurder)
- Heeft geen directe verbinding met de React app (om veiligheidsredenen: de API-sleutel mag niet in de browser zitten)

---

## Onderdeel 4 — Railway (hosting)

### Wat is het en wat doet het?
Railway is de plek waar de app "leeft" op het internet. Wanneer iemand naar de URL van KotStart surft, levert Railway de app-bestanden aan de browser van de gebruiker.

Vergelijk het met het gebouw waar je winkel in zit: het gebouw huurt je, maar de winkelinrichting (React) breng je zelf mee.

### Waarom dit gekozen?
Alternatieven zijn Vercel of Netlify (ook populair voor React-apps) of een eigen server. Railway is gekozen omdat je er al een account had en het ook server-side code aankan (nuttig voor de Node.js-server die de app serveert).

### Wat als we dit weghalen?
De app is niet meer bereikbaar via internet. Je kunt hem alleen nog lokaal op je eigen computer draaien.

### Hoe praat het met de rest?
- Ontvangt de gebouwde app-bestanden van GitHub (bij elke push automatisch)
- Levert die bestanden aan de browser van de gebruiker
- Heeft zelf geen directe verbinding met Supabase of Resend — dat regelt de app zelf in de browser

---

## Onderdeel 5 — DNS-records bij one.com (DKIM, SPF, MX)

### Wat is het en wat doet het?
DNS is het "telefoonboek van het internet": het koppelt jouw domeinnaam (cloudcast-analytics.com) aan IP-adressen en instellingen. DKIM, SPF en MX zijn specifieke DNS-instellingen die e-mailproviders vertellen: "e-mails van dit domein zijn echt, geen spam".

- **SPF**: lijst van servers die e-mail mogen sturen namens jouw domein
- **DKIM**: een digitale handtekening die bewijst dat de e-mail niet is nagemaakt
- **MX**: zegt waar inkomende e-mail naartoe moet

### Waarom dit gekozen?
Zonder deze records weigeren Gmail, Outlook en andere providers je e-mails of plaatsen ze in spam. Het is een technische vereiste voor professioneel e-mailgebruik, geen keuze.

### Wat als we dit weghalen?
E-mails van KotStart komen bijna altijd in spam bij de ontvangers.

### Hoe praat het met de rest?
- one.com beheert de DNS-records voor cloudcast-analytics.com
- Resend geeft je de exacte records die je bij one.com moet invoeren
- Na verificatie mag Resend e-mails sturen "namens" cloudcast-analytics.com

---

## Diagram: Hoe een gebruiker een contract verstuurt

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GEBRUIKER (Geert, kotbaas)                         │
│                     Opent KotStart in zijn browser                          │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ Surft naar https://kotstart-demo.railway.app
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (hosting)                                   │
│              Levert de app-bestanden aan de browser                         │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ App laadt in browser
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REACT APP (in de browser van Geert)                      │
│                                                                             │
│  Geert vult de contractwizard in:                                           │
│  stap 1: kamer kiezen                                                       │
│  stap 2: studentgegevens invullen                                           │
│  stap 3: tweede partij (ouder/medehuurder)                                  │
│  stap 4: overzicht → klikt "Opslaan als concept"                            │
│                                                                             │
│  Op de contractpagina doorloopt Geert de voortgangschecklist:               │
│  ✅ Contract aangemaakt                                                      │
│  → Startplaatsbeschrijving doen (samen met student)                         │
│  → Handtekening verhuurder zetten (canvas)                                  │
│  → Versturen naar student (e-mail met PDF)                                  │
└────────────────────┬──────────────────────────────────────────────────────┘
                     │ API-aanroepen: "sla contract op", later "stuur e-mail"
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                            │
│                                                                             │
│  [1] Database                                                               │
│      → Slaat contract op in tabel 'contracts'                               │
│      → Slaat student op in tabel 'students'                                 │
│      → Koppelt kamer, pand, schooljaar                                      │
│                                                                             │
│  [2] Storage                                                                │
│      → Bewaart studentfoto's en inspectiefotos                              │
│                                                                             │
│  [3] Edge Function: send-contract-email                                     │
│      → Genereert de HTML van het contract                                   │
│      → Roept Resend aan met RESEND_API_KEY (geheime sleutel)                │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │ API-aanroep: "verstuur deze e-mail"
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESEND                                              │
│                                                                             │
│  Ontvangt de e-mail-opdracht                                                │
│  Controleert DKIM/SPF via DNS van cloudcast-analytics.com                   │
│  Verstuurt de e-mail met het contract als bijlage/HTML                      │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │ E-mail bezorgd
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STUDENT / OUDER / MEDEVERHUURDER                         │
│              Ontvangt e-mail in Gmail/Outlook/etc.                          │
│              E-mail komt NIET in spam dankzij DKIM+SPF bij one.com          │
└─────────────────────────────────────────────────────────────────────────────┘


DNS-flow (eenmalig, op de achtergrond):
────────────────────────────────────────
cloudcast-analytics.com (one.com)
        │
        ├── SPF-record  ──► "Resend-servers mogen mailen namens dit domein"
        ├── DKIM-record ──► "Resend's handtekening is authentiek"
        └── MX-record   ──► "Inkomende mail gaat naar Microsoft 365/Gmail/..."
```

---

## Samenvatting in één tabel

| Onderdeel | Rol | Waar draait het? | Gratis tier? |
|---|---|---|---|
| React + Vite | Interface (wat je ziet) | Browser van de gebruiker | Ja (open source) |
| Supabase | Database + login + serverlogica | Supabase cloud | Ja (500MB, 50.000 rijen) |
| Resend | E-mail versturen | Resend cloud | Ja (3.000/maand) |
| Railway | App hosten op internet | Railway cloud | Ja (beperkt) |
| one.com DNS | Domein + e-mailverificatie | one.com | Betaald (jouw domein) |

---

*Vragen? Arrya legt het graag verder uit.*
