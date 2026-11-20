/* Medical Insurance — calls the `insurance` Django app (see its sso.py).

   Nothing here handles a token or a secret. The browser asks the server for
   a finished URL and opens it; the shared secret that signs an employee in
   to the insurer never leaves the server, because anyone holding it could
   mint a token for any colleague's address and read their medical records. */
import { apiFetch } from '../portal/session';
import { apiBase } from '../../apiBase';

const INSURANCE_API = `${apiBase()}/api/insurance`;

export interface InsuranceEmployee {
  name: string;
  employeeCode: string;
  email: string;
  department: string;
  designation: string;
  location: string;
}

export interface InsuranceDestination {
  key: string;
  label: string;
}

export interface InsuranceOverview {
  /** Whether a launch will actually work — the connection is set up AND
      this person can be identified to the insurer. */
  ready: boolean;
  /** Why not, in words a non-technical person can act on. '' when ready. */
  reason: string;
  portalName: string;
  employee: InsuranceEmployee;
  destinations: InsuranceDestination[];
}

export async function fetchInsuranceOverview(): Promise<InsuranceOverview> {
  const r = await apiFetch(`${INSURANCE_API}/overview/`);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || 'Could not load your insurance details.');
  }
  return r.json();
}

/** A fresh single-use sign-in URL. Never cache one: it is a key to somebody's
    medical records with a three-hour life, and the insurer asks for one per
    attempt. */
export async function insuranceLaunchUrl(destination: string): Promise<string> {
  const r = await apiFetch(`${INSURANCE_API}/launch/`, {
    method: 'POST',
    body: JSON.stringify({ destination }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Could not open the insurance portal.');
  return body.url as string;
}
