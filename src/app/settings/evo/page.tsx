'use client';

import { EvoAssistant } from '@/components/evo/evo-assistant';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function SettingsEvoPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl p-4 lg:p-8">
        <EvoAssistant />
      </div>
    </DashboardLayout>
  );
}
