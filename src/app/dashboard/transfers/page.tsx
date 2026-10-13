import { redirect } from 'next/navigation';

export default function LegacyDashboardTransfersPage() {
  redirect('/settings/transfers');
}
