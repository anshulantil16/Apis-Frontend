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

Everything derived about a row — its category, its flags, its hours, its
distance — is computed once by `enrich()` and read from `Row` thereafter, so
a figure on a card, in the table and in the CSV cannot disagree.

**Counts come from `scoped`, the table comes from `shown`.** `scoped` is the
day (date + search); `shown` is `scoped` after the flag filters. Reading the
card counts off the filtered set zeroes every other card the moment one is
clicked, leaving nothing to click next. Several flags at once mean **any of**,
not all — the four status flags are mutually exclusive, so an all-of rule
answers nothing for the pair most worth seeing together.

`Start → EOD` is the **straight line between the two punches**, never
distance travelled: the file has two points and no track, so a loop that ends
where it began scores zero. Say "start → EOD" in any new label.

**The photo check runs on the server**, at
`POST /api/user_management/photo-check/`. It cannot run here: reading a
photo's pixels out of a canvas needs BIZOM's host to send
`Access-Control-Allow-Origin`, and it does not — the image displays in an
`<img>` and is unreadable to every line of code on the page. The in-page
version in `photoCheck.ts` is kept only as a fallback for a backend too old
to have the endpoint, and it will find nothing against the real host.

It answers blank / no_person / ok / unreadable. **`no_person` is a skin-tone
colour test, not face recognition** — say "may not be a person", never
anything stronger. `badPhoto` and `noPerson` are the two flags not in
`Row.flags`, because they need the fetch, so every filter goes through
`holds()` and never `r.flags.has()` directly.

The scan is a button, never automatic: a day is hundreds of images.

Group-by is offered only for columns the uploaded file actually carries
(`GROUP_FIELDS` filtered against the data). The BIZOM export has Zone and
Beat but no Sub Zone, manager, user type or designation, and offering those
four produced a dropdown where five of six options answered "Not Assigned,
everybody". Groups sort naturally (`byName`, `Intl.Collator` with
`numeric: true`), so GTR2 comes before GTR10.

Column matching tries an **exact** header name before any partial one.
`EOD_Location` contains `eod`, so a loose-only match answers `get('eod')`
with the location the moment that column comes first in the sheet.

The Delhi late cutoff is `LATE_MINS`, one constant with four readers. 11:00
sharp is on time — every check is a strict `>`.

## Sending exceptions out as a picture (`shareSheet.ts`)

Both attendance dashboards can hand a group — or one person — to whoever
owns them as a JPG, because an HOD gets a message, not a login. The sheet
carries the date it is **for**, the names, and what is wrong.

**It is drawn on a canvas, not screenshotted.** html2canvas over the cards
cannot work here: the BIZOM photos come with no CORS header, so drawing one
taints the canvas and `toBlob` then refuses outright — the download silently
does not happen. Photos therefore arrive as data URIs from
`/api/user_management/photo-thumbs/`, which have no origin. A face that could
not be fetched is initials on a grey square, never a failed download. Drawing
it also keeps the app's furniture out of something being forwarded.

`renderSheet` caps at `MAX_ROWS` (60) and says so in the footer — past that
it is a wall of names nobody reads, and the canvas nears the height at which
`toBlob` returns null. Callers slice their photo fetches to the same cap.

Both dashboards now share the same filter shape: KPI cards with a `flag` are
toggles, exceptions get chips, several at once mean **any of**, and counts
come from the pre-flag set so clicking one card does not zero the others.
Delhi's thresholds live in `SHORT_HOURS` and `LATE_MINS` — one constant each,
read by the flags, the KPI and the row rendering alike.

## `overflow-x-auto` gives you a vertical scrollbar too

Per the CSS spec, a non-`visible` `overflow-x` forces `overflow-y` to compute
to `auto`. So `<div className="overflow-x-auto">` is a scroll box in **both**
directions, and anything that pokes out of it vertically — `.tp-reveal` starts
cards 18px low, `.tp-tilt:hover` lifts them 4px — fills it and paints a second
vertical scrollbar right next to the shell's own.

**Pair it with `overflow-y-hidden`** on any wrapper whose children animate or
hang outside the box. The shell (`IntranetShell`) owns the one vertical
scroller the app is meant to have: `h-screen overflow-hidden` outside,
`flex-1 min-h-0 overflow-y-auto` on the content area. Nothing inside should
scroll vertically unless it deliberately sets a height.

