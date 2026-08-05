
'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { SmartFilterBar } from '@/components/ui/smart-filter-bar';
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
  MousePointer2, 
  Target, 
  Filter,
  Calendar,
  Search,
  Mail,
  Instagram,
  Megaphone,
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveTable, ResponsiveColumn } from '@/components/ui/responsive-table';
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
      where('mentorId', '==', profile.uid)
    );
  }, [db, profile?.uid]);

  const { data: rawCampaigns, isLoading } = useCollection(salesPagesQuery);

  const campaigns = useMemo(() => {
    if (!rawCampaigns) return null;
    return [...rawCampaigns].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawCampaigns]);

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

  const filteredCampaigns = enrichedCampaigns.filter((c: any) => c.title?.toLowerCase().includes(searchTerm.toLowerCase()));

  const campaignTableColumns: ResponsiveColumn<any>[] = [
    {
      key: 'campaign',
      header: 'Campaña / Mentor',
      hideOnMobile: true,
      cell: (campaign: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm">
            {campaign.title?.[0] || 'C'}
          </div>
          <div>
            <p className="font-bold text-foreground line-clamp-1">{campaign.title}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
              Creado: {campaign.createdAt?.toDate ? format(campaign.createdAt.toDate(), 'dd MMM yyyy', { locale: es }) : 'Hoy'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'impacto',
      header: 'Impacto',
      align: 'center',
      hideOnMobile: true,
      cell: (campaign: any) => (
        <span className="font-bold text-muted-foreground">{campaign.stats.totalImpressions.toLocaleString()}</span>
      ),
    },
    {
      key: 'clicks',
      header: 'Clicks',
      align: 'center',
      hideOnMobile: true,
      cell: (campaign: any) => (
        <span className="font-bold text-muted-foreground">{campaign.stats.totalClicks.toLocaleString()}</span>
      ),
    },
    {
      key: 'convs',
      header: 'Convs.',
      align: 'center',
      cell: (campaign: any) => (
        <span className="font-bold text-foreground">{campaign.stats.conversions.toLocaleString()}</span>
      ),
    },
    {
      key: 'cr',
      header: 'CR (%)',
      align: 'center',
      cell: (campaign: any) => (
        <Badge className="bg-success/10 text-success border-none font-bold">{campaign.cr}%</Badge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      align: 'right',
      hideOnMobile: true,
      cell: (campaign: any) => (
        <div className="flex items-center justify-end gap-2">
          <Badge variant="outline" className="rounded-full border-border text-muted-foreground font-bold text-[10px] uppercase px-3">
            Activa
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

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
            <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground">Track de Campañas</h1>
            <p className="text-muted-foreground max-w-xl">
              Monitorea el rendimiento de tus lanzamientos en tiempo real y optimiza tu estrategia de conversión.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-border shadow-sm">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              Últimos 30 días
            </Button>
            <Button className="rounded-xl bg-foreground shadow-lg shadow-foreground/20 hover:bg-foreground">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </header>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Impacto Total', value: aggregateStats.impressions.toLocaleString(), icon: Rocket, color: 'text-primary', bg: 'bg-primary/10', trend: '+12%' },
            { label: 'Clicks Únicos', value: aggregateStats.clicks.toLocaleString(), icon: MousePointer2, color: 'text-pink-600', bg: 'bg-pink-50', trend: '+8%' },
            { label: 'Conversiones', value: aggregateStats.conversions.toLocaleString(), icon: Target, color: 'text-warn', bg: 'bg-warn/10', trend: '+15%' },
            { label: 'CR Promedio', value: `${((aggregateStats.conversions / aggregateStats.clicks) * 100 || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', trend: '+2%' },
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
                  <Badge variant="secondary" className="bg-white/80 text-[10px] font-bold text-success border-none shadow-sm">
                    {kpi.trend}
                  </Badge>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{kpi.value}</h3>
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
              <CardTitle className="text-lg font-bold text-foreground">Mix de Canales</CardTitle>
              <CardDescription>Distribución de tráfico por medio.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { name: 'Instagram / TikTok', clicks: channelData[0].value, convs: aggregateStats.channelConvs?.social || 0, icon: Instagram, color: 'bg-primary', pct: 65 },
                  { name: 'Email Marketing', clicks: channelData[1].value, convs: aggregateStats.channelConvs?.email || 0, icon: Mail, color: 'bg-pink-500', pct: 20 },
                  { name: 'Ads (Meta/Google)', clicks: channelData[2].value, convs: aggregateStats.channelConvs?.ads || 0, icon: Megaphone, color: 'bg-warn', pct: 15 },
                ].map((channel, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg text-white", channel.color)}>
                          <channel.icon className="h-3 w-3" />
                        </div>
                        <span className="font-bold text-foreground">{channel.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground leading-none">{channel.clicks.toLocaleString()} clicks</p>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter">{channel.convs} ventas</p>
                      </div>
                    </div>
                    <Progress value={channel.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-2xl bg-primary/10 border border-primary/15 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">Insight IA</p>
                  <p className="text-xs text-foreground font-bold mt-1">
                    Instagram es tu canal con mejor ROI (+22%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Table Search */}
        <SmartFilterBar 
          placeholder="Buscar campañas por nombre..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div>
              <CardTitle className="text-lg font-bold">Listado de Campañas</CardTitle>
              <CardDescription>Gestión y resultados individuales por lanzamiento.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveTable
              columns={campaignTableColumns}
              data={filteredCampaigns}
              keyExtractor={(campaign: any) => campaign.id}
              rowClassName={() => 'group'}
              emptyState={
                <div className="py-20 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-border">
                    <Activity className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground">Sin estadísticas aún</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">Genera y publica tu primera campaña para empezar a recibir métricas de rendimiento real.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl mt-2" onClick={() => window.location.href='/mentoria/marketing/pages'}>
                    Ir a Generación
                  </Button>
                </div>
              }
              mobileCardHeader={(campaign: any) => (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm shrink-0">
                      {campaign.title?.[0] || 'C'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground leading-tight line-clamp-1">{campaign.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                        Creado: {campaign.createdAt?.toDate ? format(campaign.createdAt.toDate(), 'dd MMM yyyy', { locale: es }) : 'Hoy'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full border-border text-muted-foreground font-bold text-[10px] uppercase px-3 shrink-0">
                    Activa
                  </Badge>
                </div>
              )}
              mobileCardFooter={() => (
                <div className="flex justify-end">
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
