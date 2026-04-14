

# Review & Refinement: Auth Flow

## Issues Found

### 1. Password Reset Flow is Broken
`ForgotPassword.tsx` uses `redirectTo: .../forgot-password?code=` but Supabase recovery flow uses URL hash fragments (`#access_token=...&type=recovery`), not query params. The page never detects the recovery session, so `updateUser` fails because there's no active session.

**Fix**: Use a dedicated `/reset-password` route. After clicking the email link, Supabase sets the session automatically via hash. The reset page should detect `type=recovery` from the hash and show the new password form.

### 2. Verify Code Step in ForgotPassword is Fake
`handleVerifyCode` (line 65-83) doesn't actually verify anything — it just sets the code as a token and moves to the next step. This is misleading.

**Fix**: Remove the manual code verification step. Supabase recovery uses link-based flow — the user clicks the link, gets redirected with a session, and can then update their password.

### 3. Driver Login Redirects Before Role is Loaded
In `DriverAuth.tsx` line 97, after successful `signIn`, it immediately calls `navigate("/driver")`. But the role hasn't been fetched yet, so `ProtectedRoute` may redirect to `/forbidden` briefly.

**Fix**: Remove the manual `navigate("/driver")` on line 97. The `useEffect` on line 24-36 already handles redirect once `role === "moderator"` is set.

### 4. User Auth Page — No Role-Based Redirect for Drivers
If a driver logs in on the user auth page (`/auth`), the redirect logic (line 29-33) only checks for `admin`. A driver logging in here would be sent to `/` instead of `/driver`.

**Fix**: Add `moderator` check to redirect drivers to `/driver`.

### 5. App Layout Routes Not Protected
Routes like `/wallet`, `/profile`, `/ride` are inside `AppLayout` but not behind `ProtectedRoute`. Any unauthenticated user can access them (they'll just see empty data or errors).

**Fix**: Wrap authenticated-only routes (`/wallet`, `/profile`) with `ProtectedRoute`. Keep `/ride`, `/shuttle`, `/hotel` accessible (they handle guest state internally).

### 6. No `/reset-password` Route Exists
The app has no dedicated reset-password page, which is required for proper Supabase password recovery flow.

**Fix**: Create `/reset-password` route that handles the recovery session from URL hash.

---

## Changes

### 1. Create `src/pages/ResetPassword.tsx`
- New page that detects `type=recovery` from URL hash
- Shows new password + confirm password form
- Calls `supabase.auth.updateUser({ password })` (session is already active from the recovery link)
- Redirects to `/auth` on success

### 2. Update `src/pages/ForgotPassword.tsx`
- Simplify to email-only step — remove the broken verify/reset steps
- Update `redirectTo` to `window.location.origin + '/reset-password'`
- Show success message after email is sent

### 3. Update `src/pages/Auth.tsx`
- Add `moderator` role check in redirect `useEffect` → navigate to `/driver`

### 4. Update `src/pages/driver/DriverAuth.tsx`
- Remove `navigate("/driver")` on line 97 (duplicate of useEffect redirect)

### 5. Update `src/App.tsx`
- Add `/reset-password` route
- Wrap `/wallet` and `/profile` routes with `ProtectedRoute`

No database changes required.

| File | Change |
|------|--------|
| `src/pages/ResetPassword.tsx` | New — proper password reset page |
| `src/pages/ForgotPassword.tsx` | Simplify to email-only, fix redirectTo |
| `src/pages/Auth.tsx` | Add driver role redirect |
| `src/pages/driver/DriverAuth.tsx` | Remove duplicate navigate |
| `src/App.tsx` | Add reset-password route, protect wallet/profile |

