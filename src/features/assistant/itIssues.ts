/* Common IT problems Ask APIS recognises ("printer not working"), and how
 * each fills in Help Desk's IT ticket form - category, "related to" and a
 * subject - so the person only has to describe it and send. The assistant
 * names the issue in its action ("helpdesk:it-ticket|printer"); Help Desk
 * looks it up here. Categories and "related to" values are the ones the
 * ticket form offers (HelpDeskTickets.tsx). */

export interface ItIssue {
  key: string;
  /* What the bee calls it. */
  label: string;
  /* Words in a question that mean this issue. */
  words: string[];
  category: string;
  relatedTo: string;
  subject: string;
}

export const IT_ISSUES: ItIssue[] = [
  { key: 'printer', label: 'Printer or scanner', words: ['printer', 'printers', 'print', 'printing', 'scanner', 'scan'],
    category: 'printer_scanner', relatedTo: 'Printer / Scanner', subject: 'Printer / scanner not working' },
  { key: 'wifi', label: 'Wi-Fi', words: ['wifi', 'wi', 'wireless'],
    category: 'other', relatedTo: 'WiFi', subject: 'Wi-Fi not working' },
  { key: 'network', label: 'Internet or network', words: ['internet', 'network', 'lan', 'ethernet'],
    category: 'other', relatedTo: 'LAN / Network', subject: 'Internet / network not working' },
  { key: 'laptop', label: 'Laptop or desktop', words: ['laptop', 'desktop', 'computer', 'pc', 'slow', 'hang', 'hanging', 'freeze'],
    category: 'other', relatedTo: 'Laptop / Desktop', subject: 'Laptop / desktop problem' },
  { key: 'email', label: 'Email or Outlook', words: ['email', 'emails', 'outlook', 'mailbox'],
    category: 'microsoft_365', relatedTo: 'Email / Outlook', subject: 'Email / Outlook problem' },
  { key: 'vpn', label: 'VPN', words: ['vpn', 'remote'],
    category: 'vpn_access', relatedTo: 'VPN / Remote Access', subject: 'VPN not connecting' },
  { key: 'software', label: 'Software installation', words: ['install', 'installation', 'software'],
    category: 'software_installation', relatedTo: 'Software Installation', subject: 'Software installation request' },
  { key: 'peripherals', label: 'Mouse, keyboard or monitor', words: ['mouse', 'keyboard', 'monitor', 'headphone', 'headphones', 'headset', 'webcam', 'charger'],
    category: 'other', relatedTo: 'Peripherals (Mouse, Keyboard, etc.)', subject: 'Mouse / keyboard / monitor problem' },
  { key: 'login', label: 'Password or login', words: ['password', 'locked', 'lockout', 'credentials'],
    category: 'account_login_access', relatedTo: 'Other', subject: 'Login / password problem' },
  { key: 'teams', label: 'Teams or video calls', words: ['teams', 'zoom', 'meet', 'video', 'call'],
    category: 'teams_video_conferencing', relatedTo: 'Other', subject: 'Teams / video call problem' },
  { key: 'antivirus', label: 'Virus or security', words: ['virus', 'antivirus', 'malware', 'hacked', 'phishing'],
    category: 'antivirus_security', relatedTo: 'Other', subject: 'Antivirus / security problem' },
];

export function itIssueFor(words: string[]): ItIssue | undefined {
  return IT_ISSUES.find(i => i.words.some(w => words.includes(w)));
}
