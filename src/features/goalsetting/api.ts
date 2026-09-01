/* Goal Setting Hub — everything that talks to the server, in one place.
 *
 * The product is one workflow seen from four seats (employee, manager, HOD,
 * admin), so the calls are shared rather than duplicated per view. Each screen
 * differs in what it may DO, and the server decides that from the plan's
 * status — the frontend only asks.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const GS_API = `${BASE}/api/goalsetting`;

export type Role = 'employee' | 'manager' | 'hod' | 'admin';

export type PlanStatus =
  | 'draft' | 'submitted' | 'with_hod' | 'awaiting_employee' | 'accepted' | 'returned';

export interface KPI {
  id?: number;
  _k?: number;            // client-side key for rows the server has never seen
  metric: string;
  weightage: number | string;
  frequency: string;
  unit_of_measurement: string;
  parameter_type: string;
  data_source: string;
  target_value: string;
}

export interface KRA {
  id?: number;
  _k?: number;
  category: string;
  title: string;
  description: string;
  kpis: KPI[];
}

export interface Change {
  type: 'kra_added' | 'kra_removed' | 'kpi_added' | 'kpi_removed' | 'kpi_changed';
  kra: string;
  category?: string;
  kpi?: string;
  field?: string;
  from?: unknown;
  to?: unknown;
}

export interface Version {
  id: number;
  version_no: number;
  actor_role: Role;
  actor_name: string;
  action: string;
  note: string;
  kras: KRA[];
  changes: Change[];
  total_weightage: number;
  created_at: string;
}

export interface PlanEvent {
  id: number;
  actor_role: string;
  actor_name: string;
  action: string;
  note: string;
  created_at: string;
}

export interface Plan {
  id: number;
  employee_name: string;
  employee_code: string;
  designation: string;
  department: string;
  cycle: number;
  cycle_name: string;
  cycle_status: string;
  status: PlanStatus;
  status_label: string;
  employee_note: string;
  manager_note: string;
  hod_note: string;
  employee_acceptance_note: string;
  submitted_at: string | null;
  manager_acted_at: string | null;
  hod_acted_at: string | null;
  accepted_at: string | null;
  total_weightage: number;
  kpi_count: number;
  kras: KRA[];
  versions: Version[];
  events: PlanEvent[];
  problems?: string[];
}

export interface PlanSummary {
  id: number;
  cycle: number;          // the identity a plan is matched on — never cycle_name
  employee_name: string;
  employee_code: string;
  designation: string;
  department: string;
  cycle_name: string;
  status: PlanStatus;
  status_label: string;
  total_weightage: number;
  kpi_count: number;
  kra_count: number;
  version_count: number;
  submitted_at: string | null;
  accepted_at: string | null;
}

export interface Employee {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  zone: string;
  reporting_manager_id: string;
  hod_id: string;
  manager_name: string;
  hod_name: string;
  user_type: Role;
  is_active: boolean;
}

export interface Cycle {
  id: number;
  name: string;
  fiscal_year: string;
  starts_on: string | null;
  ends_on: string | null;
  submission_deadline: string | null;
  status: 'draft' | 'open' | 'locked' | 'closed';
  plan_count: number;
}

export interface TeamRow {
  employee_id: string;
  name: string;
  designation: string;
  department: string;
  zone: string;
  plan: PlanSummary | null;
}

/* One error shape for the whole product. The server answers a refused workflow
   step with a sentence AND, when a sheet is incomplete, the list of what is
   missing — both matter to the person reading it, so both survive. */