The same rule bit `APIS_TREE.tsx`, where it clipped the bracket labels rather
than adding a scrollbar. There are ~50 `overflow-x-auto` wrappers in this repo
and only the Data Extractor ones have been audited.

## Conventions

- Every new full-page screen needs a visible way out (a back button).
- Panels with nothing to show are hidden, not rendered empty — an empty card
  reads as broken.

## Medical Insurance (`src/features/insurance/`)

A launcher, not a viewer. The insurer's integration document gives us a
sign-in redirect and **no data API**, so this page cannot show anybody's
health card, cover or claim status — it signs them in to the insurer's portal
and that portal shows them. Say that on screen rather than implying the
intranet holds the records.

- `insuranceLaunchUrl()` returns a **single-use** URL. Never cache one: it is
  a key to somebody's medical records with a three-hour life.
- **The new tab is opened synchronously inside the click**, then pointed at
  the URL once it arrives. Opening it after the `await` puts it outside the
  user gesture and every popup blocker swallows it — the button then does
  nothing at all, with nothing to show for it.
- Destination tiles are filtered against the keys the server actually offers,
  so the eleven in `GROUPS` can go stale without rendering a dead button.
- `ready` is two things at once: the connection is configured **and** this
  person can be identified to the insurer. Someone with neither an email nor
  an employee code cannot be, and is told so instead of being given buttons
  that all fail identically.

## Attendance (`src/features/attendance/`)

Live from Pocket HRMS — a date or a range, no upload. Separate from the Data
Extractor's two attendance dashboards and separately granted.

Same filter contract as those dashboards: KPI cards with a flag are toggles,
counts come from `scoped` (the pre-flag set) so clicking one card does not
zero the others, and several flags at once mean **any of**.

- **Hours are blank on an unswiped day, never zero and never derived.** The
  day did not close; a duration taken from one reads as a fifteen-hour shift.
- **`noRecord` is not "absent".** HRMS returns a blank row for every employee
  on every date, future dates included, and the feed has no leave or week-off
  column. The footnote on the page says this — keep it.
- **There is no overtime column** and must not be one: `OTHours` is `-` on
  every row this tenant returns.
- `late` (HRMS, vs the person's shift) and `afterCutoff` (vs the 11:00 clock
  rule) are both shown and routinely differ by an order of magnitude. The
  explanation sits under the cards, not in a tooltip, because it is the first
  thing anyone asks.
- Dates are built with a local `iso()` helper, **not** `toISOString()` — that
  converts to UTC and in IST returns yesterday for anything before 05:30.
- "By person" averages over the days that **have** a duration, not over every
  day in the range: dividing by days nobody closed drags the average down.
- Facet dropdowns render only when the fetched rows actually carry that
  column (`Picker` returns null on an empty list).

### Its table layout is deliberate

The first build had twelve columns and **the Status chips fell off the right
edge** — the one column that explains the row. Related fields are now paired
into single cells (grade under designation, the two punches as one
`in → out` span, late/early as one signed variance) so it fits a laptop, and
the chips sit under the name where they are read with it. Adding a thirteenth
column puts it back where it was.

`sticky top-0` on `<thead>` only works because the table is **in the page
flow** at desktop width — the shell's content area is the scroller. An
`overflow-x` wrapper would make the header stick to a box that never scrolls
vertically, i.e. do nothing. The horizontal scroller is therefore
`max-lg:` only, and paired with `max-lg:overflow-y-hidden` for the
double-scrollbar rule above.

**No-record rows are hidden from the table by default and never from the
counts.** 189 of 720 rows on a normal day are blanks for people the feed has
nothing on; left in, they fill the first screen with dashes before a single
real punch appears. The toggle says which state it is in, and asking for the
`noRecord` flag explicitly always overrides the hiding.

Rows render `PAGE` (150) at a time behind a "Show more" — a month is ~22,000
rows and React will happily try to draw all of them.

**It opens on Delhi HO**, scoped by employee code prefix (from
`meta.homeOffice.codePrefix`), not by the location dropdown — see the backend
CLAUDE.md for the counts that forced that. The scope is applied inside
`scoped`, i.e. **before** the flags, so the KPI cards count head office only
while it is on. "Everyone" is one click.
