/**
 * APIS India — Performance Appraisal Form FY 25-26 Excel generator.
 */

// ─── Score helpers ─────────────────────────────────────────────────────────────

function calcScoreAch(kpi: any): number | null {
  const plan   = parseFloat(kpi.target_value);
  const actual = parseFloat(kpi.actual_achievement);
  if (isNaN(plan) || isNaN(actual) || plan === 0) return null;
  const dir = (kpi.parameter_type || '').toLowerCase();
  if (dir.includes('higher')) return Math.min((actual / plan) * 100, 100);
  if (dir.includes('lower'))  return actual === 0 ? null : Math.min((plan / actual) * 100, 100);
  if (dir.includes('target')) return actual >= plan ? 100 : Math.max(0, (1 - Math.abs(actual - plan) / plan) * 100);
  return null;
}

function calcWtSystem(kpi: any): number | null {
  const score = calcScoreAch(kpi);
  const wt    = parseFloat(kpi.weightage);
  if (score === null || isNaN(wt) || wt === 0) return null;
  return parseFloat(((score / 100) * wt).toFixed(2));
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const NAVY     = { argb: 'FF0D1B4B' } as const;
const WHITE    = { argb: 'FFFFFFFF' } as const;
const LIGHT    = { argb: 'FFF0F4FF' } as const;
const AMBER    = { argb: 'FFFFF3CD' } as const;
const MGRTINT  = { argb: 'FFE8F0FF' } as const;
function navyCell(ws: any, row: number, col: number) {
  const cell = ws.getCell(row, col);
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
  cell.font      = { bold: true, color: WHITE, size: 9 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border    = {
    top: { style: 'thin', color: WHITE }, bottom: { style: 'thin', color: WHITE },
    left: { style: 'thin', color: WHITE }, right: { style: 'thin', color: WHITE },
  };
}

function tintCell(ws: any, row: number, col: number, fgColor: { argb: string }) {
  const cell = ws.getCell(row, col);
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border    = {
    top: { style: 'hair' }, bottom: { style: 'hair' },
    left: { style: 'hair' }, right: { style: 'hair' },
  };
}

function dataCell(ws: any, row: number, col: number, light: boolean) {
  const cell = ws.getCell(row, col);
  if (light) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT };
  cell.alignment = { vertical: 'middle', wrapText: true };
  cell.border    = {
    top: { style: 'hair' }, bottom: { style: 'hair' },
    left: { style: 'hair' }, right: { style: 'hair' },
  };
}

function spacer(ws: any, rowNum: number) {
  ws.getRow(rowNum).height = 6;
  return rowNum + 1;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function downloadScorecard(goalCard: any, cycleName?: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Scorecard');

  const empName     = goalCard.employee_name  || goalCard.employee?.name        || 'Employee';
  const empId       = goalCard.employee_id_str || goalCard.employee?.employee_id || '';
  const designation = goalCard.employee_designation || goalCard.employee?.designation || '';
  const zone        = goalCard.employee_zone   || goalCard.employee?.zone        || '';
  const dept        = goalCard.employee_department || goalCard.employee?.department || '';
  const fy          = cycleName || goalCard.cycle_name || 'FY 2025-26';
  const goals: any[] = goalCard.goals || [];
  const COLS = 18;

  ws.columns = [
    { width: 24 }, { width: 30 }, { width: 30 }, { width: 11 }, { width: 12 },
    { width: 16 }, { width: 16 }, { width: 20 }, { width: 14 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
    { width: 30 }, { width: 30 }, { width: 20 },
  ];

  let R = 1;

  // ── Title ──────────────────────────────────────────────────────────────────
  ws.mergeCells(R, 1, R, COLS);
  const titleCell = ws.getCell(R, 1);
  titleCell.value     = `APIS INDIA LIMITED  —  Performance Appraisal Form ${fy}`;
  titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
  titleCell.font      = { bold: true, color: WHITE, size: 13 };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(R).height = 28;
  R++;

  // ── Employee info ──────────────────────────────────────────────────────────
  ws.mergeCells(R, 1, R, COLS);
  const infoCell = ws.getCell(R, 1);
  infoCell.value     = `Employee: ${empName}   |   ID: ${empId}   |   Designation: ${designation}   |   Department: ${dept}   |   Zone: ${zone}   |   Status: ${(goalCard.status || '').replace(/_/g, ' ').toUpperCase()}`;
  infoCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2F6B' } };
  infoCell.font      = { color: WHITE, size: 10, italic: true };
  infoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(R).height = 20;
  R++;
  R = spacer(ws, R);

  // ── KPI table header ───────────────────────────────────────────────────────
  const HEADERS = [
    'Goal\n(Category)', 'KRA\n(Strategic Focus Area)', 'KPI / Metric',
    'Weightage\n%', 'Frequency', 'Unit of\nMeasurement',
    'Parameter Type\nDirection', 'Data Source', 'Plan\n(Budgeted)',
    'Actual\nAchievement', 'Score\nAchievement', 'Weightage %\n(System)',
    'Weightage %\n(Manager)', 'Weightage %\n(HOD)', 'Yearly\nScore',
    'Comments\nby Employee', 'Comments\nby Manager', 'Base File',
  ];
  HEADERS.forEach((h, i) => { ws.getCell(R, i + 1).value = h; navyCell(ws, R, i + 1); });
  ws.getRow(R).height = 40;
  R++;

  // ── KPI data rows ──────────────────────────────────────────────────────────
  let rowIndex = 0;
  goals.forEach((kra: any) => {
    const kpis: any[] = kra.kpis || [];
    kpis.forEach((kpi: any, ki: number) => {
      const scoreAch = calcScoreAch(kpi);
      const wtSys    = calcWtSystem(kpi);
      const light    = rowIndex % 2 === 0;

      const values = [
        ki === 0 ? (kra.category || '') : '',
        ki === 0 ? (kra.title || '') : '',
        kpi.metric || '',
        kpi.weightage ?? '',
        kpi.frequency || '',
        kpi.unit_of_measurement || '',
        kpi.parameter_type || '',
        kpi.data_source || '',
        kpi.target_value || '',
        kpi.actual_achievement || '',
        scoreAch !== null ? `${scoreAch.toFixed(1)}%` : '',
        wtSys    !== null ? `${wtSys.toFixed(2)}%`    : '',
        kpi.manager_score != null ? `${kpi.manager_score}%` : '',
        kpi.hod_score     != null ? `${kpi.hod_score}%`     : '',
        kpi.final_score   != null ? parseFloat(String(kpi.final_score)).toFixed(2) : '',
        [kpi.self_comments, kpi.achievement_description].filter(Boolean).join('\n') || '',
        kpi.manager_comments || '',
        '',  // Base File — no base_file field in model; left blank intentionally
      ];

      values.forEach((v, ci) => {
        const cell = ws.getCell(R, ci + 1);
        cell.value = v;
        if (ci <= 1) {
          cell.font = { bold: ki === 0 };
          dataCell(ws, R, ci + 1, false);
          if (ki === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEFF' } };
        } else if (ci >= 10 && ci <= 14) {
          tintCell(ws, R, ci + 1, AMBER);
        } else if (ci === 12 || ci === 13) {
          tintCell(ws, R, ci + 1, MGRTINT);
        } else {
          dataCell(ws, R, ci + 1, light);
        }
      });

      ws.getRow(R).height = 18;
      R++;
      rowIndex++;
    });
    if (kpis.length > 0) { R = spacer(ws, R); }
  });

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalWt  = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => ks + parseFloat(k.weightage||0), 0), 0);
  const totalSys = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => { const w = calcWtSystem(k); return ks + (w ?? 0); }, 0), 0);
  const totalMgr = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => ks + parseFloat(k.manager_score||0), 0), 0);
  const totalHOD = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => ks + parseFloat(k.hod_score||0), 0), 0);

  ws.mergeCells(R, 1, R, 3);
  const totCell = ws.getCell(R, 1);
  totCell.value = 'TOTAL'; totCell.fill = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
  totCell.font = { bold: true, color: WHITE, size: 10 };
  totCell.alignment = { horizontal: 'center', vertical: 'middle' };
  const totals: Record<number, string> = {
    4: `${totalWt}%`, 12: `${totalSys.toFixed(2)}%`,
    13: `${totalMgr.toFixed(1)}%`, 14: `${totalHOD.toFixed(1)}%`,
  };
  for (let c = 4; c <= COLS; c++) {
    const cell = ws.getCell(R, c);
    cell.value = totals[c] ?? '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
    cell.font = { bold: true, color: WHITE };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  ws.getRow(R).height = 22;
  R++;
  R = spacer(ws, R);

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer();
  const fileName = `${empName}_${fy}_Scorecard.xlsx`;

  // Convert to base64 data URI — avoids Chrome blob-URL "insecure download" warning on HTTP
  const uint8 = new Uint8Array(buffer as ArrayBuffer);
  let binary  = '';
  for (let i = 0; i < uint8.length; i += 8192) {
    binary += String.fromCharCode(...(uint8.subarray(i, i + 8192) as any));
  }
  const base64 = btoa(binary);
  const a      = document.createElement('a');
  a.href       = `data:application/octet-stream;base64,${base64}`;
  a.download   = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
