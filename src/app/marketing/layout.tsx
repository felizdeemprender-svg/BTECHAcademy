'use client';

import { useAuth } from '@/components/auth-context';
import { isCompanyTutorProfile } from '@/domain/company';
import { CorporateRestrictionNotice } from '@/components/company/corporate-restriction-notice';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();

  if (!isLoading && isCompanyTutorProfile(profile)) {
    const hasMarketingRole = profile?.roles?.includes('marketing');
    const hasMarketingPerm = profile?.mentorPermissions?.includes('marketing_access') || profile?.mentorPermissions?.includes('landing_access');
    if (!hasMarketingRole && !hasMarketingPerm) {
      return (
        <DashboardLayout>
          <CorporateRestrictionNotice
            feature="Herramientas de Marketing y Ventas"
            description="El acceso a landings de venta, campañas y control de embajadores requiere que tu empresa te haya delegado potestades activas de Marketing."
          />
        </DashboardLayout>
      );
    }
  }

  return <>{children}</>;
}
