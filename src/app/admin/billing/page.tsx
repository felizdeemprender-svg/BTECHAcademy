'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  ReceiptText,
  TrendingUp,
  DollarSign,
  Percent,
  Users,
  Search,
  Download,
  RefreshCw,
  Calendar,
  ChevronDown,
  Loader2,
  Lock,
  BarChart3,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillingReport, TutorBillingRow } from '@/app/api/admin/billing/route';

const TYPE_CONFIG = {
  fixed: { label: 'Fijo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  percentage: { label: 'Comisión %', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  free: { label: 'Gratuito', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  iconBg,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: string;
  iconBg: string;
}) {
  return (
    <Card className="border-none shadow-md bg-white/60 backdrop-blur-sm hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn('text-3xl font-headline font-bold tracking-tight', color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground font-medium">{sub}</p>}
          </div>
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner', iconBg)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const { toast } = useToast();
  const [report, setReport] = useState<BillingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'fixed' | 'percentage' | 'free'>('all');

  // Rango de fechas (default: mes actual)
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('Error al cargar el reporte');
      const data: BillingReport = await res.json();
      setReport(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = ['Tutor', 'Email', 'Tipo', 'Plan', 'Monto Fijo', '% Comisión', 'Ventas (Unidades)', 'Ingresos Ventas', 'A Facturar', 'Estado'];
    const rows = report.tutors.map(t => [
      t.displayName,
      t.email,
      TYPE_CONFIG[t.subscriptionType]?.label || t.subscriptionType,
      t.planName,
      t.fixedAmount,
      t.percentageRate,
      t.totalSalesCount,
      t.totalSalesRevenue.toFixed(2),
      t.billedAmount.toFixed(2),
      t.subscriptionStatus,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturacion_${from}_${to}.csv`;
    a.click();
    toast({ title: 'CSV exportado correctamente' });
  };

  const filteredTutors = report?.tutors.filter(t => {
    const matchesSearch = t.displayName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || t.subscriptionType === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* ── HEADER ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight flex items-center gap-3">
              <ReceiptText className="h-9 w-9 text-indigo-600" />
              Facturación
            </h1>
            <p className="text-muted-foreground text-base font-medium mt-1">
              Reporte consolidado de ingresos por abonos fijos y comisiones porcentuales.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-sm text-sm font-medium text-slate-600">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="bg-transparent outline-none text-xs font-mono"
              />
              <span>→</span>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="bg-transparent outline-none text-xs font-mono"
              />
            </div>
            <Button onClick={fetchReport} disabled={loading} variant="outline" className="rounded-xl h-10 border-2 gap-2 font-bold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </Button>
            <Button onClick={exportCsv} disabled={!report} className="rounded-xl h-10 bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold text-white">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </header>

        {/* ── KPIs ── */}
        {loading ? (
          <div className="grid md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-none shadow-md animate-pulse">
                <CardContent className="p-6 h-28 bg-slate-100 rounded-2xl" />
              </Card>
            ))}
          </div>
        ) : report && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              icon={DollarSign}
              label="Recaudación Total"
              value={formatCurrency(report.summary.totalBilled)}
              sub={`${report.summary.totalActiveTutors} tutores activos`}
              color="text-indigo-700"
              iconBg="bg-indigo-50"
            />
            <KpiCard
              icon={Lock}
              label="Abonos Fijos"
              value={formatCurrency(report.summary.fixedBilled)}
              sub={`${report.summary.fixedTutorsCount} tutores`}
              color="text-blue-700"
              iconBg="bg-blue-50"
            />
            <KpiCard
              icon={Percent}
              label="Comisiones por Venta"
              value={formatCurrency(report.summary.percentageBilled)}
              sub={`${report.summary.percentageTutorsCount} tutores`}
              color="text-emerald-700"
              iconBg="bg-emerald-50"
            />
            <KpiCard
              icon={Users}
              label="Tutores Gratuitos"
              value={String(report.summary.freeTutorsCount)}
              sub="Sin cobro asociado"
              color="text-slate-600"
              iconBg="bg-slate-100"
            />
          </div>
        )}

        {/* ── TABLA RESUMEN POR TIPO ── */}
        {!loading && report && (
          <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden rounded-3xl">
            <div className="px-8 py-5 border-b flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <h2 className="font-headline font-bold text-lg text-primary">Desglose por Tipo de Abono</h2>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow className="border-none">
                    {['Tipo', 'Tutores', 'Monto Total Facturado', 'Promedio / Tutor', '% del Total'].map(h => (
                      <TableHead key={h} className="py-4 px-8 text-[10px] font-bold uppercase tracking-widest text-primary/60">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byType.map(row => (
                    <TableRow key={row.type} className="hover:bg-primary/5 transition-colors border-b border-border/30">
                      <TableCell className="px-8 py-5">
                        <Badge className={cn('text-xs font-bold border', TYPE_CONFIG[row.type as keyof typeof TYPE_CONFIG]?.color || 'bg-slate-100 text-slate-600')}>
                          {row.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-5 font-bold text-slate-700">{row.count}</TableCell>
                      <TableCell className="px-8 py-5 font-bold text-slate-800 text-base">{formatCurrency(row.totalBilled)}</TableCell>
                      <TableCell className="px-8 py-5 text-slate-600 font-medium">{formatCurrency(row.avgBilled)}</TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={cn('h-full rounded-full', TYPE_CONFIG[row.type as keyof typeof TYPE_CONFIG]?.dot || 'bg-slate-400')}
                              style={{ width: `${report.summary.totalBilled > 0 ? (row.totalBilled / report.summary.totalBilled) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500 tabular-nums">
                            {report.summary.totalBilled > 0 ? ((row.totalBilled / report.summary.totalBilled) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── TABLA DETALLE POR TUTOR ── */}
        <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden rounded-3xl">
          <div className="px-8 py-5 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-indigo-500" />
              <h2 className="font-headline font-bold text-lg text-primary">
                Detalle por Tutor
                {report && <span className="ml-2 text-sm font-medium text-muted-foreground">({filteredTutors.length} tutores)</span>}
              </h2>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Filtro tipo */}
              <div className="flex gap-1.5">
                {(['all', 'fixed', 'percentage', 'free'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                      typeFilter === type
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {type === 'all' ? 'Todos' : TYPE_CONFIG[type]?.label}
                  </button>
                ))}
              </div>
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tutor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-2 w-52"
                />
              </div>
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  {['Tutor', 'Plan / Tipo', 'Cursos Activos', 'Ventas (unid.)', 'Ingresos Generados', 'A Facturar', 'Estado'].map(h => (
                    <TableHead key={h} className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-primary/60 first:pl-8 last:pr-8">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm font-medium">Calculando facturación...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredTutors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center italic text-muted-foreground">
                      No hay tutores que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                ) : filteredTutors.map(tutor => (
                  <TableRow key={tutor.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={tutor.photoURL || undefined} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-sm">
                            {tutor.displayName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{tutor.displayName}</p>
                          <p className="text-xs text-muted-foreground">{tutor.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="space-y-1">
                        <Badge className={cn('text-[10px] font-bold border', TYPE_CONFIG[tutor.subscriptionType]?.color)}>
                          {TYPE_CONFIG[tutor.subscriptionType]?.label}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground font-medium leading-tight">
                          {tutor.planName}
                          {tutor.subscriptionType === 'fixed' && tutor.fixedAmount > 0 && ` · ${formatCurrency(tutor.fixedAmount)}/mes`}
                          {tutor.subscriptionType === 'percentage' && tutor.percentageRate > 0 && ` · ${tutor.percentageRate}%`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <span className="font-bold text-slate-700 text-lg">{tutor.activeCoursesCount}</span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ShoppingCart className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold text-slate-700">{tutor.totalSalesCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className={cn('font-bold', tutor.totalSalesRevenue > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                        {formatCurrency(tutor.totalSalesRevenue)}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className={cn('font-bold text-lg', tutor.billedAmount > 0 ? 'text-indigo-700' : 'text-slate-400')}>
                        {formatCurrency(tutor.billedAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="pr-8 py-5">
                      <Badge
                        className={cn(
                          'text-[10px] font-bold border',
                          tutor.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                        )}
                      >
                        {tutor.subscriptionStatus === 'active' ? 'Activo' : tutor.subscriptionStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
