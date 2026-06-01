/**
 * APIS India — KRA & KPI Scorecard Excel generator.
 * Produces the dark-navy-header tabular report matching the official format.
 * Call downloadScorecard(goalCard, cycleName) from any view.
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

// ─── Navy theme ────────────────────────────────────────────────────────────────

const NAVY   = { argb: 'FF0D1B4B' } as const;   // dark navy
const WHITE  = { argb: 'FFFFFFFF' } as const;
const LIGHT  = { argb: 'FFF0F4FF' } as const;    // very light blue for alternating rows
const AMBER  = { argb: 'FFFFF3CD' } as const;    // calculated columns tint
const MGRTINT = { argb: 'FFE8F0FF' } as const;   // manager column tint

function navyCell(ws: any, row: number, col: number) {
  const cell = ws.getCell(row, col);
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
  cell.font   = { bold: true, color: WHITE, size: 9 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: WHITE }, bottom: { style: 'thin', color: WHITE },
    left: { style: 'thin', color: WHITE }, right: { style: 'thin', color: WHITE },
  };
}

function tintCell(ws: any, row: number, col: number, fgColor: { argb: string }) {
  const cell = ws.getCell(row, col);
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    top: { style: 'hair' }, bottom: { style: 'hair' },
    left: { style: 'hair' }, right: { style: 'hair' },
  };
}

function dataCell(ws: any, row: number, col: number, light: boolean) {
  const cell = ws.getCell(row, col);
  if (light) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT };
  cell.alignment = { vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'hair' }, bottom: { style: 'hair' },
    left: { style: 'hair' }, right: { style: 'hair' },
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function downloadScorecard(goalCard: any, cycleName?: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Scorecard');

  const empName        = goalCard.employee_name  || goalCard.employee?.name        || 'Employee';
  const empId          = goalCard.employee_id_str || goalCard.employee?.employee_id || '';
  const designation    = goalCard.employee_designation || goalCard.employee?.designation || '';
  const zone           = goalCard.employee_zone   || goalCard.employee?.zone        || '';
  const fy             = cycleName || goalCard.cycle_name || 'FY 2025-26';
  const goals: any[]   = goalCard.goals || [];

  // Column widths (18 columns)
  ws.columns = [
    { width: 24 }, // Goal (Category)
    { width: 30 }, // KRA
    { width: 30 }, // KPI
    { width: 11 }, // Weightage %
    { width: 12 }, // Frequency
    { width: 16 }, // Unit of Measurement
    { width: 16 }, // Parameter Type Direction
    { width: 20 }, // Data Source
    { width: 14 }, // Plan (Budgeted)
    { width: 16 }, // Actual Achievement
    { width: 14 }, // Score Ach %
    { width: 14 }, // Wt% (System)
    { width: 14 }, // Wt% (Manager)
    { width: 16 }, // Wt% (Management)
    { width: 14 }, // Yearly Score
    { width: 30 }, // Comments by Employee
    { width: 30 }, // Comments by Manager
    { width: 20 }, // Base File
  ];

  // ── Row 1: Company + FY title ──────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, 18);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `APIS INDIA LIMITED  -  KRA & KPI SCORECARD EVALUATION FOR ${fy}`;
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
  titleCell.font  = { bold: true, color: WHITE, size: 13 };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 28;

  // ── Row 2: Employee info ───────────────────────────────────────────────────
  ws.mergeCells(2, 1, 2, 18);
  const infoCell = ws.getCell(2, 1);
  infoCell.value = `Employee: ${empName}   |   ID: ${empId}   |   Designation: ${designation}   |   Zone: ${zone}   |   Status: ${(goalCard.status || '').replace(/_/g, ' ').toUpperCase()}`;
  infoCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2F6B' } };
  infoCell.font  = { color: WHITE, size: 10, italic: true };
  infoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;

  // ── Row 3: spacer ─────────────────────────────────────────────────────────
  ws.getRow(3).height = 6;

  // ── Row 4: Column headers ──────────────────────────────────────────────────
  const HEADERS = [
    'Goal\n(Category)', 'KRA\n(Strategic Focus Area)', 'KPI / Metric',
    'Weightage\n%', 'Frequency', 'Unit of\nMeasurement',
    'Parameter Type\nDirection', 'Data Source', 'Plan\n(Budgeted)',
    'Actual\nAchievement', 'Score\nAchievement', 'Weightage %\n(System)',
    'Weightage %\n(Manager)', 'Weightage %\n(Management)', 'Yearly\nScore',
    'Comments\nby Employee', 'Comments\nby Manager', 'Base File',
  ];

  HEADERS.forEach((h, i) => {
    ws.getCell(4, i + 1).value = h;
    navyCell(ws, 4, i + 1);
  });
  ws.getRow(4).height = 40;

  // ── Data rows ──────────────────────────────────────────────────────────────
  let rowNum = 5;
  let rowIndex = 0;

  goals.forEach((kra: any) => {
    const kpis: any[] = kra.kpis || [];
    kpis.forEach((kpi: any, ki: number) => {
      const scoreAch = calcScoreAch(kpi);
      const wtSys    = calcWtSystem(kpi);
      const light    = rowIndex % 2 === 0;

      const values = [
        ki === 0 ? (kra.category || '') : '',
        ki === 0 ? (kra.title || '')    : '',
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
        kpi.data_source || '',
      ];

      values.forEach((v, ci) => {
        const cell = ws.getCell(rowNum, ci + 1);
        cell.value = v;

        // Styling by column zone
        if (ci <= 1) {
          // Category / KRA — bold
          cell.font = { bold: ki === 0 };
          dataCell(ws, rowNum, ci + 1, false);
          if (ki === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEFF' } };
        } else if (ci >= 10 && ci <= 14) {
          // Calculated / score columns — amber tint
          tintCell(ws, rowNum, ci + 1, AMBER);
        } else if (ci === 12 || ci === 13) {
          // Manager / Management — blue tint
          tintCell(ws, rowNum, ci + 1, MGRTINT);
        } else {
          dataCell(ws, rowNum, ci + 1, light);
        }
      });

      ws.getRow(rowNum).height = 18;
      rowNum++;
      rowIndex++;
    });

    // Blank separator between KRAs
    if (kpis.length > 0) {
      ws.getRow(rowNum).height = 6;
      rowNum++;
    }
  });

  // ── Totals row ─────────────────────────────────────────────────────────────
  const totalWt  = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => ks + parseFloat(k.weightage||0), 0), 0);
  const totalSys = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => { const w = calcWtSystem(k); return ks + (w ?? 0); }, 0), 0);
  const totalMgr = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => ks + parseFloat(k.manager_score||0), 0), 0);
  const totalHOD = goals.reduce((s: number, g: any) => s + (g.kpis||[]).reduce((ks: number, k: any) => ks + parseFloat(k.hod_score||0), 0), 0);

  ws.mergeCells(rowNum, 1, rowNum, 3);
  const totCell = ws.getCell(rowNum, 1);
  totCell.value = 'TOTAL';
  totCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
  totCell.font  = { bold: true, color: WHITE, size: 10 };
  totCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const totals: Record<number, string> = {
    4:  `${totalWt}%`,
    12: `${totalSys.toFixed(2)}%`,
    13: `${totalMgr.toFixed(1)}%`,
    14: `${totalHOD.toFixed(1)}%`,
  };
  for (let c = 4; c <= 18; c++) {
    const cell = ws.getCell(rowNum, c);
    cell.value = totals[c] ?? '';
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
    cell.font  = { bold: true, color: WHITE };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  ws.getRow(rowNum).height = 22;
  rowNum++;

  // ── HOD Remarks section ─────────────────────────────────────────────────────
  const hodRemarks = [
    goalCard.hod_special_achievements,
    goalCard.hod_promoted ? `Promoted: ${goalCard.hod_promoted}` : null,
    goalCard.hod_promoted_justification ? `Promotion justification: ${goalCard.hod_promoted_justification}` : null,
    goalCard.hod_salary_correction ? `Salary correction: ${goalCard.hod_salary_correction}` : null,
    goalCard.hod_salary_justification ? `Justification: ${goalCard.hod_salary_justification}` : null,
    goalCard.hod_remarks,
  ].filter(Boolean).join('  |  ');

  if (hodRemarks) {
    ws.getRow(rowNum).height = 6;
    rowNum++;
    ws.mergeCells(rowNum, 1, rowNum, 18);
    const hodLbl = ws.getCell(rowNum, 1);
    hodLbl.value = 'HOD REMARKS';
    hodLbl.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B0082' } };
    hodLbl.font  = { bold: true, color: WHITE, size: 9 };
    hodLbl.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(rowNum).height = 16;
    rowNum++;
    ws.mergeCells(rowNum, 1, rowNum, 18);
    const hodVal = ws.getCell(rowNum, 1);
    hodVal.value = hodRemarks;
    hodVal.font  = { size: 9 };
    hodVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    hodVal.border = {
      top: { style: 'hair' }, bottom: { style: 'hair' },
      left: { style: 'hair' }, right: { style: 'hair' },
    };
    ws.getRow(rowNum).height = 28;
  } else {
    rowNum--;  // Undo the extra increment — use the last rowNum for the download below
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `${empName}_${fy}_Scorecard.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
