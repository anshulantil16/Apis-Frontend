# APIS Intranet — Frontend

React + Vite frontend for the APIS India intranet. Two people work on this
repo (Anshul and Rainy) from separate laptops, through separate Claude
sessions. This file is how those sessions stay in agreement, because it
travels with git and each machine's Claude memory does not.

**Keep it current.** When a change alters a contract other code depends on —
a shared helper, an API shape, a convention — record it here in the same
commit. The other person's session has no other way to learn it.

## Branches

`dev_anshul`, `qa` and `dev_rainy` are kept **identical**. Work lands on your
own branch and is then fast-forwarded onto the other two.

Both of us commit as `anshulantil16 <anshul@apisindia.com>`, so git authorship
says nothing about who wrote a change — the branch it arrived on does.

## Building — this one bites

```bash
npm run build:qa      # QA. Always this one.
```

`npm run build` is **production** mode: it reads `.env.production`, so the API
points at port 80, which is PROD. A QA site built that way silently talks to
the production backend.

**`npx tsc --noEmit` checks nothing here.** The root tsconfig is
solution-style (`"files": []`), so it exits clean on code that does not
compile. Use `tsc -b`, or just `npm run build:qa`, which runs it. A push that
fails `tsc -b` cannot be deployed at all — the server keeps serving the old
bundle while appearing to have deployed.

## AdminPulse (`src/features/roompulse/`)

**Every call goes through `rpFetch`** from `RoomPulseShared.tsx`. Never call
`fetch` directly.

`rpFetch` attaches the session token minted at sign-in
(`X-AdminPulse-Session`) and, on a 401, clears the session and returns to the
login screen. The server takes identity from that header alone — sending
`email: session.email` in a body does nothing now, and used to be the whole
of the security model.

Vocabularies the server owns (ticket status, priority) are read through
`ticketStatusMeta()` / `ticketPriorityMeta()`, which fall back to rendering
the raw value rather than reading `.label` off `undefined`. Both lists have
grown once already.

A panel that fetches must check `res.ok` before setting state. A non-OK body
is `{error}`, and feeding it to the renderer is how a 403 became a dashboard
full of dashes instead of a message.

A ticket's `history` is its audit trail — shown by `TicketTrail` in My
Requests. The ticket row itself only carries the most recent review.

## SalesIQ (`src/features/salesiq/`)

Figures come from two source files with different coverage, so panels carry a
`<Coverage>` badge saying what share of sales they can speak for — a category
chart legitimately totalling 6% of the headline is not a bug. Breakdowns with
no column feeding them are not rendered at all; `filters/` returns
`absent_dimensions` for that.

Months with a plan and no result yet come back as `null`, not `0`. Chart
series over them need `connectNulls={false}` or the line falls off a cliff.

## Conventions

- Every new full-page screen needs a visible way out (a back button).
- Panels with nothing to show are hidden, not rendered empty — an empty card
  reads as broken.
