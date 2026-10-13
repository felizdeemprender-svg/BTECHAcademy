import { redirect } from 'next/navigation';

export default function LegacyDashboardPlanPage() {
  redirect('/settings/plan');
}
