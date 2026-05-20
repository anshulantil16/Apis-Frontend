const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const PROGRESS_API = `${API_BASE}/api/performance`;

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Goal progress updates ─────────────────────────────────────────────────────

export function getGoalProgress(goalId: number) {
  return apiFetch(`${PROGRESS_API}/goals/${goalId}/progress/`);
}

export function addGoalProgress(goalId: number, payload: {
  completion_pct: number;
  status: string;
  notes?: string;
  highlights?: string;
  blockers?: string;
}) {
  return apiFetch(`${PROGRESS_API}/goals/${goalId}/progress/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Employee progress report ──────────────────────────────────────────────────

export function getEmployeeProgressReport(employeeId: string) {
  return apiFetch(`${PROGRESS_API}/employee/${employeeId}/progress-report/`);
}

// ── Manager team progress ─────────────────────────────────────────────────────

export function getTeamProgressReport(managerId: string, cycleId?: number) {
  const q = cycleId ? `?cycle_id=${cycleId}` : '';
  return apiFetch(`${PROGRESS_API}/manager/${managerId}/team-progress/${q}`);
}

// ── HR org analytics ──────────────────────────────────────────────────────────

export function getOrgAnalytics(cycleId: number) {
  return apiFetch(`${PROGRESS_API}/org/analytics/?cycle_id=${cycleId}`);
}

export function getActiveCycles() {
  return apiFetch(`${PROGRESS_API}/cycles/active/`);
}

export function getAllCycles() {
  return apiFetch(`${PROGRESS_API}/cycles/`);
}
