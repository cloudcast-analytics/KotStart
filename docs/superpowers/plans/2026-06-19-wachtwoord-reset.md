# Implementatieplan: Wachtwoord vergeten / reset flow (N9)

**Datum:** 2026-06-19
**Branch:** `staging`
**Scope:** 4 bestanden wijzigen, 1 nieuw bestand, tests toevoegen

## Overzicht

Gebruikers kunnen via de loginpagina een "Wachtwoord vergeten?" link klikken, hun e-mail invullen,
een reset-link per e-mail ontvangen, en via die link een nieuw wachtwoord instellen op een
`/reset-password` pagina.

## Taken

### Taak 1 — `resetPassword` toevoegen aan AuthContext + AuthProvider

**Bestanden:** `src/contexts/AuthContext.tsx`, `src/contexts/AuthProvider.tsx`

1. `AuthContext.tsx`: voeg `resetPassword?: (email: string) => Promise<void>` toe aan de interface
   en de default context
2. `AuthProvider.tsx`: implementeer `resetPassword` als `isSupabaseConfigured`-gated functie:
   ```ts
   const resetPassword = isSupabaseConfigured
     ? async (email: string) => {
         const { error } = await supabase.auth.resetPasswordForEmail(email, {
           redirectTo: `${window.location.origin}/reset-password`,
         })
         if (error) throw error
       }
     : undefined
   ```
3. Voeg `resetPassword` toe aan de `AuthContext.Provider` value

### Taak 2 — "Wachtwoord vergeten?" mode toevoegen aan LoginPage

**Bestand:** `src/pages/LoginPage.tsx`

1. Breid de `mode` state uit naar `'login' | 'register' | 'forgot'`
2. Haal `resetPassword` uit `useAuth()`
3. Bij `mode === 'forgot'`:
   - Toon alleen het e-mailveld (verberg wachtwoordveld)
   - Submit-knop: "Verstuur reset-link"
   - `handleSubmit` roept `resetPassword(email)` aan
   - Na succes: toon bevestigingsbericht "Check je inbox voor een reset-link"
   - Terug-link naar login mode
4. Voeg een "Wachtwoord vergeten?" link toe onder het wachtwoordveld (alleen in `mode === 'login'`)
5. Voeg foutafhandeling toe aan `authErrorMessage()` voor reset-gerelateerde fouten

### Taak 3 — ResetPasswordPage aanmaken

**Bestand:** `src/pages/ResetPasswordPage.tsx` (nieuw)

1. Twee inputvelden: "Nieuw wachtwoord" en "Bevestig wachtwoord"
2. Client-side validatie: wachtwoorden moeten overeenkomen
3. Submit roept `updatePassword(newPassword)` aan via `useAuth()`
4. Na succes: toon bevestiging + redirect naar `/` (dashboard) na 2 seconden
5. Stijl: zelfde kaart-layout als LoginPage (glasmorfisme, `rounded-3xl`, etc.)
6. Als `updatePassword` undefined is (demo-modus): toon melding dat dit niet beschikbaar is

### Taak 4 — Route + PASSWORD_RECOVERY event handling

**Bestanden:** `src/App.tsx`, `src/contexts/AuthProvider.tsx`

1. `App.tsx`: voeg route toe: `<Route path="/reset-password" element={<ResetPasswordPage />} />`
   (geen ProtectedRoute — de gebruiker is nog niet ingelogd wanneer ze via de link komen, maar
   Supabase zet automatisch een sessie bij het openen van de recovery link)
2. `AuthProvider.tsx`: breid `onAuthStateChange` uit om het `PASSWORD_RECOVERY` event te detecteren.
   Wanneer dit event binnenkomt, navigeer naar `/reset-password`. Voeg hiervoor een optionele
   `onPasswordRecovery` callback toe, of gebruik `window.location` redirect als de provider geen
   router-context heeft.

### Taak 5 — Tests

**Bestanden:** `src/__tests__/LoginPage.test.tsx`, `src/__tests__/ResetPasswordPage.test.tsx` (nieuw)

LoginPage tests toevoegen:
1. "Wachtwoord vergeten?" link zichtbaar in login mode
2. Klik op "Wachtwoord vergeten?" → toont e-mailveld zonder wachtwoordveld
3. Submit roept `resetPassword` aan met het ingevoerde e-mailadres
4. Na succes: bevestigingsbericht zichtbaar
5. "Wachtwoord vergeten?" link NIET zichtbaar als `resetPassword` undefined (demo-modus)

ResetPasswordPage tests:
1. Toont twee wachtwoordvelden
2. Foutmelding als wachtwoorden niet overeenkomen
3. Submit roept `updatePassword` aan
4. Demo-modus: toont "niet beschikbaar" melding

### Taak 6 — Supabase dashboard check

Controleer dat de Supabase "Reset password" e-mail template correct is geconfigureerd en dat
`/reset-password` in de Redirect URLs allowlist staat (beide projecten).

## Volgorde

Taak 1 → Taak 2 → Taak 3 → Taak 4 → Taak 5 → Taak 6

## Niet in scope

- Custom e-mail template styling (Supabase default is voldoende voor nu)
- Rate limiting op de reset-aanvraag (Supabase handelt dit intern af)
- Wachtwoordsterkte-indicator (eventueel later)
