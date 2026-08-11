# APIS Frontend

React + TypeScript + Vite frontend for the APIS internal tools suite. See
[STRUCTURE.md](STRUCTURE.md) for the folder layout, the feature ↔ backend-app
map, and conventions to follow when adding a new page.

## Setup

```bash
npm install
npm run dev          # local dev server, talks to .env.local / .env
```

## Building

There are separate build modes per target — **using the wrong one silently
points the built app at the wrong backend**:

| Command | Mode | API points at |
|---|---|---|
| `npm run dev` | dev | whatever `.env`/`.env.local` sets |
| `npm run build:qa` | qa | QA backend (`.env.qa`) |
| `npm run build` / `build:prod` | production | **live production backend** |

When deploying to the QA server, it must be `npm run build:qa` — a plain
`npm run build` will build correctly but silently talk to production.

## Branches & deployment

- `qa` — all day-to-day work happens here; deploys to the QA server with
  `npm run build:qa`.
- `main` — production, built with `npm run build`. Deployed far less often
  and only for changes that are verified on QA first.

## Conventions

See [STRUCTURE.md](STRUCTURE.md) for the full list. The short version: put
new work in `features/<name>/`, name the feature folder after its backend
Django app (not the marketing brand name), and never trust a client-sent role
— every privileged action must be re-checked server-side.
