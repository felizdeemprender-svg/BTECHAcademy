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
    videoMarkupPercentage: 50
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
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header>
          <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Ecosistema Económico IA</h1>
          <p className="text-muted-foreground mt-2">Configura los costos base de proveedores y tu margen de rentabilidad.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all">
            <CardHeader className="bg-slate-50 border-b pb-6 relative">
              <div className="absolute top-4 right-4 p-2 bg-indigo-100 rounded-xl text-indigo-600">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-black text-slate-900">Gemini (Texto)</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Costo por 1 Millón de tokens</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Costo Base (USD)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={config.geminiPricePerMillionTokens} 
                    onChange={e => handleNumChange('geminiPricePerMillionTokens', e.target.value)} 
                    className="h-12 rounded-xl font-bold border-slate-100 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Margen (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={config.geminiMarkupPercentage} 
                      onChange={e => handleNumChange('geminiMarkupPercentage', e.target.value)} 
                      className="h-12 pl-8 rounded-xl font-bold border-slate-100 focus:border-indigo-500"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-black">%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex justify-between items-center">
                <span className="text-xs font-black text-indigo-900 uppercase">Precio de Venta</span>
                <span className="text-2xl font-black text-indigo-600">
                  ${(config.geminiPricePerMillionTokens * (1 + config.geminiMarkupPercentage / 100)).toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all">
            <CardHeader className="bg-slate-50 border-b pb-6 relative">
              <div className="absolute top-4 right-4 p-2 bg-amber-100 rounded-xl text-amber-600">
                <Mic className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-black text-slate-900">Voces (TTS)</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Costo por Millón de Caracteres</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Costo Base (USD)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={config.ttsPricePerMillionChars} 
                    onChange={e => handleNumChange('ttsPricePerMillionChars', e.target.value)} 
                    className="h-12 rounded-xl font-bold border-slate-100 focus:border-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Margen (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={config.ttsMarkupPercentage} 
                      onChange={e => handleNumChange('ttsMarkupPercentage', e.target.value)} 
                      className="h-12 pl-8 rounded-xl font-bold border-slate-100 focus:border-amber-500"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-black">%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex justify-between items-center">
                <span className="text-xs font-black text-amber-900 uppercase">Precio de Venta</span>
                <span className="text-2xl font-black text-amber-600">
                  ${(config.ttsPricePerMillionChars * (1 + config.ttsMarkupPercentage / 100)).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all">
            <CardHeader className="bg-slate-50 border-b pb-6 relative">
              <div className="absolute top-4 right-4 p-2 bg-rose-100 rounded-xl text-rose-600">
                <ImageIcon className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-black text-slate-900">Imágenes (SDXL)</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Costo por cada 100 imágenes</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Costo Base (USD)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={config.imagePricePerHundred} 
                    onChange={e => handleNumChange('imagePricePerHundred', e.target.value)} 
                    className="h-12 rounded-xl font-bold border-slate-100 focus:border-rose-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Margen (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={config.imageMarkupPercentage} 
                      onChange={e => handleNumChange('imageMarkupPercentage', e.target.value)} 
                      className="h-12 pl-8 rounded-xl font-bold border-slate-100 focus:border-rose-500"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-black">%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 flex justify-between items-center">
                <span className="text-xs font-black text-rose-900 uppercase">Precio de Venta</span>
                <span className="text-2xl font-black text-rose-600">
                  ${(config.imagePricePerHundred * (1 + config.imageMarkupPercentage / 100)).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all">
            <CardHeader className="bg-slate-50 border-b pb-6 relative">
              <div className="absolute top-4 right-4 p-2 bg-blue-100 rounded-xl text-blue-600">
                <Film className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-black text-slate-900">Video Rendering</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Costo por Minuto de Renderizado</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Costo Base (USD)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={config.videoPricePerMinute} 
                    onChange={e => handleNumChange('videoPricePerMinute', e.target.value)} 
                    className="h-12 rounded-xl font-bold border-slate-100 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Margen (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={config.videoMarkupPercentage} 
                      onChange={e => handleNumChange('videoMarkupPercentage', e.target.value)} 
                      className="h-12 pl-8 rounded-xl font-bold border-slate-100 focus:border-blue-500"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-black">%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex justify-between items-center">
                <span className="text-xs font-black text-blue-900 uppercase">Precio de Venta</span>
                <span className="text-2xl font-black text-blue-600">
                  ${(config.videoPricePerMinute * (1 + config.videoMarkupPercentage / 100)).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-8">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full md:w-auto h-16 rounded-2xl px-12 font-black text-lg bg-slate-900 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Guardar Configuración Económica
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
