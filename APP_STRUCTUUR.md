# APP_STRUCTUUR.md — KotStart

Functioneel overzicht van elke pagina/route in de KotStart-app, zodat een toekomstige sessie de app kan begrijpen zonder alle broncode te lezen. Zie `CLAUDE.md` voor architectuur, stack en conventies.

---

## DashboardPage — `/`

**Doel:** Hoofdoverzicht van alle studenten/contracten in het geselecteerde pand en schooljaar, met snelkoppelingen naar de belangrijkste acties per contract.

**Functionaliteiten:**
- Filter op pand en schooljaar (via AppShell/TopBar)
- Sorteer studentenlijst op naam of kamernummer (oplopend/aflopend)
- Per rij: knoppen voor startplaatsbeschrijving, contract verlengen, eindplaatsbeschrijving
- Startplaatsbeschrijving-knop is contextgevoelig: gaat naar het contract als al gedaan, naar de reviewpagina als een student al iets indiende, naar de delegatiepagina als delegatie aanstaat of een token al "pending"/"submitted" is, anders naar de eigen inspectiewizard
- "+ Nieuw Contract" — geblokkeerd met waarschuwing als het verhuurdersprofiel onvolledig is (link naar Account)
- Onthoudt het laatst gekozen pand in localStorage

**Data:** `getDashboardRowsData` (joint van `rooms`, `contracts`, `students`, `inspections`, `inspection_tokens`), `getProperties`, `getPropertyDelegation` (`properties.inspection_delegation`), `getLandlordProfile`/`isLandlordProfileComplete`. localStorage-key: `kotstart_dashboard_property_id`.

**Navigeert naar:** `/contracts/new` (met `propertyId`/`schoolYear` state), `/contracts/:id`, `/contracts/:id/renew`, `/inspections/new` (state `contractId`+`type: 'start'|'end'`), `/inspections/delegate` (state `contractId`), `/inspections/review/:contractId`, `/account`.

**Wordt aangeroepen vanuit:** Sidebar/Drawer ("Overzicht"), na login (`ProtectedRoute` default), na verlenging/opslaan van een contract (via `navigate('/')` fallback bij demo-modus), na afronden inspectie of goed-/afkeuring van een gedelegeerde inspectie.

---

## ContractNewPage — `/contracts/new`

**Doel:** 3-staps wizard om een nieuw huurcontract (met student(en)) aan te maken voor een vrije kamer.

**Functionaliteiten:**
- **Stap 1 (Kamer, `Step1Room`)** — kies een vrije kamer voor het gekozen pand/schooljaar; toont kamerdetails; bij een `double`-kamer worden automatisch 2 studentformulieren voorbereid
- **Stap 2 (Student, `Step2Student`)** — volledig studentformulier per student: naam, e-mail, telefoon, geboortedatum, foto, onderwijsinstelling (`InstitutionSelect`), studentennummer, faculteit, domicilie-adres, én — **enkel zichtbaar bij minderjarigheid** — voogdgegevens (naam/e-mail/telefoon). Er is geen aparte "stap 3 voor tweede partij" meer: bij een dubbele kamer worden gewoon twee `StudentForm`-blokken na elkaar getoond binnen dezelfde stap.
- **Stap 3 (Overzicht, `Step4Review`)** — controleert kamer- en studentgegevens vóór opslaan
- Automatische huurindexatie: als indexatie aanstaat voor het pand, wordt de basishuur herberekend op basis van de gezondheidsindex van het schooljaar
- `WizardLayout`/`StepIndicator` tonen voortgang, swipe-navigatie (drag) tussen stappen

**Data:** `getProperties`, `getSchoolYears` (`school_years` tabel + contractjaren), `getAvailableRoomsForNewContract` (`rooms`+`contracts`), `getPropertyIndexation` (`properties.indexation_enabled`), `getHealthIndex`/`getLatestHealthIndex` (`health_index`), `createContractDraft` (insert in `students` + Storage bucket `student-photos` + insert in `contracts` met status `draft`).

