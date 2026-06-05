
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TermsUsageModal() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const termsRef = useMemoFirebase(() => doc(db, 'config', 'terms_usage'), [db]);
  const { data: termsConfig } = useDoc(termsRef);

  useEffect(() => {
    if (profile && profile.termsUsageAccepted === false) {
      setOpen(true);
    }
  }, [profile]);

  const handleAccept = async () => {
    if (!user || !accepted) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        termsUsageAccepted: true,
        termsUsageAcceptedAt: serverTimestamp()
      });
      setOpen(false);
      toast({ title: 'Términos Aceptados', description: 'Bienvenido al entorno institucional.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la aceptación.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl pointer-events-auto">
        <DialogHeader className="bg-primary p-8 text-white relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
            <ShieldCheck className="text-white h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-bold">Contrato de Uso Institucional</DialogTitle>
          <DialogDescription className="text-primary-foreground/70 text-sm mt-1">
            Para continuar, debes aceptar las normas de la plataforma Evolución Académica.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <ScrollArea className="h-[300px] pr-4">
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {termsConfig?.content || "Cargando términos institucionales..."}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-secondary/10 rounded-xl border border-dashed border-primary/20">
            <Checkbox 
              id="usage-accept" 
              checked={accepted} 
              onCheckedChange={(v) => setAccepted(!!v)} 
              className="h-5 w-5"
            />
            <Label htmlFor="usage-accept" className="text-xs font-bold cursor-pointer">
              He leído y acepto los Términos de Uso del Sistema.
            </Label>
          </div>

          <Button 
            onClick={handleAccept} 
            disabled={!accepted || loading} 
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} 
            Confirmar y Entrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