export class ApiError extends Error {
  problems: string[];
  status: number;
  constructor(message: string, problems: string[] = [], status = 0) {
    super(message);
    this.problems = problems;
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${GS_API}${path}`, init);
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.');
  }
  const data = await r.json().catch(() => ({} as Record<string, unknown>));
  if (!r.ok) {
    throw new ApiError(
      (data as { error?: string }).error || 'Something went wrong.',
      (data as { problems?: string[] }).problems || [],
      r.status,
    );
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ── sign in ───────────────────────────────────────────────────────────────────
export const sendOtp = (employee_id: string) =>
  call<{ masked_email: string; name: string; dev_otp?: string }>('/auth/send-otp/', json({ employee_id }));

export const verifyOtp = (employee_id: string, otp: string) =>
  call<{ employee: Employee }>('/auth/verify-otp/', json({ employee_id, otp }));

export const sendAdminOtp = () =>
  call<{ masked_email: string; dev_otp?: string }>('/auth/admin-otp/', json({}));

export const verifyAdminOtp = (otp: string) =>
  call<{ employee: Employee }>('/auth/admin-verify/', json({ otp }));

// ── reference ─────────────────────────────────────────────────────────────────
export const getMeta = () =>
  call<{ categories: string[]; frequencies: string[]; statuses: { value: string; label: string }[] }>('/meta/');

export const getCycles = (openOnly = false) =>
  call<Cycle[]>(`/cycles/${openOnly ? '?open=1' : ''}`);

export const createCycle = (body: Partial<Cycle> & { created_by?: string }) =>
  call<Cycle>('/cycles/', json(body));

export const updateCycle = (id: number, body: Partial<Cycle>) =>
  call<Cycle>(`/cycles/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// ── the goal sheet ────────────────────────────────────────────────────────────
/* `role` is not decoration: only an employee's own visit may CREATE a sheet.
   A reviewer opening a colleague who has not started gets a clear 404 rather
   than silently bringing a plan into existence just by looking at it. */
export const getPlan = (employeeId: string, cycleId: number, role: Role) =>
  call<Plan>(`/plans/${encodeURIComponent(employeeId)}/${cycleId}/?role=${role}`);

export const getPlanById = (planId: number) => call<Plan>(`/plans/${planId}/`);

export const savePlan = (employeeId: string, cycleId: number, role: Role, kras: KRA[]) =>
  call<Plan>(`/plans/${encodeURIComponent(employeeId)}/${cycleId}/`, json({ role, kras }));

export const actOnPlan = (planId: number, body: {
  role: Role; action: string; kras?: KRA[]; note?: string;
  actor_name?: string; actor_employee_id?: string;
}) => call<Plan>(`/plans/${planId}/action/`, json(body));

export const reopenPlan = (planId: number, actor_name: string, note: string) =>
  call<Plan>(`/plans/${planId}/reopen/`, json({ actor_name, note }));

export const myPlans = (employeeId: string) =>
  call<PlanSummary[]>(`/my/${encodeURIComponent(employeeId)}/plans/`);

// ── teams ─────────────────────────────────────────────────────────────────────
export const managerTeam = (id: string, cycleId?: number) =>
  call<TeamRow[]>(`/manager/${encodeURIComponent(id)}/team/${cycleId ? `?cycle_id=${cycleId}` : ''}`);

export const hodTeam = (id: string, cycleId?: number) =>
  call<TeamRow[]>(`/hod/${encodeURIComponent(id)}/team/${cycleId ? `?cycle_id=${cycleId}` : ''}`);

// ── admin ─────────────────────────────────────────────────────────────────────
export const listEmployees = (q = '') =>
  call<Employee[]>(`/employees/${q ? `?q=${encodeURIComponent(q)}` : ''}`);

export const updateEmployee = (employeeId: string, body: Partial<Employee>) =>
  call<Employee>(`/employees/${encodeURIComponent(employeeId)}/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

export const importEmployees = async (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return call<{ created: number; updated: number; errors: string[]; error_count: number }>(
    '/employees/import/', { method: 'POST', body: fd });
};

export const allPlans = (cycleId?: number, status?: string) => {
  const q = new URLSearchParams();
  if (cycleId) q.set('cycle_id', String(cycleId));
  if (status) q.set('status', status);
  return call<PlanSummary[]>(`/all-plans/${q.toString() ? `?${q}` : ''}`);
};

export const getOverview = (cycleId?: number) =>
  call<{
    employees: number; managers: number; hods: number; plans: number;
    not_started: number; by_status: Record<string, number>; accepted: number;
    cycles: Cycle[]; departments: string[];
  }>(`/overview/${cycleId ? `?cycle_id=${cycleId}` : ''}`);

// ── presentation helpers ──────────────────────────────────────────────────────

/** dd-mm-yyyy, the format used across the intranet. */
export const d = (v: string | null | undefined): string => {
  if (!v) return '—';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(v);
};

export const dt = (v: string | null | undefined): string => {
  if (!v) return '—';
  const date = d(v);
  const t = String(v).match(/T(\d{2}:\d{2})/);
  return t ? `${date} ${t[1]}` : date;
};

/* Status colours. Amber is "waiting on someone", emerald is "agreed", rose is
   "came back" — the same language the rest of the intranet uses, so a colour
   means one thing across tools. */
export const STATUS_TONE: Record<PlanStatus, { chip: string; dot: string }> = {
  draft:             { chip: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400' },
  submitted:         { chip: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500' },
  with_hod:          { chip: 'bg-violet-50 text-violet-700 border-violet-200',     dot: 'bg-violet-500' },
  awaiting_employee: { chip: 'bg-sky-50 text-sky-700 border-sky-200',              dot: 'bg-sky-500' },
  accepted:          { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  returned:          { chip: 'bg-rose-50 text-rose-700 border-rose-200',           dot: 'bg-rose-500' },
};

export const ROLE_LABEL: Record<string, string> = {
  employee: 'Employee', manager: 'Manager', hod: 'HOD', admin: 'Admin',
};

export const blankKpi = (): KPI => ({
  _k: Math.random(), metric: '', weightage: '', frequency: '',
  unit_of_measurement: '', parameter_type: '', data_source: '', target_value: '',
});

export const blankKra = (category: string): KRA => ({
  _k: Math.random(), category, title: '', description: '', kpis: [blankKpi()],
});

export const totalWeight = (kras: KRA[]): number =>
  Math.round(kras.reduce((s, k) =>
    s + k.kpis.reduce((ks, kpi) => ks + (Number(kpi.weightage) || 0), 0), 0) * 100) / 100;

/** Plain-English rendering of one change, for the history panel. */
export const FIELD_LABEL: Record<string, string> = {
  weightage: 'Weightage', target_value: 'Plan / Target', frequency: 'Frequency',
  unit_of_measurement: 'Unit', parameter_type: 'Direction', data_source: 'Data source',
};

export function describeChange(c: Change): string {
  switch (c.type) {
    case 'kra_added':   return `Added KRA "${c.kra}"${c.category ? ` under ${c.category}` : ''}`;
    case 'kra_removed': return `Removed KRA "${c.kra}"${c.category ? ` from ${c.category}` : ''}`;
    case 'kpi_added':   return `Added KPI "${c.kpi}" to "${c.kra}"`;
    case 'kpi_removed': return `Removed KPI "${c.kpi}" from "${c.kra}"`;
    case 'kpi_changed':
      return `${FIELD_LABEL[c.field || ''] || c.field} on "${c.kpi}": ${
        c.from === '' || c.from === null || c.from === undefined ? '(blank)' : c.from} → ${
        c.to === '' || c.to === null || c.to === undefined ? '(blank)' : c.to}`;
    default: return 'Changed';
  }
}
