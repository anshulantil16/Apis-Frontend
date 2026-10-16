/* CTC Calculator — calls to the `ctc` Django app (see its views module). */
import { apiFetch } from '../portal/session';
import { apiBase } from '../../apiBase';
import { downloadFile } from '../../utils/downloadFile';

const CTC_API = `${apiBase()}/api/ctc`;

export interface CtcCandidate {
  id: number; rowNumber: number;
  employeeCode: string;
  numberOfChildren: number;
  /* Gross Earnings answered on the template, { meal: true, car: false, ... }. */
  grossEarnings?: Record<string, boolean>;
  /* "Old Regime", "New Regime", "Both Regime", or "" when not given. */
  taxRegime?: string;
  /* ISO date ("2026-07-01"), or null when not given. */
  dateOfJoining: string | null;
  candidateName: string; category: string; department: string; designation: string;
  grade: string; cadre: string; workLocation: string;
  /* Annual, in rupees, as a decimal string ("1200000.00"). */
  ctc: string | null;
  /* Set when the CTC entered is below the work location's minimum wage: the
     annual CTC the break-up and PDF use instead. */
  ctcCorrected?: string | null;
}

export interface CtcUpload {
  id: number; fileName: string; rowCount: number;
  uploadedBy: string; uploadedAt: string | null; canDelete: boolean;
  candidates: CtcCandidate[];
}

/* Upload refusals carry a message, and for bad rows a list of them. */
export class CtcUploadError extends Error {
  problems: string[];
  constructor(message: string, problems: string[] = []) {
    super(message);
    this.problems = problems;
  }
}

export function downloadCtcTemplate() {
  return downloadFile(`${CTC_API}/template/`, 'CTC_Calculator_Template.xlsx');
}

export async function listCtcUploads(): Promise<CtcUpload[]> {
  const r = await apiFetch(`${CTC_API}/uploads/`);
  if (!r.ok) throw new Error(r.status === 401 ? 'Your session has ended. Please sign in again.'
                                               : 'Could not load uploads.');
  return r.json();
}

export async function uploadCtcSheet(file: File): Promise<CtcUpload & { message: string }> {
  const body = new FormData();
  body.append('file', file);
  const r = await apiFetch(`${CTC_API}/uploads/`, { method: 'POST', body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new CtcUploadError(data.error || 'Upload failed. Please try again.', data.problems || []);
  return data;
}

/* Danger zone: erase every upload the caller can see (their own, or
   everyone's for a super admin). The server wants the word as well. */
export async function resetCtcData(): Promise<string> {
  const r = await apiFetch(`${CTC_API}/reset/`, {
    method: 'POST', body: JSON.stringify({ confirm: 'RESET' }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Reset failed. Please try again.');
  return data.message || 'Reset done.';
}

export async function deleteCtcUpload(id: number): Promise<string> {
  const r = await apiFetch(`${CTC_API}/uploads/${id}/`, { method: 'DELETE' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Could not remove that upload.');
  return data.message || 'Upload removed.';
}

/* ── Break-up (worked out by the server: ctc/calculator.py) ──────────── */

export interface BreakdownLine { label: string; monthly: number; annual: number; note: string; key?: string }

export interface CtcBreakdown {
  error?: string;
  cadre: string; cadreName: string; grade: string; category: string;
  state: string; minWage: number;
  ctcAnnual: number; vppPercent: number;
  /* Set when the CTC entered was raised to the state minimum wage. */
  ctcAdjusted?: { enteredAnnual: number; correctedAnnual: number; state: string; minWage: number } | null;
  earnings: BreakdownLine[]; grossEarnings: number; grossEarningsAnnual: number;
  reimbursements: BreakdownLine[]; grossSalary: number; grossSalaryAnnual: number;
  benefits: BreakdownLine[]; benefitsTotal: number; benefitsTotalAnnual: number;
  fixedMonthly: number; fixedAnnual: number;
  otherPayments: BreakdownLine[];
  totalCtcMonthly: number; totalCtcAnnual: number;
  /* Car Lease picked on the template — as per the car lease policy, outside the CTC. */
  carLease?: boolean;
  notes: string[];
}

export async function getCtcBreakdown(id: number): Promise<{ candidate: CtcCandidate; breakdown: CtcBreakdown }> {
  const r = await apiFetch(`${CTC_API}/candidates/${id}/breakdown/`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Could not work out the break-up.');
  return data;
}

export function downloadCtcPdf(id: number, name: string) {
  const safe = name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'candidate';
  return downloadFile(`${CTC_API}/candidates/${id}/pdf/`, `CTC_Breakup_${safe}.pdf`);
}

/* ── Settings: the values P & C's workbook leaves open ───────────────── */

export interface CtcSettings {
  values: Record<string, number | string>;
  labels: Record<string, string>;
  updatedBy: string; updatedAt: string | null; canEdit: boolean;
}

export async function getCtcSettings(): Promise<CtcSettings> {
  const r = await apiFetch(`${CTC_API}/settings/`);
  if (!r.ok) throw new Error('Could not load the calculation settings.');
  return r.json();
}

export async function saveCtcSettings(values: Record<string, string>): Promise<CtcSettings & { message: string }> {
  const r = await apiFetch(`${CTC_API}/settings/`, { method: 'PUT', body: JSON.stringify(values) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Could not save the settings.');
  return data;
}
