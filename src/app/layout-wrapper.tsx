
'use client';

import { AuthProvider } from '@/components/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { EvoChatWidget } from '@/components/evo/evo-chat-widget';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        <ThemeProvider>
          {children}
          <EvoChatWidget />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
