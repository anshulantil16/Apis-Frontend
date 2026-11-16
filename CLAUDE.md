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

## The dashboard home page

`IntranetHomePage.tsx` renders it; `IntranetHomeShared.tsx` holds the data
hooks and the static arrays. Two things there are easy to confuse:

- `WHATS_NEW` is a hard-coded array about **this intranet's own tools**. It
  ships with a build.
- `useNews()` / Daily News is **company and industry news**, written in Admin
  Console › Dashboard Content and stored in `noticeboard.NewsItem`. The strip
  sits under Your Tools and hides itself entirely when nothing is published,
  rather than showing an empty frame.

Every "View all" on this page opens a popup, not a route. Keep it that way:
a popup has no screen to find a way back from.

## Help Desk (`src/features/helpdesk/`)

**The product is called Help Desk.** It was AdminPulse, and before that
RoomPulse. Every string a user reads says Help Desk. Three internal names
deliberately still say otherwise, because each is paired with a backend
identifier that cannot move without rewriting live tables: the API base
`/api/roompulse`, the `roompulse_session` storage key, and the
`X-AdminPulse-Session` header. Do not "fix" those to match the brand.

**Every call goes through `rpFetch`** from `HelpDeskShared.tsx`. Never call
`fetch` directly.

`rpFetch` attaches the session token minted at sign-in
(`X-AdminPulse-Session`) and, on a 401, clears the session and returns to the
login screen. The server takes identity from that header alone — sending
`email: session.email` in a body does nothing now, and used to be the whole
of the security model.

The room grid is live: it re-fetches every 30s and the server derives each
room's status from the clock, so a meeting frees its room on its own. Admin
and Super Admin also get a "Free this room now" control on an occupied card —
finished early (`action: 'release'`) or cancelled (`action: 'cancel'`), which
are two different records, not two words for the same thing.

Vocabularies the server owns (ticket status, priority) are read through
`ticketStatusMeta()` / `ticketPriorityMeta()`, which fall back to rendering
the raw value rather than reading `.label` off `undefined`. Both lists have
grown once already.

A panel that fetches must check `res.ok` before setting state. A non-OK body
is `{error}`, and feeding it to the renderer is how a 403 became a dashboard
full of dashes instead of a message.

A ticket row carries `origin`: `requested` or `logged`. Logged rows are work
the team did with no ticket behind it, so anything counting "received" or
"raised" must exclude them, and anything dated must read `performed_on` rather
than `created_at` / `updated_at` — a job done Friday may be written up Monday.

A ticket's `history` is its audit trail — shown by `TicketTrail` in My
Requests. The ticket row itself only carries the most recent review.

## Goal Setting (`src/features/goalsetting/`)

Calls go through `call()` in `api.ts`, which attaches the session token minted
at sign-in (`X-GoalSetting-Session`). The two file downloads use `fetch`
directly and carry the header themselves — anything new that does the same
must too.

A sheet comes back with `your_role`: what the signed-in person is **to that
sheet**, decided by the server from the org chart. Obey it rather than
`me.user_type`. On your own sheet you are the employee, even if you are an HOD
— reading the role off user_type is what stopped managers and HODs filling in
their own goals.

Who is a reviewer is decided by `reports_count` / `hod_reports_count` — who
actually reports to them — not by user_type, so a manager typed into the
upload sheet as "Employee" still gets their team.

## SalesIQ (`src/features/salesiq/`)

Figures come from two source files with different coverage, so panels carry a
`<Coverage>` badge saying what share of sales they can speak for — a category
chart legitimately totalling 6% of the headline is not a bug. Breakdowns with
no column feeding them are not rendered at all; `filters/` returns
`absent_dimensions` for that.

Months with a plan and no result yet come back as `null`, not `0`. Chart
series over them need `connectNulls={false}` or the line falls off a cliff.

## Attendance dashboards (`src/Components/`)

Two of them, from two different exports, and they do **not** share code:
`DelhiAttendanceDashboard` reads Pocket HRMS, `AttendanceDashboard` reads the
BIZOM field export. Three rules the BIZOM one now holds, each written because
the figure was wrong without it:

- **BIZOM closes an unclosed day by stamping `23:59`.** That is the system
  giving up, not a punch. `isAutoEod()` flags those rows, they are counted on
  their own rather than as EOD compliance, and no working-hours figure is
  derived from one — a 23:59 close reads as a fifteen-hour day and drags
  every average with it.
- **Hours are computed, not read.** BIZOM has no duration column (Delhi's
  export does), so `workedMinutes()` subtracts the in punch from the out
  punch and returns 0 unless both are real times and the day closed properly.
- **`isOnLeave()` is present-first** (`!isPresent && isLeave`), and every
  count and card goes through it. A half day carries both a punch and a leave
  note; reading it as leave hides the punch that was made. A row that *is*
  leave shows the leave type and no punch at all — a blank clock beside
  somebody on approved leave reads as a missing punch.

Column matching tries an **exact** header name before any partial one.
`EOD_Location` contains `eod`, so a loose-only match answers `get('eod')`
with the location the moment that column comes first in the sheet.

The Delhi late cutoff is `LATE_MINS`, one constant with four readers. 11:00
sharp is on time — every check is a strict `>`.

## Conventions

- Every new full-page screen needs a visible way out (a back button).
- Panels with nothing to show are hidden, not rendered empty — an empty card
  reads as broken.
