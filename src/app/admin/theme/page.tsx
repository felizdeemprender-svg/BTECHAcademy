
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Palette, 
  Layers, 
  ShieldCheck, 
  Check, 
  Save, 
  Loader2, 
  Sparkles, 
  Monitor, 
  Focus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const THEME_PREMISES = [
  { 
    id: 'institucional', 
    name: 'Clásico Institucional', 
    desc: 'Equilibrio perfecto, bordes estándar y sombras suaves. Ideal para entornos formales.',
    icon: Monitor 
  },
  { 
    id: 'hd', 
    name: 'Alta Definición (HD)', 
    desc: 'Bordes reforzados (2px), sombras profundas y esquinas técnicas. Máximo contraste.',
    icon: Focus 
  },
  { 
    id: 'vanguardia', 
    name: 'Vanguardia Minimalist', 
    desc: 'Bordes ultra-redondeados, sombras etéreas y fondos limpios. Look fluido.',
    icon: Sparkles 
  }
] as const;

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function AdminThemePage() {
  const db = useFirestore();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const configRef = useMemoFirebase(() => doc(db, 'config', 'theme'), [db]);
  const { data: config, isLoading: configLoading } = useDoc(configRef);

  const [formData, setFormData] = useState({
    primaryColor: '#3B2D86',
    secondaryColor: '#6366f1',
    accentColor: '#ec4899',
    themeType: 'institucional' as 'institucional' | 'hd' | 'vanguardia'
  });

  useEffect(() => {
    if (config) {
      setFormData({
        primaryColor: config.primaryColor || '#3B2D86',
        secondaryColor: config.secondaryColor || '#6366f1',
        accentColor: config.accentColor || '#ec4899',
        themeType: config.themeType || 'institucional'
      });
    }
  }, [config]);

  const handleSaveTheme = () => {
    if (!profile?.roles.includes('admin')) return;
    setLoading(true);

    const saveData = {
      ...formData,
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid
    };

    setDoc(configRef, saveData, { merge: true })
      .then(() => {
        toast({ title: 'Identidad Aplicada', description: 'El nuevo tema global ha sido activado para todos los usuarios.' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: configRef.path,
          operation: 'update',
          requestResourceData: saveData
        }));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (configLoading) return <DashboardLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></DashboardLayout>;

  const previewHslPrimary = hexToHsl(formData.primaryColor);
  const previewHslSecondary = hexToHsl(formData.secondaryColor);
  const previewHslAccent = hexToHsl(formData.accentColor);
  
  const [h, s] = previewHslPrimary.split(' ');
  const backgroundHsl = `${h} ${s} 98%`;
  const mutedHsl = `${h} ${s} 92%`;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Identidad del Sistema</h1>
            <p className="text-muted-foreground text-lg font-medium">Controla la atmósfera visual y el profesionalismo de la plataforma.</p>
          </div>
          <Button onClick={handleSaveTheme} disabled={loading} className="h-14 px-8 rounded-2xl font-bold shadow-xl flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Aplicar Cambios Globales
          </Button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="card-prof p-8 space-y-8">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Premisa de Diseño
                </Label>
                <div className="grid gap-4 mt-4">
                  {THEME_PREMISES.map((premise) => (
                    <button 
                      key={premise.id}
                      onClick={() => setFormData({...formData, themeType: premise.id})}
                      className={cn(
                        "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-start gap-6 group",
                        formData.themeType === premise.id 
                          ? "bg-primary/5 border-primary shadow-lg" 
                          : "bg-white border-transparent hover:border-primary/20"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all",
                        formData.themeType === premise.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      )}>
                        <premise.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-lg">{premise.name}</h3>
                          {formData.themeType === premise.id && <Check className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{premise.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="card-prof p-8 space-y-6">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4" /> Paleta Maestra de Interfaz
              </Label>
              
              <div className="grid gap-6">
                {/* Primary Color */}
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-secondary/10 p-4 rounded-2xl">
                  <input 
                    type="color" 
                    value={formData.primaryColor} 
                    onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                    className="w-16 h-16 rounded-xl p-0 border-none cursor-pointer shadow-sm"
                  />
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Color Primario (Sidebar & Dash)</Label>
                    <Input 
                      value={formData.primaryColor} 
                      onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                      className="h-10 font-mono font-bold rounded-xl bg-white border-none"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-secondary/10 p-4 rounded-2xl">
                  <input 
                    type="color" 
                    value={formData.secondaryColor} 
                    onChange={e => setFormData({...formData, secondaryColor: e.target.value})}
                    className="w-16 h-16 rounded-xl p-0 border-none cursor-pointer shadow-sm"
                  />
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Color Secundario (Componentes)</Label>
                    <Input 
                      value={formData.secondaryColor} 
                      onChange={e => setFormData({...formData, secondaryColor: e.target.value})}
                      className="h-10 font-mono font-bold rounded-xl bg-white border-none"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-secondary/10 p-4 rounded-2xl">
                  <input 
                    type="color" 
                    value={formData.accentColor} 
                    onChange={e => setFormData({...formData, accentColor: e.target.value})}
                    className="w-16 h-16 rounded-xl p-0 border-none cursor-pointer shadow-sm"
                  />
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Color de Acento (Interacción)</Label>
                    <Input 
                      value={formData.accentColor} 
                      onChange={e => setFormData({...formData, accentColor: e.target.value})}
                      className="h-10 font-mono font-bold rounded-xl bg-white border-none"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="card-prof p-8 space-y-6 sticky top-8">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Vista Previa
              </h2>
              <p className="text-sm text-muted-foreground">Así es como los usuarios experimentarán el contraste y las formas.</p>
              
              <div 
                className={cn("space-y-6 py-4 p-6 rounded-[var(--radius)]", `theme-${formData.themeType}`)}
                style={{
                  '--primary': previewHslPrimary,
                  '--secondary': previewHslSecondary,
                  '--accent': previewHslAccent,
                  '--ring': previewHslAccent,
                  '--muted': mutedHsl,
                  '--background': backgroundHsl,
                  '--radius': formData.themeType === 'vanguardia' ? '2rem' : formData.themeType === 'hd' ? '0.5rem' : '1rem',
                  '--prof-border-width': formData.themeType === 'hd' ? '2px' : '1px',
                  '--prof-shadow': formData.themeType === 'hd' ? '0 20px 25px -5px rgba(0,0,0,0.15)' : formData.themeType === 'vanguardia' ? '0 35px 60px -12px rgba(0,0,0,0.2)' : '0 10px 15px -3px rgba(0,0,0,0.05)'
                } as any}
              >
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Botones Profesionales</Label>
                  <div className="flex gap-2">
                    <Button className="btn-prof bg-primary text-white flex-1 h-11 border-primary">Primario</Button>
                    <Button variant="outline" style={{ borderColor: `hsl(${previewHslAccent})`, color: `hsl(${previewHslAccent})` }} className="btn-prof flex-1 h-11">Acento</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Campos de Entrada</Label>
                  <Input className="input-prof w-full border-primary/20" placeholder="Ejemplo de campo..." />
                </div>

                <div 
                  className="p-6 rounded-2xl border space-y-3"
                  style={{ backgroundColor: `hsl(${previewHslSecondary})`, borderColor: `hsl(${previewHslPrimary} / 0.1)` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `hsl(${previewHslPrimary} / 0.1)`, color: `hsl(${previewHslPrimary})` }}>AI</div>
                    <p className="font-bold text-sm">Contraste de Fondo</p>
                  </div>
                  <div className="h-2 w-full rounded-full" style={{ backgroundColor: `hsl(${previewHslPrimary} / 0.1)` }}>
                    <div className="h-full rounded-full w-2/3" style={{ backgroundColor: `hsl(${previewHslAccent})` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
