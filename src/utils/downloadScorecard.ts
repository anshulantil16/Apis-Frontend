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

function starLabel(n: number): string {
  if (!n) return '';
  const labels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)} ${labels[n] || ''}`;
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

function sectionHeader(ws: any, rowNum: number, cols: number, label: string, color: { argb: string }, textColor = WHITE) {
  ws.mergeCells(rowNum, 1, rowNum, cols);
  const cell = ws.getCell(rowNum, 1);
  cell.value     = label;
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: color };
  cell.font      = { bold: true, color: textColor, size: 9 };
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(rowNum).height = 16;
  return rowNum + 1;
}

function sectionRow(ws: any, rowNum: number, cols: number, label: string, value: string, labelColor: { argb: string } = NAVY) {
  ws.mergeCells(rowNum, 1, rowNum, 3);
  const lbl = ws.getCell(rowNum, 1);
  lbl.value     = label;
  lbl.fill      = { type: 'pattern', pattern: 'solid', fgColor: labelColor };
  lbl.font      = { bold: true, color: WHITE, size: 8 };
  lbl.alignment = { vertical: 'middle', indent: 1 };

  ws.mergeCells(rowNum, 4, rowNum, cols);
  const val = ws.getCell(rowNum, 4);
  val.value     = value;
  val.font      = { size: 9 };
  val.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  val.border    = {
    top: { style: 'hair' }, bottom: { style: 'hair' },
    left: { style: 'hair' }, right: { style: 'hair' },
  };
  ws.getRow(rowNum).height = value.length > 80 ? 32 : 18;
  return rowNum + 1;
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
        kpi.data_source || '',
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

  // ── Section 2: Self-Review Answers ─────────────────────────────────────────
  const selfAnswers: any[] = goalCard.self_review_answers || [];
  const SELF_QUESTIONS = [
    'What do you consider to be your most important achievement of FY 25-26?',
    'Where did you experience difficulties or constraints which affected your performance in FY 25-26?',
    'List the training programs attended in FY 25-26.',
  ];
  if (selfAnswers.length > 0) {
    R = sectionHeader(ws, R, COLS, 'SECTION 2 — SELF-REVIEW ANSWERS', NAVY);
    selfAnswers.forEach((ans: any, qi: number) => {
      const points: string[] = Array.isArray(ans) ? ans.filter((p: string) => p?.trim()) : (ans?.trim() ? [ans] : []);
      if (!points.length) return;
      const questionText = SELF_QUESTIONS[qi] || `Question ${qi + 1}`;
      const answersText  = points.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n');
      R = sectionRow(ws, R, COLS, `Q${qi + 1}`, `${questionText}\n${answersText}`);
    });
    R = spacer(ws, R);
  }

  // ── Section 3: Skills & Training ───────────────────────────────────────────
  const keySkills: string[]        = (goalCard.key_skills || []).filter((s: string) => s?.trim());
  const suggestedSkills: string[]  = (goalCard.manager_suggested_skills || []).filter((s: string) => s?.trim());
  const trainingPrograms: string   = goalCard.training_programs || '';

  if (keySkills.length || suggestedSkills.length || trainingPrograms) {
    R = sectionHeader(ws, R, COLS, 'SECTION 3 — SKILLS & TRAINING', NAVY);
    if (keySkills.length) {
      R = sectionRow(ws, R, COLS, 'Key Skills (Employee)', keySkills.join('  |  '));
    }
    if (suggestedSkills.length) {
      R = sectionRow(ws, R, COLS, 'Recommended Skills\n(Manager / HOD)', suggestedSkills.join('  |  '));
    }
    if (trainingPrograms) {
      R = sectionRow(ws, R, COLS, 'Training Programs', trainingPrograms);
    }
    R = spacer(ws, R);
  }

  // ── Section 4: Employee Feedback ───────────────────────────────────────────
  const fbMgr  = goalCard.feedback_manager || '';
  const fbOrg  = goalCard.feedback_organization || '';
  const fbMgrR = goalCard.feedback_manager_rating;
  const fbOrgR = goalCard.feedback_organization_rating;

  if (fbMgr || fbOrg) {
    R = sectionHeader(ws, R, COLS, 'SECTION 4 — EMPLOYEE FEEDBACK', NAVY);
    if (fbMgr) {
      R = sectionRow(ws, R, COLS, 'Feedback — Manager', `${fbMgrR ? starLabel(fbMgrR) + '\n' : ''}${fbMgr}`);
    }
    if (fbOrg) {
      R = sectionRow(ws, R, COLS, 'Feedback — Organization', `${fbOrgR ? starLabel(fbOrgR) + '\n' : ''}${fbOrg}`);
    }
    R = spacer(ws, R);
  }

  // ── Manager Remarks ────────────────────────────────────────────────────────
  const hasMgrRemarks = goalCard.manager_special_achievements || goalCard.manager_promoted || goalCard.manager_salary_correction;
  if (hasMgrRemarks) {
    R = sectionHeader(ws, R, COLS, 'MANAGER REMARKS', { argb: 'FF1A4B8C' });
    if (goalCard.manager_special_achievements) {
      R = sectionRow(ws, R, COLS, 'Special Achievements', goalCard.manager_special_achievements, { argb: 'FF1A4B8C' });
    }
    if (goalCard.manager_promoted) {
      const promText = `${goalCard.manager_promoted}${goalCard.manager_promoted_justification ? '  —  ' + goalCard.manager_promoted_justification : ''}`;
      R = sectionRow(ws, R, COLS, 'Promoted', promText, { argb: 'FF1A4B8C' });
    }
    if (goalCard.manager_salary_correction) {
      R = sectionRow(ws, R, COLS, 'Salary / Market Correction', goalCard.manager_salary_correction, { argb: 'FF1A4B8C' });
    }
    R = spacer(ws, R);
  }

  // ── HOD Remarks ────────────────────────────────────────────────────────────
  const hasHODRemarks = goalCard.hod_special_achievements || goalCard.hod_promoted || goalCard.hod_salary_correction;
  if (hasHODRemarks) {
    R = sectionHeader(ws, R, COLS, 'HOD REMARKS', { argb: 'FF4B0082' });
    if (goalCard.hod_special_achievements) {
      R = sectionRow(ws, R, COLS, 'Special Achievements', goalCard.hod_special_achievements, { argb: 'FF4B0082' });
    }
    if (goalCard.hod_promoted) {
      const promText = `${goalCard.hod_promoted}${goalCard.hod_promoted_justification ? '  —  ' + goalCard.hod_promoted_justification : ''}`;
      R = sectionRow(ws, R, COLS, 'Promoted', promText, { argb: 'FF4B0082' });
    }
    if (goalCard.hod_salary_correction) {
      R = sectionRow(ws, R, COLS, 'Salary / Market Correction', goalCard.hod_salary_correction, { argb: 'FF4B0082' });
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer();
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `${empName}_${fy}_Scorecard.xlsx`;

  // Use native Save File dialog (avoids Chrome's HTTP insecure-download warning)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Excel Workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      // User cancelled the picker — do nothing
      return;
    }
  }

  // Fallback for browsers without File System Access API
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
