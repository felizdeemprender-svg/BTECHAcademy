'use client';

import { EvoAssistant } from '@/components/evo/evo-assistant';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { isCompanyTutorProfile } from '@/domain/company';
import { CorporateRestrictionNotice } from '@/components/company/corporate-restriction-notice';

export default function SettingsEvoPage() {
  const { profile } = useAuth();
  const isCorporateTutor = isCompanyTutorProfile(profile);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl p-4 lg:p-8">
        {isCorporateTutor ? (
          <CorporateRestrictionNotice
            feature="Evo"
            description="El asistente inteligente y las automatizaciones de Evo son administrados directamente por la empresa titular a la que perteneces."
          />
        ) : (
          <EvoAssistant />
        )}
      </div>
    </DashboardLayout>
  );
}