**Navigeert naar:** `/contracts/:id` (na opslaan, met state `savedDraft: true`), of terug (`navigate(-1)`).

**Wordt aangeroepen vanuit:** DashboardPage ("+ Nieuw Contract").

---

## ContractDetailPage — `/contracts/:id`

**Doel:** Centrale detailpagina van een contract: student(en)info, voortgangschecklist, contractacties en inspectiepaspoort.

**Functionaliteiten:**
- Toont student(en)foto/naam/kamer, voogdvermelding bij minderjarigheid
- Student verwijderen (met bevestigingsmodal) — verwijdert ook gekoppelde inspecties
- 3-staps voortgangschecklist: (1) Contract aangemaakt + optioneel "Concept sturen" naar student, (2) Handtekeningen verhuurder + student/voogd via `SignatureModal`, (3) Versturen naar student (genereert PDF + e-mail, zet status op `sent`)
- "Verlengen" → naar `ContractRenewPage`
- "PDF maken" → genereert en print het volledige contract-document
- Inspectiepaspoort: start- en eindplaatsbeschrijving tonen/starten/bekijken

**Data:** `getContractBundleData` (joint van `contracts`, `rooms`, `students`, `properties`, `inspections`+`inspection_items`, landlord profile), `updateContractStatus` (`contracts.status`/`signed_at`/`sent_at`), `saveConceptSentAt` (`contracts.concept_sent_at`), `sendContractEmail` (Edge Function `send-contract-email`), `deleteContractBundleData` (cascade delete `inspection_items`→`inspections`→`contracts`→`students`).

**Navigeert naar:** `/contracts/:id/renew`, `/inspections/new` (state `contractId`+`type`), `/inspections/:id` (bekijken), `/` (na verwijderen of als bundle niet gevonden wordt).

**Wordt aangeroepen vanuit:** DashboardPage (rij-klik/"Contract openen"), PropertiesPage ("Koppeling openen" bij bezette kamer), InspectionDetailPage/InspectionReviewPage (terugknop).

---

## ContractRenewPage — `/contracts/:id/renew`

**Doel:** Verlengt een bestaand contract naar het volgende schooljaar, met optionele studentgegevens-update en automatische huurindexatie.

**Functionaliteiten:**
- 2 stappen: (1) Gegevens — kamer kiezen voor het nieuwe schooljaar, huurprijs/kosten/studentenbelasting (evt. vooraf geïndexeerd), studentgegevens inklapbaar bewerken; (2) Overzicht — samenvatting vóór bevestigen
- Toont indexatieberekening in een info-tooltip (basishuur × huidige index / aanvangsindex) indien indexatie actief is voor het pand

**Data:** `getContractBundleData`, `getAvailableRoomsForRenewal`, `getPropertyIndexation`, `getHealthIndex`/`getLatestHealthIndex` (`health_index`), `updateStudentData` (`students`), `createContractRenewal` (nieuw record in `contracts`, evt. `updateRoomData` als prijzen wijzigen).

**Navigeert naar:** `/contracts/:newId` (na opslaan, state `savedDraft: true`), of `/` bij demo-modus, of terug.

**Wordt aangeroepen vanuit:** DashboardPage ("Contract verlengen"-knop per rij), ContractDetailPage ("Verlengen").

---

## InspectionNewPage — `/inspections/new`

**Doel:** Eigen (niet-gedelegeerde) plaatsbeschrijvingswizard voor de verhuurder: doorloopt alle categorieën van het pand-specifieke template en eindigt met overzichtsfoto's.

**Functionaliteiten:**
- Doorloopt dynamische categorieën (uit pand-template of standaardtemplate); per item: conditie (goed/matig/slecht/onbruikbaar), aantal (bv. sleutels) of meterstand, met verplichte foto bij "slecht"/"onbruikbaar"
- Laatste stap: 5–8 overzichtsfoto's van de ruimte
- Swipe-navigatie tussen categorieën

