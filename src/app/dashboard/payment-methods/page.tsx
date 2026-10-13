import { redirect } from 'next/navigation';

export default function LegacyDashboardPaymentMethodsPage() {
  redirect('/settings/payment-methods');
}
