/* CTC Calculator — calls to the `ctc` Django app (see its views module). */
import { apiFetch } from '../portal/session';
import { apiBase } from '../../apiBase';
import { downloadFile } from '../../utils/downloadFile';

const CTC_API = `${apiBase()}/api/ctc`;

export interface CtcCandidate {
  id: number; rowNumber: number;
  candidateName: string; department: string; designation: string;
  grade: string; cadre: string; workLocation: string;
  /* Annual, in rupees, as a decimal string ("1200000.00"). */
  ctc: string | null;
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

export async function deleteCtcUpload(id: number): Promise<string> {
  const r = await apiFetch(`${CTC_API}/uploads/${id}/`, { method: 'DELETE' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Could not remove that upload.');
  return data.message || 'Upload removed.';
}
