'use client';

import { SidebarNav } from '@/components/layout/sidebar-nav';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { SubscriptionAlert } from '@/components/dashboard/subscription-alert';
import { Logo } from '@/components/logo';
import { EvoChatWidget } from "@/components/evo/evo-chat-widget";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      // Forzamos redirección inmediata tras el cierre de sesión exitoso
      router.replace('/auth');
    } catch (error) {
      console.error("Error during manual logout:", error);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh bg-background overflow-hidden font-body w-full">
        <Sidebar collapsible="offcanvas" className="border-r border-[hsl(var(--sidebar-border))]">
          <SidebarHeader className="p-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-accent/20 transition-transform group-hover:rotate-12">
                <Logo size={24} />
              </div>
              <span className="font-headline font-bold text-xl text-[hsl(var(--sidebar-foreground))] tracking-tight">FastoriaAcademy</span>
            </Link>
          </SidebarHeader>
          
          <SidebarContent className="px-2">
            <SidebarNav />
          </SidebarContent>

          <SidebarFooter className="p-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-2 ring-white/10">
                  <AvatarImage src={profile?.photoURL || undefined} />
                  <AvatarFallback className="bg-white/10 text-xs font-bold text-white uppercase">{profile?.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{profile?.displayName}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5 line-clamp-1">{profile?.roles[0]}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full justify-start text-white/40 hover:text-danger hover:bg-danger/10 h-9 rounded-xl font-bold text-xs p-2"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="-ml-1 h-10 w-10 rounded-xl hover:bg-primary/5 text-primary" />
            <div className="h-4 w-px bg-border mx-2" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 truncate">
                Panel Institucional • FastoriaAcademy
              </p>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {/* Banner de alerta de suscripción (past_due / suspended) */}
            {profile?.subscription?.status && profile.subscription.status !== 'active' && profile.subscription.status !== 'trialing' && (
              <SubscriptionAlert
                status={profile.subscription.status}
                gracePeriodEndsAt={profile.subscription.gracePeriodEndsAt}
                trialEndsAt={profile.subscription.trialEndsAt}
              />
            )}
            <div className="flex-1 p-4 lg:p-8">
              <div className="max-w-7xl mx-auto pb-12">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
        <EvoChatWidget />
      </div>
    </SidebarProvider>
  );
}
