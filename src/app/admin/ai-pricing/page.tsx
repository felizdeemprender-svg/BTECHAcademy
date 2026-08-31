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
import { getAiConsumptionData, getAiConsumption24h } from './actions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AiPricingAdminPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    geminiPricePerMillionTokens: 0.30,
    geminiMarkupPercentage: 30,
    imagePricePerHundred: 3.00,
    imageMarkupPercentage: 50,
    videoPricePerMinute: 0.60,
    videoMarkupPercentage: 50,
    omniPricePerMinute: 1.00,
    omniMarkupPercentage: 10
  });
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartData24h, setChartData24h] = useState<any[]>([]);
  const [totals24h, setTotals24h] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('Todos');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'ai_pricing'));
        if (snap.exists()) {
          setConfig(snap.data() as any);
        }
      } catch (error: any) {
        console.warn("Advertencia cargando config de precios (probablemente HMR):", error.message);
      } finally {
        setLoading(false);
      }
    };
    
    const loadChartData = async () => {
      try {
        const [result, result24h] = await Promise.all([
          getAiConsumptionData(),
          getAiConsumption24h()
        ]);
        
        if (result.success && result.data) {
          setChartData(result.data);
          if (result.data.length > 0) {
            const months = Array.from(new Set(result.data.map((d: any) => d.date.substring(0, 7)))).sort().reverse();
            if (months.length > 0) setSelectedMonth(months[0] as string);
          }
        }
        
        if (result24h.success && result24h.data) {
          setTotals24h(result24h.data);
          setChartData24h(result24h.chartData || []);
        }
      } catch (error: any) {
        console.warn("Error cargando consumo IA:", error.message);
      }
    };

    loadConfig();
    loadChartData();
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

  const availableMonths = Array.from(new Set(chartData.map(d => d.date.substring(0, 7)))).sort().reverse();
  
  const filteredChartData: any[] = [];
  if (selectedMonth) {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = i.toString().padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;
      
      const found = chartData.find(d => d.date === dateKey);
      if (found) {
        filteredChartData.push({ ...found, day: dayStr });
      } else {
        filteredChartData.push({
          date: dateKey,
          day: dayStr,
          Total: 0,
          'Texto (Gemini)': 0,
          'Video (Omni)': 0,
          'Video (FFmpeg)': 0,
          'Imágenes': 0,
          'Embeddings': 0,
        });
      }
    }
  }

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

        {/* ---------------- GRAFICO DE CONSUMO ---------------- */}
        <div className="pt-16 pb-8">
          {/* Tarjetas 24Hs */}
          {totals24h && (
            <div className="mb-16">
              <div className="mb-6">
                <h2 className="text-3xl font-headline font-bold text-primary tracking-tight mb-2">Consumo en Tiempo Real (24Hs)</h2>
                <p className="text-muted-foreground">Monitoreo del gasto generado en las últimas 24 horas exactas.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <Card className="border-primary/20 bg-primary/5 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-primary" /> Texto (Gemini)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-primary">${totals24h['Texto (Gemini)'].toFixed(2)}</div>
                  </CardContent>
                </Card>
                
                <Card className="border-danger/20 bg-danger/5 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ImageIcon className="w-4 h-4 text-danger" /> Imágenes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-danger">${totals24h['Imágenes'].toFixed(2)}</div>
                  </CardContent>
                </Card>
                
                <Card className="border-blue-500/20 bg-blue-500/5 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Film className="w-4 h-4 text-blue-500" /> Video (FFmpeg)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-blue-600">${totals24h['Video (FFmpeg)'].toFixed(2)}</div>
                  </CardContent>
                </Card>
                
                <Card className="border-indigo-500/20 bg-indigo-500/5 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Film className="w-4 h-4 text-indigo-500" /> Video (Omni)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-indigo-600">${totals24h['Video (Omni)'].toFixed(2)}</div>
                  </CardContent>
                </Card>
                
                <Card className="border-muted bg-foreground shadow-none text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2"><Zap className="w-4 h-4 text-white" /> Total Global</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-white">${totals24h['Total'].toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {chartData24h.length > 0 && (
                <div className="mt-6 border border-muted rounded-2xl p-6 bg-card/30">
                  <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest">Distribución por Hora</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData24h} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis 
                          dataKey="hour" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <RechartsTooltip 
                          cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                          contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => [`$${value.toFixed(3)}`, '']}
                        />
                        {selectedEngine === 'Todos' && (
                          <Line type="monotone" dataKey="Total" stroke="#1f2937" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} connectNulls strokeDasharray="5 5" />
                        )}
                        {(selectedEngine === 'Todos' || selectedEngine === 'Texto (Gemini)') && (
                          <Line type="monotone" dataKey="Texto (Gemini)" stroke="#10b981" strokeWidth={2} activeDot={{ r: 4 }} dot={{ r: 0 }} connectNulls />
                        )}
                        {(selectedEngine === 'Todos' || selectedEngine === 'Video (Omni)') && (
                          <Line type="monotone" dataKey="Video (Omni)" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 4 }} dot={{ r: 0 }} connectNulls />
                        )}
                        {(selectedEngine === 'Todos' || selectedEngine === 'Video (FFmpeg)') && (
                          <Line type="monotone" dataKey="Video (FFmpeg)" stroke="#8b5cf6" strokeWidth={2} activeDot={{ r: 4 }} dot={{ r: 0 }} connectNulls />
                        )}
                        {(selectedEngine === 'Todos' || selectedEngine === 'Imágenes') && (
                          <Line type="monotone" dataKey="Imágenes" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 4 }} dot={{ r: 0 }} connectNulls />
                        )}
                        {(selectedEngine === 'Todos' || selectedEngine === 'Embeddings') && (
                          <Line type="monotone" dataKey="Embeddings" stroke="#0ea5e9" strokeWidth={2} activeDot={{ r: 4 }} dot={{ r: 0 }} connectNulls />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-headline font-bold text-primary tracking-tight mb-2">Histórico de Consumo IA</h2>
              <p className="text-muted-foreground">Consumo (en créditos USD facturados) por motor, detallado por día del mes.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar Motor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los motores</SelectItem>
                  <SelectItem value="Texto (Gemini)">Texto (Gemini)</SelectItem>
                  <SelectItem value="Video (Omni)">Video (Omni)</SelectItem>
                  <SelectItem value="Video (FFmpeg)">Video (FFmpeg)</SelectItem>
                  <SelectItem value="Imágenes">Imágenes</SelectItem>
                  <SelectItem value="Embeddings">Embeddings</SelectItem>
                </SelectContent>
              </Select>

              {availableMonths.length > 0 && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m: any) => {
                      const [y, mo] = m.split('-');
                      const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
                      const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                      return <SelectItem key={m} value={m} className="capitalize">{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <Card className="overflow-hidden border-muted p-6">
            {filteredChartData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                      contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    {selectedEngine === 'Todos' && (
                      <Line type="monotone" dataKey="Total" stroke="#1f2937" strokeWidth={4} activeDot={{ r: 7 }} dot={{ r: 4 }} connectNulls strokeDasharray="5 5" />
                    )}
                    {(selectedEngine === 'Todos' || selectedEngine === 'Texto (Gemini)') && (
                      <Line type="monotone" dataKey="Texto (Gemini)" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} connectNulls />
                    )}
                    {(selectedEngine === 'Todos' || selectedEngine === 'Video (Omni)') && (
                      <Line type="monotone" dataKey="Video (Omni)" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} connectNulls />
                    )}
                    {(selectedEngine === 'Todos' || selectedEngine === 'Video (FFmpeg)') && (
                      <Line type="monotone" dataKey="Video (FFmpeg)" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} connectNulls />
                    )}
                    {(selectedEngine === 'Todos' || selectedEngine === 'Imágenes') && (
                      <Line type="monotone" dataKey="Imágenes" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} connectNulls />
                    )}
                    {(selectedEngine === 'Todos' || selectedEngine === 'Embeddings') && (
                      <Line type="monotone" dataKey="Embeddings" stroke="#0ea5e9" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} connectNulls />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground text-center">
                <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
                <p>No hay datos de consumo registrados en el mes seleccionado.</p>
              </div>
            )}
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
