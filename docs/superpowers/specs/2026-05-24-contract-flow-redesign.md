# Contract Flow Redesign — Design Spec

**Date:** 2026-05-24

## Context

The current contract creation wizard ends with a "Contract versturen" button, but at that point:
- No start inspection has been done
- No landlord signature has been added

This is legally unsafe for Belgian student rentals (Vlaams Woninghuurdecreet), where the plaatsbeschrijving must be done contradictorily (both parties present) before signing. The current UI also merges signing and sending into a single action, making the flow opaque.

## Goal

Enforce the legally correct order of operations without removing flexibility (saving a draft and coming back later must remain possible):

```
1. Contract aanmaken  →  opslaan als concept
2. Startplaatsbeschrijving doen  (samen met student)
3. Handtekening verhuurder
4. Versturen naar student
```

## Design

### 1. Wizard — stap 4 (Review)

The final button changes from **"Contract versturen"** to **"Opslaan als concept"**.

Below the button, a small subtitle:
> *"Je kan daarna de plaatsbeschrijving doen en ondertekenen."*

After saving, the user navigates directly to the `ContractDetailPage` for the new contract. No email is sent at this point.

### 2. ContractDetailPage — Voortgangschecklist

Replace the current status timeline (Concept → Verstuurd → Ondertekend) and the "Ondertekenen & versturen" action button with a **Voortgangschecklist** at the top of the page.

#### Visual

```
VOORTGANG

✅ Contract aangemaakt        24 mei 2026
○  Startplaatsbeschrijving   [ Starten → ]
○  Handtekening verhuurder   (beschikbaar na plaatsbeschrijving)
○  Versturen naar student    (beschikbaar na handtekening)
```

When all steps are done:

```
VOORTGANG

✅ Contract aangemaakt        24 mei 2026
✅ Startplaatsbeschrijving    15 sep 2025   [ Bekijken → ]
✅ Handtekening verhuurder    15 sep 2025
✅ Verstuurd naar student     15 sep 2025
```

#### Step rules

| Stap | Beschikbaar wanneer | Actie | Na voltooiing |
|------|---------------------|-------|---------------|
| Contract aangemaakt | Altijd | — | Groen + datum |
| Startplaatsbeschrijving | Altijd | Navigeer naar `/inspections/new` | Groen + datum + "Bekijken →" |
| Handtekening verhuurder | `startInspection` bestaat | Open `SignatureModal` | Groen + datum |
| Versturen naar student | `contract.status === 'signed'` | Stuur e-mail, status → `sent` | Groen + datum |

#### Status model

The current status order `draft → sent → signed` is semantically wrong (sent before signed). New order:

| Status | Betekenis |
|--------|-----------|
| `draft` | Contract aangemaakt, nog niet ondertekend |
| `signed` | Verhuurder heeft ondertekend, nog niet verstuurd |
| `sent` | Verstuurd naar student |

The status field values in the database stay the same (`draft`, `signed`, `sent`) — only the semantic order and UI change.

### 3. Secundaire acties

"Verlengen" and "PDF maken" remain available as secondary action buttons (less prominent, below the checklist or in a separate action bar). "Ondertekenen & versturen" is removed as a standalone button.

### 4. Inspectiepaspoort section

The Inspectiepaspoort section at the bottom of the page **only shows the Einde row**. The Start row is removed from this section — it is now represented exclusively in the voortgangschecklist (step 2). This avoids showing the same action in two places.

The Einde row remains unchanged: "Nog niet gedaan" + "Starten" when absent, date + "Bekijken →" when done. It is independent of the checklist and does not block any step.

## Out of scope

- Student countersignature flow (student signing back)
- Editing or deleting a saved contract
- Sending a draft preview to the student before signing
