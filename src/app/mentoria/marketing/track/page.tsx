
'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Rocket, 
  TrendingUp, 
  Users, 
  MousePointer2, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Calendar,
  Search,
  Mail,
  Instagram,
  Megaphone,
  Layout,
  Activity,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CampaignTrackingPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  // Use the same collection as the builder
  const salesPagesQuery = useMemoFirebase(() => {
    if (!db || !profile?.uid) return null;
    return query(
      collection(db, 'salesPages'),
      where('mentorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.uid]);

  const { data: campaigns, isLoading } = useCollection(salesPagesQuery);

  // Real stats from Firestore
  const enrichedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.map(c => {
      const stats = {
        totalImpressions: c.stats?.totalImpressions || 0,
        totalClicks: c.stats?.totalClicks || 0,
        conversions: c.stats?.conversions || 0,
        channelBreakdown: c.stats?.channelBreakdown || {
          social: { reach: 0, clicks: 0, conversions: 0 },
          email: { reach: 0, clicks: 0, conversions: 0 },
          ads: { reach: 0, clicks: 0, conversions: 0 }
        }
      };
      const cr = stats.totalClicks > 0 ? ((stats.conversions / stats.totalClicks) * 100).toFixed(1) : "0.0";
      return { ...c, stats, cr };
    });
  }, [campaigns]);

  const aggregateStats = useMemo(() => {
    return enrichedCampaigns.reduce((acc, c) => ({
      impressions: acc.impressions + (c.stats.totalImpressions || 0),
      clicks: acc.clicks + (c.stats.totalClicks || 0),
      conversions: acc.conversions + (c.stats.conversions || 0),
      channelConvs: {
        social: (acc.channelConvs?.social || 0) + (c.stats.channelBreakdown?.social?.conversions || 0),
        email: (acc.channelConvs?.email || 0) + (c.stats.channelBreakdown?.email?.conversions || 0),
        ads: (acc.channelConvs?.ads || 0) + (c.stats.channelBreakdown?.ads?.conversions || 0)
      }
    }), { 
      impressions: 0, 
      clicks: 0, 
      conversions: 0, 
      channelConvs: { social: 0, email: 0, ads: 0 } 
    });
  }, [enrichedCampaigns]);

  const channelData = useMemo(() => {
    const data = [
      { name: 'Social', value: 0 },
      { name: 'Email', value: 0 },
      { name: 'Ads', value: 0 }
    ];
    enrichedCampaigns.forEach(c => {
      data[0].value += (c.stats.channelBreakdown?.social?.clicks || 0);
      data[1].value += (c.stats.channelBreakdown?.email?.clicks || 0);
      data[2].value += (c.stats.channelBreakdown?.ads?.clicks || 0);
    });
    return data;
  }, [enrichedCampaigns]);

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b'];

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Activity className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold tracking-wider uppercase text-[10px]">
              <TrendingUp className="h-3 w-3" />
              Inteligencia de Datos
            </div>
            <h1 className="text-4xl font-headline font-bold tracking-tight text-slate-900">Track de Campañas</h1>
            <p className="text-slate-500 max-w-xl">
              Monitorea el rendimiento de tus lanzamientos en tiempo real y optimiza tu estrategia de conversión.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm">
              <Calendar className="mr-2 h-4 w-4 text-slate-400" />
              Últimos 30 días
            </Button>
            <Button className="rounded-xl bg-slate-900 shadow-lg shadow-slate-900/20 hover:bg-slate-800">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </header>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Impacto Total', value: aggregateStats.impressions.toLocaleString(), icon: Rocket, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
            { label: 'Clicks Únicos', value: aggregateStats.clicks.toLocaleString(), icon: MousePointer2, color: 'text-pink-600', bg: 'bg-pink-50', trend: '+8%' },
            { label: 'Conversiones', value: aggregateStats.conversions.toLocaleString(), icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+15%' },
            { label: 'CR Promedio', value: `${((aggregateStats.conversions / aggregateStats.clicks) * 100 || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+2%' },
          ].map((kpi, i) => (
            <Card key={i} className="border-none shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden group">
              <CardContent className="p-6 relative">
                <div className={cn("absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity", kpi.color)}>
                  <kpi.icon className="h-24 w-24" />
                </div>
                <div className="flex justify-between items-start">
                  <div className={cn("p-2 rounded-xl mb-4", kpi.bg)}>
                    <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                  <Badge variant="secondary" className="bg-white/80 text-[10px] font-bold text-emerald-600 border-none shadow-sm">
                    {kpi.trend}
                  </Badge>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts & Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Rendimiento Temporal</CardTitle>
              <CardDescription>Clicks totales agregados de todas las campañas activas.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, color: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Channel Mix */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Mix de Canales</CardTitle>
              <CardDescription>Distribución de tráfico por medio.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { name: 'Instagram / TikTok', clicks: channelData[0].value, convs: aggregateStats.channelConvs?.social || 0, icon: Instagram, color: 'bg-indigo-500', pct: 65 },
                  { name: 'Email Marketing', clicks: channelData[1].value, convs: aggregateStats.channelConvs?.email || 0, icon: Mail, color: 'bg-pink-500', pct: 20 },
                  { name: 'Ads (Meta/Google)', clicks: channelData[2].value, convs: aggregateStats.channelConvs?.ads || 0, icon: Megaphone, color: 'bg-amber-500', pct: 15 },
                ].map((channel, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg text-white", channel.color)}>
                          <channel.icon className="h-3 w-3" />
                        </div>
                        <span className="font-bold text-slate-700">{channel.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 leading-none">{channel.clicks.toLocaleString()} clicks</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{channel.convs} ventas</p>
                      </div>
                    </div>
                    <Progress value={channel.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Insight IA</p>
                  <p className="text-xs text-indigo-900 font-bold mt-1">
                    Instagram es tu canal con mejor ROI (+22%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Table */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Listado de Campañas</CardTitle>
              <CardDescription>Gestión y resultados individuales por lanzamiento.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar campaña..." 
                className="pl-9 h-9 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-slate-50/50 border-y border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Campaña / Mentor</th>
                    <th className="px-6 py-4 text-center">Impacto</th>
                    <th className="px-6 py-4 text-center">Clicks</th>
                    <th className="px-6 py-4 text-center">Convs.</th>
                    <th className="px-6 py-4 text-center">CR (%)</th>
                    <th className="px-6 py-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrichedCampaigns
                    .filter(c => c.title?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((campaign, i) => (
                    <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm group-hover:scale-110 transition-transform">
                            {campaign.title?.[0] || 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{campaign.title}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                              Creado: {campaign.createdAt?.toDate ? format(campaign.createdAt.toDate(), 'dd MMM yyyy', { locale: es }) : 'Hoy'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">
                        {campaign.stats.totalImpressions.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">
                        {campaign.stats.totalClicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-900">
                        {campaign.stats.conversions.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold">
                          {campaign.cr}%
                        </Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="rounded-full border-slate-200 text-slate-500 font-bold text-[10px] uppercase px-3">
                            Activa
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {enrichedCampaigns.length === 0 && (
              <div className="py-20 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <Activity className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900">Sin estadísticas aún</h3>
                  <p className="text-sm text-slate-500 max-w-sm">Genera y publica tu primera campaña para empezar a recibir métricas de rendimiento real.</p>
                </div>
                <Button variant="outline" className="rounded-xl mt-2" onClick={() => window.location.href='/mentoria/marketing/pages'}>
                  Ir a Generación
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