**Data:** `getContractBundleData`, `getInspectionCategories` (`inspection_templates.categories`, fallback `DEFAULT_INSPECTION_CATEGORIES`), `saveInspectionData` (insert `inspections` + `inspection_items`, foto's naar Storage bucket `inspection-photos`).

**Navigeert naar:** `/` (na opslaan).

**Wordt aangeroepen vanuit:** DashboardPage (start/eind-knoppen als delegatie niet actief is), ContractDetailPage (start-/eindplaatsbeschrijving starten).

---

## InspectionDetailPage — `/inspections/:id`

**Doel:** Toont een voltooide plaatsbeschrijving (start of eind), gegroepeerd per categorie, met PDF-export.

**Functionaliteiten:**
- Overzichtsfoto's tonen
- Items per categorie met conditie-badge/aantal/meterstand en itemfoto
- "PDF opmaken" — genereert en print het inspectiedocument

**Data:** `getInspectionData` (`inspections`+`inspection_items`, foto-URLs via Storage `inspection-photos`).

**Navigeert naar:** `/contracts/:contractId` (terugknop).

**Wordt aangeroepen vanuit:** ContractDetailPage (Inspectiepaspoort "Bekijken →").

---

## InspectionDelegatePage — `/inspections/delegate`

**Doel:** Verhuurder vult zelf enkel meterstanden en sleutelaantallen in en stuurt de rest van de plaatsbeschrijving als link door naar de student.

**Functionaliteiten:**
- Filtert het pand-template tot enkel `meter`- en `count`-type items, laat de verhuurder die invullen
- Genereert een tijdelijke token-link (`/inspection/student/:token`) en verstuurt die per e-mail naar de student
- Detecteert een reeds bestaand `pending`-token voor hetzelfde contract en toont dan meteen het bevestigingsscherm (voorkomt dubbele tokens)
- Bevestigingsscherm: student-e-mail, vervaldatum, kopieerbare link

**Data:** `getContractBundleData`, `getInspectionCategories`, `getInspectionTokenForContract`, `createInspectionToken` (insert `inspection_tokens` met `landlord_items`), `sendInspectionDelegationEmail` (Edge Function `send-contract-email`).

**Navigeert naar:** `/` (Dashboard, via terugknop of na versturen).

**Wordt aangeroepen vanuit:** DashboardPage (start-inspectieknop wanneer delegatiemodus `delegate` is, of wanneer een token al `pending`/`submitted` staat).

---

## InspectionReviewPage — `/inspections/review/:contractId`

**Doel:** Verhuurder beoordeelt een door de student ingevulde (gedelegeerde) plaatsbeschrijving vóór definitieve goedkeuring.

**Functionaliteiten:**
- Toont overzichtsfoto's, studentitems per categorie (conditie + foto) en de eerder door de verhuurder ingevulde meterstanden/sleutels
- "Goedkeuren" → maakt de definitieve `inspections`/`inspection_items`-records aan
- "Afwijzen" → markeert het token als `rejected` en genereert een nieuw token (student moet opnieuw invullen)

**Data:** `getInspectionTokenForContract`, `getContractBundleData`, `approveInspectionToken` (insert `inspections`+`inspection_items`, update `inspection_tokens.status = 'approved'`), `rejectInspectionToken` (update oud token naar `rejected`, insert nieuw token).

**Navigeert naar:** `/contracts/:contractId` (terugknop), `/` (na goed-/afkeuren).

**Wordt aangeroepen vanuit:** DashboardPage (start-inspectieknop wanneer tokenstatus `submitted` is).

---

## InspectionStudentPage — `/inspection/student/:token`

**Doel:** Publieke (niet-ingelogde) pagina waarmee een student via een token-link zelf de plaatsbeschrijving invult, buiten de normale app-navigatie om.

**Functionaliteiten:**
- Valideert het token rechtstreeks bij een Supabase Edge Function (`inspection-token-validate`) — toont foutmeldingen bij verlopen (410), reeds ingediend (409) of ongeldige link
- Doorloopt categorieën met enkel conditie-keuze (geen meterstanden/sleutels — die vult de verhuurder al in via delegatie) + verplichte foto bij slechte conditie
- Laatste stap: 5–8 overzichtsfoto's
- Dient in via Edge Function `inspection-token-submit`; toont bevestigingsscherm bij succes

**Data:** Roept rechtstreeks de Edge Functions `inspection-token-validate` en `inspection-token-submit` aan (niet via `src/lib/data.ts`) — geen directe Supabase-tabeltoegang vanuit de frontend.

**Navigeert naar:** Geen (losstaande pagina, geen AppShell/navigatie).

**Wordt aangeroepen vanuit:** E-mail-link verstuurd door `InspectionDelegatePage` (`sendInspectionDelegationEmail`).

---

## PropertiesPage — `/properties`

**Doel:** Beheer van panden en kamers: aanmaken, bewerken, verwijderen, bezetting bekijken, huurindexatie per kamer inzien.

**Functionaliteiten:**
- Pandenlijst met kamer-aantal, bezet/vrij-telling, indexatie-badge
- Pand aanmaken/bewerken (naam, adres) via modal
- Binnen een pand: kamer toevoegen/bewerken/verwijderen (kamernummer, type, huur, kosten, waarborg) — verwijderen geblokkeerd als er een contract aan hangt
- Schooljaarfilter per pand (incl. "volgend schooljaar toevoegen")
- Per kamer: bezettingsstatus (vrij/concept/verstuurd/ondertekend) met snelkoppeling naar het contract
- Indexatie-tooltip per kamer toont de berekening (basishuur × huidige index / aanvangsindex)

**Data:** `getProperties`, `getRooms`, `getContracts`, `getStudents`, `getSchoolYears`, `getHealthIndex`/`getLatestHealthIndex` (`health_index`), `createPropertyData`/`updatePropertyData` (`properties`), `createRoomData`/`updateRoomData`/`deleteRoomData` (`rooms`), `addSchoolYear` (`school_years`).

**Navigeert naar:** `/contracts/:id` ("Koppeling openen" bij bezette kamer).

**Wordt aangeroepen vanuit:** Sidebar/Drawer ("Panden").

---

## AccountPage — `/account`

**Doel:** Verhuurder beheert het profiel dat op het huurcontract komt, plus accountgegevens (login-e-mail, wachtwoord) en uitloggen.

**Functionaliteiten:**
- Profielformulier: naam (readonly), adres, telefoon, contract-e-mailadres, IBAN (met landkeuze en validatie op lengte)
- Login-e-mailadres wijzigen (met bevestigingsmail-flow via Supabase Auth)
- Wachtwoord wijzigen
- Uitloggen

**Data:** `getLandlordProfile`/`saveLandlordProfile` (RPC's `get_landlord_profile`/`save_landlord_profile`, fallback localStorage-key `kotstart_landlord_profile`), `useAuth().updateEmail`/`updatePassword`/`signOut` (Supabase Auth, geen custom tabel).

**Navigeert naar:** `/login` (na uitloggen).

**Wordt aangeroepen vanuit:** Sidebar/Drawer ("Account"), DashboardPage (profielwaarschuwing-knop "Ga naar Account").

---

## SettingsPage — `/settings`

**Doel:** Per-pand instellingen: plaatsbeschrijvingstemplate personaliseren, delegatiemodus kiezen, huurindexatie aan-/uitzetten.

**Functionaliteiten:**
- Pand kiezen, dan:
  - Delegatiemodus: "Samen met student" vs. "Uitbesteden aan student" (bepaalt gedrag van de start-inspectieknop op het Dashboard)
  - Huurindexatie aan/uit per pand (toggle)
  - Plaatsbeschrijvingscategorieën volledig bewerkbaar: categorieën/items toevoegen, hernoemen, herordenen, verwijderen; itemtype instellen (conditie/aantal/meterstand + eenheid kWh/m³)
  - "Reset naar standaard" (met bevestigingsmodal)

**Data:** `getProperties`, `getInspectionCategories`/`saveInspectionCategories` (`inspection_templates.categories`), `getPropertyDelegation`/`savePropertyDelegation` (`properties.inspection_delegation`), `getPropertyIndexation`/`savePropertyIndexation` (`properties.indexation_enabled`).

**Navigeert naar:** Geen (blijft op dezelfde pagina; "Ander pand" gaat terug naar de pandkeuze binnen dezelfde route).

**Wordt aangeroepen vanuit:** Sidebar/Drawer ("Instellingen").

---

## LoginPage — `/login`

**Doel:** Login, registratie en "wachtwoord vergeten" in één pagina (drie modi).

**Functionaliteiten:**
- Inloggen (e-mail/wachtwoord)
- Account aanmaken (verstuurt verificatiemail)
- Wachtwoord vergeten (verstuurt reset-link)
- Vertaalt Supabase Auth-foutmeldingen naar begrijpelijke Nederlandse tekst

**Data:** Geen directe tabeltoegang — enkel Supabase Auth via `useAuth()` (`signIn`, `signUp`, `resetPassword`).

**Navigeert naar:** `/` (automatisch via `<Navigate>` zodra `user` bestaat).

**Wordt aangeroepen vanuit:** `ProtectedRoute` (redirect wanneer niet ingelogd), AccountPage (na uitloggen).

---

## ResetPasswordPage — `/reset-password`

**Doel:** Landingspagina vanuit de wachtwoord-reset-e-mail; stelt een nieuw wachtwoord in.

**Functionaliteiten:**
- Herstelt de Supabase-sessie uit de reset-link (via `code`-query-param of `access_token`-hash)
- Toont foutmelding bij ongeldige/verlopen link of demo-modus (Supabase niet geconfigureerd)
- Nieuw wachtwoord + bevestiging invullen, minimaal 6 tekens

**Data:** Supabase Auth rechtstreeks (`supabase.auth.getSession`, `exchangeCodeForSession`) + `useAuth().updatePassword`.

**Navigeert naar:** `/` (na succesvolle reset, na 2s), `/login` (bij ongeldige link).

**Wordt aangeroepen vanuit:** Reset-link in de e-mail die `resetPassword()` (LoginPage, "forgot"-modus) verstuurt.

---

## Gedeelde componenten

- **AppShell** (`components/layout/AppShell.tsx`) — omhult elke ingelogde pagina met `Drawer` + `TopBar`; beheert schooljaar-toevoegen-logica. Gebruikt door: DashboardPage, PropertiesPage, AccountPage, SettingsPage.
- **Sidebar** (`components/layout/Sidebar.tsx`) — inklapbare desktop-navigatie (Overzicht/Panden/Account/Instellingen). Losstaand van AppShell (niet overal ingeplugd — zie ook Drawer voor mobiel).
- **TopBar** (`components/layout/TopBar.tsx`) — mobiele bovenbalk met hamburgermenu-knop en schooljaar-/pandfilters (`FilterDropdown`). Gebruikt door AppShell.
- **Drawer** (`components/layout/Drawer.tsx`) — mobiel uitschuifmenu (Overzicht/Panden/Account/Instellingen), geopend via TopBar's menu-knop. Gebruikt door AppShell.
- **ProtectedRoute** (`components/ProtectedRoute.tsx`) — stuurt niet-ingelogde gebruikers door naar `/login`; toont laadscherm tijdens auth-check. Omhult alle routes behalve `/login`, `/reset-password`, `/inspection/student/:token`.
- **SignatureModal** (`components/SignatureModal.tsx`) — handtekeningpad (canvas, via `signature_pad`) voor verhuurder én student/voogd; geeft twee data-URL's terug. Gebruikt door ContractDetailPage.
- **InstitutionSelect** (`components/InstitutionSelect.tsx`) — doorzoekbare dropdown van Vlaamse onderwijsinstellingen met "Andere…"-optie voor vrije tekst. Gebruikt door Step2Student.
- **FilterDropdown** (`components/ui/FilterDropdown.tsx`) — generieke dropdown met optionele extra actie (bv. "+ volgend schooljaar"). Gebruikt door TopBar, AccountPage (IBAN-land), PropertiesPage (schooljaar per pand).
- **AuthContext / AuthProvider** (`contexts/AuthContext.tsx`, `contexts/AuthProvider.tsx`) — houdt de Supabase Auth-gebruiker bij, biedt `signIn`/`signUp`/`signInWithGoogle`/`signOut`/`updateEmail`/`updatePassword`/`resetPassword`; valt terug op een vaste `DEMO_USER` wanneer Supabase niet geconfigureerd is. Gebruikt via `useAuth()` door LoginPage, ResetPasswordPage, AccountPage, ProtectedRoute.

---

## Nieuwe/onvermelde routes en features t.o.v. CLAUDE.md

Puur informatief — CLAUDE.md van dit project is op deze punten verouderd (niet aangepast als onderdeel van deze taak):

- **Authenticatie is nu volwaardig geïmplementeerd**: `LoginPage` (`/login`, met login/registratie/wachtwoord-vergeten in één pagina) en `ResetPasswordPage` (`/reset-password`) bestaan, incl. Google OAuth-optie (`signInWithGoogle`) en e-mail-/wachtwoordwijziging vanuit `AccountPage`. CLAUDE.md vermeldt enkel dat `ProtectedRoute` redirect naar `/login` zonder de pagina zelf te documenteren.
- **Plaatsbeschrijving-delegatiesysteem**: volledig nieuw subsysteem met `InspectionDelegatePage` (`/inspections/delegate`), `InspectionReviewPage` (`/inspections/review/:contractId`) en de publieke `InspectionStudentPage` (`/inspection/student/:token`). Draait op een `inspection_tokens`-tabel en twee Supabase Edge Functions (`inspection-token-validate`, `inspection-token-submit`) die niet in CLAUDE.md staan.
- **Huurindexatie**: nieuw systeem gekoppeld aan een `health_index`-tabel (gezondheidsindex per jaar/maand) en `properties.indexation_enabled` + `rooms.base_rent`/`base_rent_year`. Beïnvloedt ContractNewPage, ContractRenewPage en PropertiesPage. Niet vermeld in CLAUDE.md.
- **Voogd/minderjarigheid**: `Student` heeft nu `guardianName`/`guardianEmail`/`guardianPhone`; bij minderjarige studenten (`isMinor`) worden voogdgegevens verplicht gevraagd in de wizard en tekent de voogd i.p.v. de student in `SignatureModal`. Niet in CLAUDE.md.
- **Domicilie-/studiegegevens per student**: `institution`, `faculty`, `studentNumber`, `residenceStreet/Number/Box/PostalCode/City` zijn nieuwe verplichte/optionele velden op `Student`, ondersteund door het nieuwe `InstitutionSelect`-component. Niet in CLAUDE.md.
- **Concept-fase in het contractproces**: `ContractDetailPage` heeft nu een aparte "Concept sturen"-actie (`concept_sent_at`) vóór de handtekeningfase, naast de bestaande 3 stappen die CLAUDE.md al documenteerde.
- **Contractverlenging met huurprijs-override**: `monthlyRent`/`fixedCosts`/`studentTax` kunnen nu per contract afwijken van de kamer (`contracts.monthly_rent` etc.), t.b.v. indexatie bij verlenging — niet vermeld in CLAUDE.md's datamodel-sectie.
- **Wizard is 3 stappen, niet 4**: CLAUDE.md's `pages/wizard/` bestandslijst noemt nog een aparte `Step3SecondParty.tsx` — dat bestand bestaat niet meer. De huidige wizard (`ContractNewPage`) heeft stappen Kamer → Student → Overzicht; een tweede huurder bij een dubbele kamer wordt afgehandeld door twee `StudentForm`-blokken binnen Step2Student, niet door een aparte stap.
- **Instellingenpagina uitgebreid**: `SettingsPage` bevat nu ook de delegatiemodus-keuze en de indexatie-toggle per pand, niet enkel het bewerken van plaatsbeschrijvingscategorieën zoals CLAUDE.md suggereert.
