import { redirect } from 'next/navigation';

export default function DeprecatedContentGeneratorPage() {
  redirect('/marketing/campaigns');
}
