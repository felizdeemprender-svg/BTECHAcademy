
'use client';

import { AuthProvider } from '@/components/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { FloatingEvoAssistant } from '@/components/evo/floating-evo-assistant';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        <ThemeProvider>
          {children}
          <FloatingEvoAssistant />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
