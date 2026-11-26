/* One CSV writer for every attendance download.
 *
 * Two things here are not cosmetic, both learned from a real export opened
 * in Excel on 23-11-2026:
 *
 *  * **The file starts with a UTF-8 BOM.** Without it Excel on Windows reads
 *    the bytes as Windows-1252 and every non-ASCII character arrives mangled
 *    — the em-dash this app uses for "nothing here" rendered as `â€"` down
 *    four whole columns. The BOM is the only thing that makes Excel read a
 *    .csv as UTF-8; the `charset=utf-8` on the blob type is advisory and
 *    Excel ignores it.
 *  * **An empty cell is empty, not an em-dash.** `—` is a reading aid for a
 *    screen. In a spreadsheet it is a text value sitting in a numeric column,
 *    so SUM and AVERAGE over it return 0 or #VALUE!, and a filter for blanks
 *    finds nothing. `blank()` strips it on the way out.
 *
 * Rows end with CRLF, which is what the CSV spec says and what Excel expects.
 */

/** The placeholder the screen uses for "no value". Never written to a file. */
const DASH = /^[—–-]$/;

const blank = (v: string | number | null | undefined): string => {
  if (v == null) return '';
  const s = String(v);
  return DASH.test(s.trim()) ? '' : s;
};

/* A number is written bare. Quoted, Excel is inconsistent about reading
   `"521"` back as a number rather than text, and a text column will not SUM.
   Everything else is quoted, because names and departments carry commas. */
const esc = (v: string | number | null | undefined) => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return `"${blank(v).replace(/"/g, '""')}"`;
};

export function downloadCsv(
  name: string,
  head: string[],
  body: (string | number | null | undefined)[][],
) {
  const lines = [head.map(esc).join(','), ...body.map(r => r.map(esc).join(','))];
  // \uFEFF is the BOM. It must be the first character of the file.
  const blob = new Blob(['\uFEFF' + lines.join('\r\n') + '\r\n'],
    { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Raw flag names are how the API talks, not how a spreadsheet should read.
   `noRecord absent` in a Status column means nothing to whoever opens the
   file; "Absent" does. Order matters — the first word is what the row IS,
   anything after it qualifies that. */
const STATUS: Record<string, string> = {
  present:         'Present',
  absent:          'Absent',
  weekOff:         'Week off',
  holiday:         'Holiday',
  optionalHoliday: 'Optional holiday',
  notYet:          'Date not reached',
  unswiped:        'Unswiped punch',
  late:            'Late vs shift',
  afterCutoff:     'After cutoff',
  earlyOut:        'Left early',
  /* HRMS files an approved full-day leave as Absent, so a Status column
     reading "Absent" alone would have somebody asked where they were. */
  leave:           'On leave',
  halfDay:         'Half day',
  onDuty:          'On duty',
  regularised:     'Punch regularised',
  workedOnOff:     'Worked a day off',
};

/* `noRecord` and `sunday` are deliberately absent: one of absent/weekOff/
   holiday/notYet always sits beside noRecord and says the same thing in
   plain words, and weekOff already covers sunday. Printing both gives every
   blank row a redundant "No record, Absent". */
/* `leave` comes before `absent` on purpose: it is the truer word for the
   row, and whoever reads the file reads left to right. `absentUnexplained`
   is not printed — `absent` with no "On leave" beside it already says it,
   and the pair would read "Absent, Absent (unexplained)". `applied` is not
   printed either: the leave type that follows is the useful half. */
const ORDER = ['present', 'leave', 'halfDay', 'onDuty', 'regularised',
  'absent', 'weekOff', 'holiday', 'optionalHoliday', 'workedOnOff',
  'notYet', 'unswiped', 'late', 'afterCutoff', 'earlyOut'];

export function statusText(flags: readonly string[]): string {
  const held = new Set(flags);
  const words = ORDER.filter(f => held.has(f)).map(f => STATUS[f]);
  return words.join(', ');
}
