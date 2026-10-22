'use client';

import { useAuth } from '@/components/auth-context';
import { isCompanyTutorProfile } from '@/domain/company';
import { CorporateRestrictionNotice } from '@/components/company/corporate-restriction-notice';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();

  if (!isLoading && isCompanyTutorProfile(profile)) {
    return (
      <DashboardLayout>
        <CorporateRestrictionNotice
          feature="Automatizaciones y Canales"
          description="La configuración de bots de WhatsApp, servicios externos y flujos automáticos es administrada exclusivamente por la empresa titular."
        />
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}
