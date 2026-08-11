# Frontend structure

React + TypeScript + Vite + Tailwind. Routing is a plain `useState` switch in
`src/App.tsx` — no react-router — so "adding a page" means adding a `view`
value and an `import`, not a route file.

```
src/
  App.tsx           the router: a useState<'view'> switch, one branch per page
  main.tsx          entry point
  features/         current convention — one folder per product, self-contained
    <feature>/
      <Feature>Page.tsx     top-level screen(s), exported via index.ts
      <Feature>Shared.tsx   API base URL, session helpers, shared UI
                             primitives, the feature's RP_STYLES-style CSS
      index.ts               barrel export used by App.tsx
  Components/       pre-features/ shared components, still actively used —
                     see "Legacy layout" below
  Services/          shared API helpers used by Components/ProgressReport/*
  utils/              small standalone helpers (certificate/scorecard generation)
```

**Where does a given product live?**

| Product | Folder | Backend app |
|---|---|---|
| Data Extractor / hub | `features/extractor` | `user_management` |
| Performance | `features/performance` | `performance` |
| Appraisal | `features/appraisal` | `appraisal` |
| Employee of the Month | `features/eom` | `eom` |
| PMS Simulator | `features/pms` | `pms` |
| Letters Generator (appraisal + warning letters) | `features/letters` | `pms` |
| TA/DA | `features/tada` | `tada` |
| SalesIQ | `features/salesiq` | `sales` |
| AdminPulse (rooms + admin item requests) | `features/roompulse` | `roompulse` |

## Legacy layout — `Components/`, `Services/`, `utils/`

These predate the `features/` convention and are still imported by
`ProgressReport`, `Appraisal`, `EOM`, `Performance` and the extractor hub —
**they are not dead code**, just an older pattern. New work should go in
`features/<name>/`; don't add new files to `Components/` unless you're
extending something that already lives there. Folding these into `features/`
properly is a known follow-up, not done yet because it touches several
actively-used import paths at once.

## Conventions

- **One feature = one folder under `features/`.** Keep a feature's API calls,
  types, and shared UI in its own `*Shared.tsx`; don't reach into another
  feature's internals.
- **Django app names and product/brand names may diverge.** `pms` hosts the
  unrelated "Letters Generator"; `roompulse` hosts the "AdminPulse" brand.
  Match the folder name to the *backend app*, not the marketing name, so the
  API base URL and the folder always line up.
- **Every privileged/role-gated screen re-checks its role server-side.**
  There's no server session in several features (AdminPulse, SalesIQ) — the
  "session" is a client-remembered email after OTP verification. Never trust
  a client-sent role; the backend re-resolves it from email on every request.
- **React hooks never move relative to a conditional return.** A `useMemo`
  placed after an early `return <Login/>` breaks the hook-count invariant the
  instant the user logs in/out — see the git history on `roompulse` for the
  exact bug this caused (blank screen on login/logout).
