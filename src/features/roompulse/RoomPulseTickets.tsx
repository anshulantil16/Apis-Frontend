/* Support-ticket data model — shared between the "IT Tickets" tab of the
   Support Desk popup (see RoomPulsePage.tsx's SupportDeskModal) and the
   My Requests / Approvals views. Backed by the real /api/roompulse/tickets/
   endpoints (see Apis-Backend/roompulse/views/tickets.py) — reviewed by the
   IT Support role rather than Admin, same split as Admin vs IT Support in
   the Team roster. */

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'closed';

export interface TicketAttachment { id: number; name: string; url: string; }

export interface SupportTicket {
  id: number;
  kind: 'ticket';
  requested_by_name: string;
  requested_by_email: string;
  department: string;
  category: string;
  category_label: string;
  priority: Priority;
  priority_label: string;
  subject: string;
  description: string;
  related_to: string;
  attachments: TicketAttachment[];
  status: TicketStatus;
  status_label: string;
  reviewed_by: string;
  reviewed_at: string | null;
  admin_remarks: string;
  created_at: string;
  updated_at: string;
}

export const TICKET_CATEGORY_LABEL: Record<string, string> = {
  account_login_access: 'Account / Login Access',
  printer_scanner: 'Printer / Scanner',
  vpn_access: 'VPN Access',
  system_application_access: 'System / Application Access',
  software_installation: 'Software Installation',
  antivirus_security: 'Antivirus / Security',
  microsoft_365: 'Microsoft 365',
  teams_video_conferencing: 'Teams / Video Conferencing',
  server_storage: 'Server / Storage',
  database_access: 'Database Access',
  mobile_device_support: 'Mobile / Device Support',
  it_asset_request: 'IT Asset Request',
  other: 'Other',
};
export const TICKET_RELATED_TO_OPTIONS = [
  'LAN / Network', 'WiFi', 'Laptop / Desktop', 'Printer / Scanner', 'Email / Outlook',
  'VPN / Remote Access', 'Software Installation', 'Peripherals (Mouse, Keyboard, etc.)', 'Other',
];
export const TICKET_PRIORITY_META: Record<Priority, { label: string; dot: string; text: string }> = {
  low:      { label: 'Low',      dot: 'bg-emerald-500', text: 'text-emerald-600' },
  medium:   { label: 'Medium',   dot: 'bg-amber-500',   text: 'text-amber-600' },
  high:     { label: 'High',     dot: 'bg-orange-500',  text: 'text-orange-600' },
  critical: { label: 'Critical', dot: 'bg-rose-500',    text: 'text-rose-600' },
};

/* Priority as it arrives from the API is just a string, and the queues that
 * render it hold their rows as any[]. Indexing the table above with that is
 * both a type error and a latent crash: an unrecognised priority would read
 * .label off undefined and blank the panel. One lookup, with a fallback. */
export function ticketPriorityMeta(priority: unknown) {
  const key = String(priority ?? '').toLowerCase() as Priority;
  return TICKET_PRIORITY_META[key] ?? {
    label: String(priority ?? 'Unknown'),
    dot: 'bg-slate-400',
    text: 'text-slate-500',
  };
}

export function fmtTicketWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
