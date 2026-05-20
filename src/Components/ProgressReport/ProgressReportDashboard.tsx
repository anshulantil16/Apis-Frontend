import { EmployeeProgressView } from './employee/EmployeeProgressView';
import { TeamProgressView } from './manager/TeamProgressView';
import { OrgAnalyticsView } from './hr/OrgAnalyticsView';

interface Props {
  role: 'employee' | 'manager' | 'hr';
  user: any;
}

export function ProgressReportDashboard({ role, user }: Props) {
  if (role === 'employee') return <EmployeeProgressView employee={user} />;
  if (role === 'manager')  return <TeamProgressView manager={user} />;
  return <OrgAnalyticsView hrUser={user} />;
}
