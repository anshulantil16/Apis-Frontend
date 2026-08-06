# Frontend structure

React + TypeScript + Vite + Tailwind. **Each project lives in its own folder
under `src/features/`** and is reached through that folder's `index.ts`.

```
src/
  App.tsx              the map of projects — one import per feature barrel
  main.tsx             entry point
  Routes/              router config

  features/            ⬅ one folder per project
    extractor/         Data Extractor (the hub / landing tool)
    performance/       Performance Hub
    appraisal/         Appraisal Hub
    eom/               Employee of the Month
    pms/               PMS Simulator
    letters/           Letters Generator (appraisal + warning letters)
    tada/              TA/DA Portal
    salesiq/           SalesIQ sales analytics

  Components/          shared, cross-project UI only
  Services/            API clients
  utils/               shared helpers
  Styles/
```

## The rules

1. **Import a project through its barrel**, not by reaching into its files:
   ```ts
   import { SalesIQPage } from './features/salesiq';        // yes
   import { SalesIQPage } from './features/salesiq/SalesIQPage';  // no
   ```
   Anything not exported from `index.ts` is that project's private business and
   can be renamed or moved without touching anything else.

2. **`src/Components/` is for genuinely shared UI only.** If only one project
   uses a component, it belongs inside that project's folder. Components that
   are shared today live there because more than one feature imports them.

3. **A project never imports another project's internals.** If two need the
   same thing, it moves up to `Components/`, `Services/` or `utils/`.

---

## features/salesiq — SalesIQ

```
salesiq/
  index.ts            public entry point
  SalesIQLogin.tsx    OTP login + session helpers + honey animation
  SalesIQPage.tsx     shell: tabs, filter bar, data loading, Overview/Geography/
                      Products/Team/Forecast/Data tabs
  SalesIQPanels.tsx   Intelligence and Customers tabs
  SalesIQShared.tsx   formatting, animated primitives, chart chrome
```

`SalesIQShared.tsx` is the one place for `inr` / `shortInr` / `PALETTE`,
`Counter`, `Reveal`, `Panel`, `Leaderboard`, `Gauge`, `HeatGrid`, `CohortGrid`
and `ChartTip`. Both `SalesIQPage` and `SalesIQPanels` import from it — do not
duplicate a formatter or an animated wrapper into a tab file.

**Where do I change...**

| Task | File |
|---|---|
| Login look / honey animation | `SalesIQLogin.tsx` |
| Add a tab, change filters, change what loads | `SalesIQPage.tsx` |
| Intelligence or Customers content | `SalesIQPanels.tsx` |
| Number formatting, colours, shared widgets | `SalesIQShared.tsx` |

---

## features/letters — Letters Generator

```
letters/
  index.ts
  LettersGeneratorPage.tsx        hub: choose a letter type; owns the nav chrome
  OfferLetterSimplePage.tsx       appraisal letters (upload / send / history)
  WarningLetterPage.tsx           warning letters (form / bulk / history)
  OfferLetterApprovalDashboard.tsx
```

Adding a letter type = one entry in `LETTERS` in `LettersGeneratorPage.tsx`
plus its page component.

---

## Conventions

- **Animation is CSS keyframes scoped to the page** (a `<style>` block in the
  component), not an animation library — it keeps the bundle flat.
- **Never declare a component inside another component's body.** It becomes a
  new component type on every render, so React unmounts and remounts it and
  inputs lose focus after each keystroke. Declare it at module scope and pass
  props (see `Field` / `Area` in `WarningLetterPage.tsx`).
- **Downloads go through `fetch` + blob**, not a bare `<a href>`. A plain
  anchor to a failing endpoint does nothing visible, which is indistinguishable
  from a broken button.
- **QA builds must use `npm run build:qa`.** Plain `npm run build` is production
  mode and points the QA site at the PROD API.
