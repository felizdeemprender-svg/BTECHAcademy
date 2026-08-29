'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { saveAiPricingConfig } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Zap, BrainCircuit, Mic, Image as ImageIcon, Film } from 'lucide-react';

export default function AiPricingAdminPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    geminiPricePerMillionTokens: 0.30,
    geminiMarkupPercentage: 30,
    ttsPricePerMillionChars: 15.00,
    ttsMarkupPercentage: 40,
    imagePricePerHundred: 3.00,
    imageMarkupPercentage: 50,
    videoPricePerMinute: 0.60,
    videoMarkupPercentage: 50,
    omniPricePerMinute: 1.00,
    omniMarkupPercentage: 10
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'ai_pricing'));
        if (snap.exists()) {
          setConfig(snap.data() as any);
        }
      } catch (error: any) {
        // Usamos warn en vez de error para evitar que Next.js levante el overlay rojo por el bug ca9 de HMR
        console.warn("Advertencia cargando config de precios (probablemente HMR):", error.message);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [db]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveAiPricingConfig(config);
      if (result.success) {
        toast({
          title: 'Configuración Guardada',
          description: 'Las tarifas y márgenes de IA han sido actualizados globalmente.'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de permisos',
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNumChange = (field: string, val: string) => {
    setConfig(prev => ({ ...prev, [field]: parseFloat(val) || 0 }));
  };

  if (loading) return <DashboardLayout><div className="p-20 flex justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <header>
          <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Ecosistema Económico IA</h1>
          <p className="text-muted-foreground mt-2">Configura los costos base de proveedores y tu margen de rentabilidad.</p>
        </header>

        <Card className="overflow-hidden border-muted">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-5 rounded-tl-xl">Motor de IA</th>
                  <th className="px-6 py-5">Unidad de Medida</th>
                  <th className="px-6 py-5">Costo Real (A Nosotros) USD</th>
                  <th className="px-6 py-5">Margen (%)</th>
                  <th className="px-6 py-5 rounded-tr-xl">Cobro al Tutor USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {/* ---------------- CORTE: TEXTO ---------------- */}
                <tr className="bg-muted/50 border-t-4 border-muted">
                  <td colSpan={5} className="px-6 py-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Generación de Texto & LLMs
                  </td>
                </tr>
                {/* Texto */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/15 rounded-xl text-primary"><BrainCircuit className="w-5 h-5" /></div>
                      <span className="font-bold text-foreground text-base">Texto (Gemini AI)</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-muted-foreground">Por 1 Millón tokens</td>
                  <td className="px-6 py-5">
                    <Input type="number" step="0.01" value={config.geminiPricePerMillionTokens} onChange={e => handleNumChange('geminiPricePerMillionTokens', e.target.value)} className="w-28 font-bold h-10 border-muted focus:border-primary" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative w-28">
                      <Input type="number" value={config.geminiMarkupPercentage} onChange={e => handleNumChange('geminiMarkupPercentage', e.target.value)} className="pl-8 font-bold h-10 border-muted focus:border-primary" />
                      <span className="absolute left-3 top-3 text-muted-foreground font-black text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-xl text-primary">${(config.geminiPricePerMillionTokens * (1 + config.geminiMarkupPercentage / 100)).toFixed(4)}</span>
                  </td>
                </tr>

                {/* ---------------- CORTE: AUDIO ---------------- */}
                <tr className="bg-muted/50 border-t-4 border-muted">
                  <td colSpan={5} className="px-6 py-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Audio y Voces (Text-to-Speech)
                  </td>
                </tr>
                {/* TTS Edge (Gratuito) */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-success/15 rounded-xl text-success"><Mic className="w-5 h-5" /></div>
                      <div>
                        <span className="font-bold text-foreground text-base block">Voces Estándar (Edge)</span>
                        <span className="text-[10px] text-muted-foreground">Mateo, Elena, Carlos</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-muted-foreground">Cualquier uso</td>
                  <td className="px-6 py-5"><span className="text-muted-foreground font-bold pl-4">$0.00</span></td>
                  <td className="px-6 py-5"><span className="text-muted-foreground font-bold pl-4">0%</span></td>
                  <td className="px-6 py-5"><span className="font-black text-xl text-success">$0.00</span></td>
                </tr>

                {/* TTS Premium */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-warn/15 rounded-xl text-warn"><Mic className="w-5 h-5" /></div>
                      <div>
                        <span className="font-bold text-foreground text-base block">Voces Premium (Google TTS)</span>
                        <span className="text-[10px] text-muted-foreground">Modelos Neural2 Alta Fidelidad</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-muted-foreground">Por 1 Millón chars</td>
                  <td className="px-6 py-5">
                    <Input type="number" step="0.1" value={config.ttsPricePerMillionChars} onChange={e => handleNumChange('ttsPricePerMillionChars', e.target.value)} className="w-28 font-bold h-10 border-muted focus:border-warn" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative w-28">
                      <Input type="number" value={config.ttsMarkupPercentage} onChange={e => handleNumChange('ttsMarkupPercentage', e.target.value)} className="pl-8 font-bold h-10 border-muted focus:border-warn" />
                      <span className="absolute left-3 top-3 text-muted-foreground font-black text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-xl text-warn">${(config.ttsPricePerMillionChars * (1 + config.ttsMarkupPercentage / 100)).toFixed(2)}</span>
                  </td>
                </tr>

                {/* ---------------- CORTE: IMÁGENES ---------------- */}
                <tr className="bg-muted/50 border-t-4 border-muted">
                  <td colSpan={5} className="px-6 py-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Generación de Imágenes
                  </td>
                </tr>
                {/* Imagen */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-danger/15 rounded-xl text-danger"><ImageIcon className="w-5 h-5" /></div>
                      <span className="font-bold text-foreground text-base">Imágenes (Google Imagen)</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-muted-foreground">Por 100 imágenes</td>
                  <td className="px-6 py-5">
                    <Input type="number" step="0.1" value={config.imagePricePerHundred} onChange={e => handleNumChange('imagePricePerHundred', e.target.value)} className="w-28 font-bold h-10 border-muted focus:border-danger" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative w-28">
                      <Input type="number" value={config.imageMarkupPercentage} onChange={e => handleNumChange('imageMarkupPercentage', e.target.value)} className="pl-8 font-bold h-10 border-muted focus:border-danger" />
                      <span className="absolute left-3 top-3 text-muted-foreground font-black text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-xl text-danger">${(config.imagePricePerHundred * (1 + config.imageMarkupPercentage / 100)).toFixed(2)}</span>
                  </td>
                </tr>

                {/* ---------------- CORTE: VIDEO ---------------- */}
                <tr className="bg-muted/50 border-t-4 border-muted">
                  <td colSpan={5} className="px-6 py-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Producción de Video
                  </td>
                </tr>
                {/* Video FFmpeg */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600"><Film className="w-5 h-5" /></div>
                      <span className="font-bold text-foreground text-base">Video (Ensamble FFmpeg)</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-muted-foreground">Por Minuto Render</td>
                  <td className="px-6 py-5">
                    <Input type="number" step="0.01" value={config.videoPricePerMinute} onChange={e => handleNumChange('videoPricePerMinute', e.target.value)} className="w-28 font-bold h-10 border-muted focus:border-blue-500" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative w-28">
                      <Input type="number" value={config.videoMarkupPercentage} onChange={e => handleNumChange('videoMarkupPercentage', e.target.value)} className="pl-8 font-bold h-10 border-muted focus:border-blue-500" />
                      <span className="absolute left-3 top-3 text-muted-foreground font-black text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-xl text-blue-600">${(config.videoPricePerMinute * (1 + config.videoMarkupPercentage / 100)).toFixed(2)}</span>
                  </td>
                </tr>

                {/* Video Omni */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600"><Film className="w-5 h-5" /></div>
                      <div>
                        <span className="font-bold text-foreground text-base block">Video (Google Veo 2)</span>
                        <span className="text-[10px] text-muted-foreground">Se suma al costo de FFmpeg</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-muted-foreground">Por Minuto Generado</td>
                  <td className="px-6 py-5">
                    <Input type="number" step="0.01" value={config.omniPricePerMinute} onChange={e => handleNumChange('omniPricePerMinute', e.target.value)} className="w-28 font-bold h-10 border-muted focus:border-indigo-500" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative w-28">
                      <Input type="number" value={config.omniMarkupPercentage} onChange={e => handleNumChange('omniMarkupPercentage', e.target.value)} className="pl-8 font-bold h-10 border-muted focus:border-indigo-500" />
                      <span className="absolute left-3 top-3 text-muted-foreground font-black text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-xl text-indigo-600">${(config.omniPricePerMinute * (1 + config.omniMarkupPercentage / 100)).toFixed(2)}</span>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-end pt-8">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full md:w-auto h-16 rounded-2xl px-12 font-black text-lg bg-foreground text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Guardar Configuración Económica
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
