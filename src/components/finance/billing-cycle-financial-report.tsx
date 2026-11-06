'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Receipt,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  CreditCard,
  Sparkles,
  RefreshCw,
  Globe,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TutorFinancialStatement,
  FinancialStatementLineItem,
} from '@/domain/commerce/use-cases/build-tutor-financial-statement';

interface BillingCycleOption {
  readonly id: string;
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly isCurrent?: boolean;
}

interface BillingCycleFinancialReportProps {
  readonly statement: TutorFinancialStatement | null;
  readonly isLoading?: boolean;
  readonly cyclesList?: readonly BillingCycleOption[];
  readonly selectedCycleId?: string;
  readonly onSelectCycle?: (cycle: BillingCycleOption) => void;
  readonly onCustomDateChange?: (from: string, to: string) => void;
  readonly onRefresh?: () => void;
}

export function BillingCycleFinancialReport({
  statement,
  isLoading = false,
  cyclesList = [],
  selectedCycleId,
  onSelectCycle,
  onCustomDateChange,
  onRefresh,
}: BillingCycleFinancialReportProps) {
  // Filtros de Nivel 2
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'course_sale' | 'subscription' | 'ai_credits'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const homeCurrency = statement?.homeCurrency || 'ARS';
  const homeCountry = statement?.homeCountry || 'AR';

  // Formateador de moneda en base al país del tutor
  const formatMoney = (amount: number, currency = homeCurrency) => {
    const zeroDecimals = ['ARS', 'CLP', 'COP'].includes(currency);
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: zeroDecimals ? 0 : 2,
      maximumFractionDigits: zeroDecimals ? 0 : 2,
    }).format(Math.abs(amount));
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currency} $${formatted}`;
  };

  // Filtrado de movimientos Nivel 2
  const filteredLineItems = useMemo(() => {
    if (!statement?.lineItems) return [];
    return statement.lineItems.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchConcept = item.concept.toLowerCase().includes(query);
        const matchRef = item.referenceId.toLowerCase().includes(query);
        const matchGateway = item.gatewayOrProvider.toLowerCase().includes(query);
        if (!matchConcept && !matchRef && !matchGateway) return false;
      }
      return true;
    });
  }, [statement?.lineItems, typeFilter, searchTerm]);

  // Exportar Nivel 2 a CSV
  const handleExportCSV = () => {
    if (!statement?.lineItems || statement.lineItems.length === 0) return;

    const headers = [
      'Fecha',
      'Tipo',
      'Concepto',
      'Referencia ID',
      'Pasarela/Proveedor',
      'Moneda Original',
      'Monto Original Bruto',
      'Comision Pasarela',
      'Cotizacion Historica',
      `Comision en ${homeCurrency}`,
      `Importe Neto en ${homeCurrency}`,
      'Estado',
    ];

    const rows = statement.lineItems.map((item) => [
      item.date ? new Date(item.date).toISOString() : '',
      `"${item.typeLabel}"`,
      `"${item.concept.replace(/"/g, '""')}"`,
      `"${item.referenceId}"`,
      `"${item.gatewayOrProvider}"`,
      item.originalCurrency,
      item.originalGrossAmount,
      item.originalFeeAmount,
      item.exchangeRate,
      item.feeInHomeCurrency,
      item.netInHomeCurrency,
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_financiero_ciclo_${statement.tutorId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Barra Superior: Selector de Ciclos y Rango de Períodos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-card border rounded-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Reporte Financiero por Ciclo
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              {homeCountry} ({homeCurrency})
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {statement?.period?.from && statement?.period?.to
              ? `Período auditado: ${new Date(statement.period.from).toLocaleDateString()} al ${new Date(statement.period.to).toLocaleDateString()}`
              : 'Consolidación de ingresos por cursos, abono SaaS y créditos IA.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Ciclo */}
          {cyclesList.length > 0 && (
            <Select
              value={selectedCycleId || cyclesList[0]?.id}
              onValueChange={(val) => {
                if (val === 'custom') {
                  setShowCustomRange(true);
                  return;
                }
                setShowCustomRange(false);
                const found = cyclesList.find((c) => c.id === val);
                if (found && onSelectCycle) onSelectCycle(found);
              }}
            >
              <SelectTrigger className="w-[260px] h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Seleccionar ciclo" />
              </SelectTrigger>
              <SelectContent>
                {cyclesList.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id} className="text-xs">
                    {cycle.label} {cycle.isCurrent ? '(Actual)' : ''}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs font-semibold">
                  Rango personalizado...
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {showCustomRange && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 w-36 text-xs"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 w-36 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => {
                  if (customFrom && customTo && onCustomDateChange) {
                    onCustomDateChange(customFrom, customTo);
                  }
                }}
              >
                Aplicar
              </Button>
            </div>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
              Actualizar
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            className="h-9 text-xs"
            onClick={handleExportCSV}
            disabled={!statement?.lineItems || statement.lineItems.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* NIVEL 1: Totalizado por Concepto Discriminado */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nivel 1: Totalizado Consolidado por Concepto
          </h3>
          {statement?.reconciliation && (
            <div className="flex items-center gap-2">
              {statement.reconciliation.isBalanced ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs gap-1.5 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Cuadre 100% Verificado (0.00 descuadre)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs gap-1.5 py-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Diferencia de conciliación detectada
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* 4 KPIs de Resumen Financiero */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Ingresos Netos por Cursos */}
          <Card className="rounded-lg border bg-card">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Ingresos Netos (Cursos)</span>
                <ArrowUpRight className="h-4 w-4 text-success" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatMoney(statement?.sales?.netSalesRevenueInHomeCurrency || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t">
                <span>{statement?.sales?.totalCount || 0} cursos vendidos</span>
                <span className="font-mono">
                  {statement?.sales?.localSalesCount || 0} loc / {statement?.sales?.internationalSalesCount || 0} intl
                </span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 2: Comisiones de Pasarelas */}
          <Card className="rounded-lg border bg-card">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Comisiones Retenidas</span>
                <CreditCard className="h-4 w-4 text-warn" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-warn">
                {formatMoney(statement?.sales?.totalGatewayFeesInHomeCurrency || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t">
                <span>Total Bruto Facturado:</span>
                <span className="font-mono">{formatMoney(statement?.sales?.grossTotalConsolidatedInHomeCurrency || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: Costos de Plataforma (SaaS + IA) */}
          <Card className="rounded-lg border bg-card">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Costos de Plataforma</span>
                <ArrowDownLeft className="h-4 w-4 text-destructive" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-destructive">
                {formatMoney(statement?.platformCosts?.totalPlatformCostsInHomeCurrency || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t">
                <span>Abono SaaS: {formatMoney(statement?.platformCosts?.subscriptionsTotalInHomeCurrency || 0)}</span>
                <span>IA: {formatMoney(statement?.platformCosts?.aiCreditsTotalInHomeCurrency || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 4: Saldo Operativo Neto */}
          <Card className="rounded-lg border bg-card">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Saldo Operativo Neto</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div
                className={cn(
                  'text-2xl font-bold tracking-tight',
                  (statement?.reconciliation?.netOperatingBalance || 0) >= 0 ? 'text-success' : 'text-warn',
                )}
              >
                {formatMoney(statement?.reconciliation?.netOperatingBalance || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t">
                <span>Estado del Balance:</span>
                <span className="font-semibold">
                  {(statement?.reconciliation?.netOperatingBalance || 0) >= 0 ? 'A Favor del Tutor' : 'Abono Pendiente'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tablas de Discriminación Conceptual (Pasarelas y Costos) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bloque A: Discriminación de Ventas por Pasarela de Pago */}
          <Card className="rounded-lg border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Ventas Discriminadas por Pasarela
              </CardTitle>
              <CardDescription className="text-xs">
                Monto cobrado en moneda original y liquidación consolidada en {homeCurrency}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Pasarela</TableHead>
                    <TableHead className="text-right">Operaciones</TableHead>
                    <TableHead className="text-right">Bruto Cobrado</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Neto ({homeCurrency})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement?.sales?.breakdownByGateway && Object.keys(statement.sales.breakdownByGateway).length > 0 ? (
                    Object.values(statement.sales.breakdownByGateway).map((gateway) => (
                      <TableRow key={gateway.gatewayId} className="text-xs">
                        <TableCell className="font-medium uppercase">{gateway.gatewayName}</TableCell>
                        <TableCell className="text-right">{gateway.salesCount}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(gateway.grossCharged, gateway.chargedCurrency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatMoney(gateway.feesDeducted, gateway.chargedCurrency)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatMoney(gateway.netInHomeCurrency, homeCurrency)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Sin ventas registradas en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bloque B: Discriminación de Costos de Plataforma */}
          <Card className="rounded-lg border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Costos de Plataforma del Ciclo
              </CardTitle>
              <CardDescription className="text-xs">
                Abono SaaS de la academia y paquetes de créditos IA adquiridos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Concepto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Cotización</TableHead>
                    <TableHead className="text-right">Costo ({homeCurrency})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Suscripciones */}
                  {statement?.platformCosts?.subscriptionsList?.map((sub) => (
                    <TableRow key={sub.id} className="text-xs">
                      <TableCell className="font-medium flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                        {sub.planName}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{sub.id.substring(0, 10)}</TableCell>
                      <TableCell className="text-right font-mono">${sub.amountUSD.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ${sub.exchangeRateToHomeCurrency.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-destructive">
                        {formatMoney(
                          sub.chargedCurrency === homeCurrency
                            ? sub.chargedAmount
                            : sub.amountUSD * sub.exchangeRateToHomeCurrency,
                          homeCurrency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Créditos IA */}
                  {statement?.platformCosts?.aiCreditsList?.map((cred) => (
                    <TableRow key={cred.id} className="text-xs">
                      <TableCell className="font-medium flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-warn" />
                        Pack {cred.creditsAmount} Créditos IA
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{cred.id.substring(0, 10)}</TableCell>
                      <TableCell className="text-right font-mono">${cred.amountUSD.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ${cred.exchangeRateToHomeCurrency.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-destructive">
                        {formatMoney(
                          cred.chargedCurrency === homeCurrency
                            ? cred.chargedAmount
                            : cred.amountUSD * cred.exchangeRateToHomeCurrency,
                          homeCurrency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {(!statement?.platformCosts?.subscriptionsList?.length &&
                    !statement?.platformCosts?.aiCreditsList?.length) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Sin cargos de suscripción ni créditos IA en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NIVEL 2: Nivel de Detalles (Libro Mayor Transaccional) */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Nivel 2: Detalle Transaccional del Ciclo
            </h3>
            <p className="text-xs text-muted-foreground">
              Libro diario con cada movimiento individual auditado, comisiones y conversión histórica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Buscador */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar movimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Filtro por Tipo */}
            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos ({statement?.lineItems?.length || 0})</SelectItem>
                <SelectItem value="course_sale" className="text-xs">Ventas Cursos</SelectItem>
                <SelectItem value="subscription" className="text-xs">Suscripción SaaS</SelectItem>
                <SelectItem value="ai_credits" className="text-xs">Créditos IA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla de Nivel 2 */}
        <Card className="rounded-lg border bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead className="w-[130px]">Tipo</TableHead>
                  <TableHead>Concepto / Curso</TableHead>
                  <TableHead className="w-[120px]">Referencia</TableHead>
                  <TableHead className="w-[100px]">Medio</TableHead>
                  <TableHead className="text-right">Monto Original</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead className="text-right">Cotización</TableHead>
                  <TableHead className="text-right">Neto ({homeCurrency})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLineItems.length > 0 ? (
                  filteredLineItems.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">
                        {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0.5',
                            item.type === 'course_sale' && 'bg-success/10 text-success border-success/30',
                            item.type === 'subscription' && 'bg-primary/10 text-primary border-primary/30',
                            item.type === 'ai_credits' && 'bg-warn/10 text-warn border-warn/30',
                          )}
                        >
                          {item.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground max-w-xs truncate">
                        {item.concept}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-[11px]">
                        {item.referenceId.substring(0, 12)}
                      </TableCell>
                      <TableCell className="font-medium uppercase text-muted-foreground">
                        {item.gatewayOrProvider}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMoney(item.originalGrossAmount, item.originalCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.originalFeeAmount > 0
                          ? formatMoney(item.originalFeeAmount, item.originalCurrency)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.originalCurrency !== homeCurrency ? `$${item.exchangeRate.toFixed(2)}` : '1.00'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono font-semibold',
                          item.netInHomeCurrency >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {formatMoney(item.netInHomeCurrency, homeCurrency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                      No se encontraron movimientos para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resumen al pie de la tabla */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground px-2">
          <span>Mostrando {filteredLineItems.length} movimientos de {statement?.lineItems?.length || 0}</span>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 font-mono">
            <span>
              Total Neto Visible:{' '}
              <strong className="text-foreground">
                {formatMoney(
                  filteredLineItems.reduce((acc, curr) => acc + curr.netInHomeCurrency, 0),
                  homeCurrency,
                )}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

