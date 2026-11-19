'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { getAppBaseUrl } from '@/lib/app-url';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Code2,
  AlertTriangle,
  Globe,
  Terminal,
  BookOpen,
  Filter,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react';

export function TutorCatalogPublishingSection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const [apiKeyData, setApiKeyData] = useState<{
    key?: string;
    keyPrefix?: string;
    status?: 'active' | 'blocked' | 'revoked';
    createdAt?: string;
    blockedAt?: string | null;
    blockedReason?: string | null;
  } | null>(null);

  const fetchKeyInfo = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/tutors/catalog-api-key', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeyData(data.apiKey);
      }
    } catch (err) {
      console.error('[Tutor Catalog Section] Error fetching key:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBaseUrl(getAppBaseUrl());
    fetchKeyInfo();
  }, [user]);

  const handleGenerateOrRegenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/tutors/catalog-api-key', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeyData({
          key: data.rawKey,
          keyPrefix: data.keyDoc.keyPrefix,
          status: data.keyDoc.status,
          createdAt: data.keyDoc.createdAt,
          blockedAt: null,
          blockedReason: null,
        });
        setShowKey(true);
        setConfirmOpen(false);
        toast({
          title: 'Clave generada con éxito',
          description: 'Copia tu nueva clave y configúrala en tu sitio web.',
        });
      } else {
        toast({
          title: 'Error al generar clave',
          description: 'No se pudo generar la API Key. Intenta nuevamente.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[Tutor Catalog Section] Error regenerating key:', err);
      toast({
        title: 'Error de conexión',
        description: 'Verifica tu conexión y vuelve a intentar.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = () => {
    const textToCopy = apiKeyData?.key || '';
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(true);
    toast({
      title: 'Clave copiada',
      description: 'API Key copiada al portapapeles.',
    });
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyUrl = (urlToCopy: string) => {
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(true);
    toast({
      title: 'URL copiada',
      description: 'Endpoint copiado al portapapeles.',
    });
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyCurl = (curlSnippet: string) => {
    if (!curlSnippet) return;
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    toast({
      title: 'Comando copiado',
      description: 'Snippet cURL copiado al portapapeles.',
    });
    setTimeout(() => setCopiedCurl(false), 2500);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/tutors/catalog-api-docs/pdf');
      if (!res.ok) throw new Error('Error descargando PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Guia-Integracion-API-Catalogo.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Guía PDF Descargada',
        description: 'La documentación actualizada se ha descargado correctamente.',
      });
    } catch (err) {
      console.error('[Download PDF Error]', err);
      toast({
        title: 'Error de descarga',
        description: 'No se pudo generar la guía PDF. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isBlocked = apiKeyData?.status === 'blocked';
  const isActive = apiKeyData?.status === 'active';
  const hasKey = !!apiKeyData;

  const resolvedBase = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const dynamicCatalogUrl = `${resolvedBase}/api/v1/tutor/catalog`;

  const currentDisplayKey = apiKeyData?.key
    ? showKey
      ? apiKeyData.key
      : '•'.repeat(32)
    : apiKeyData?.keyPrefix || 'Sin clave generada';

  const curlExample = `curl -X GET "${dynamicCatalogUrl}?type=curso,programa" \\
  -H "x-api-key: ${apiKeyData?.key || apiKeyData?.keyPrefix || 'fde_live_tu_clave_aqui'}"`;

  if (loading) {
    return (
      <Card className="border border-border bg-card p-12 text-center shadow-none rounded-[0.75rem]">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Cargando credenciales del catálogo...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta si la clave fue bloqueada por el Circuit Breaker */}
      {isBlocked && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-400">
          <div className="flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-base">API Key Bloqueada Automáticamente por Seguridad (Circuit Breaker)</h4>
              <p className="text-xs leading-relaxed opacity-95">
                {apiKeyData?.blockedReason ||
                  'Se detectó una ráfaga crítica de tráfico o intento de scraping abusivo (>180 req/min). El sistema suspendió de inmediato el acceso a Firestore para proteger tu catálogo.'}
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  className="gap-2 font-semibold"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerar Clave para Reactivar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta Principal de Configuración de API */}
      <Card className="border border-border bg-card shadow-none rounded-[0.75rem] overflow-hidden">
        <CardHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  API de Catálogo de Ofertas
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Conecta y muestra automáticamente las ofertas vigentes de tu catálogo (cursos, programas y mentorías) en tu propia página externa.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="gap-2 h-9 text-xs font-semibold border-border hover:bg-muted"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Download className="h-4 w-4 text-primary" />
                )}
                {downloadingPdf ? 'Generando PDF...' : 'Descargar Guía (PDF)'}
              </Button>

              {hasKey ? (
                isBlocked ? (
                  <Badge variant="destructive" className="flex items-center gap-1.5 font-semibold px-3 py-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Bloqueada por Seguridad
                  </Badge>
                ) : isActive ? (
                  <Badge className="bg-emerald-600 text-white flex items-center gap-1.5 font-semibold px-3 py-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Activa y Operativa
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-3 py-1">Inactiva</Badge>
                )
              ) : (
                <Badge variant="outline" className="px-3 py-1 font-medium">Sin Clave Generada</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Fila 1: Clave Secreta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tu Clave Secreta de API (x-api-key)
              </label>
              {apiKeyData?.createdAt && (
                <span className="text-[11px] text-muted-foreground">
                  Creada: {new Date(apiKeyData.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={currentDisplayKey}
                  className="font-mono text-sm pr-10 border-border bg-muted/40 h-11"
                />
                {apiKeyData?.key && (
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {apiKeyData?.key && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyKey}
                  className="gap-2 shrink-0 h-11 font-semibold"
                >
                  {copiedKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copiedKey ? 'Copiada' : 'Copiar Clave'}
                </Button>
              )}

              <Button
                type="button"
                variant={hasKey ? 'outline' : 'default'}
                disabled={generating}
                onClick={() => {
                  if (hasKey) {
                    setConfirmOpen(true);
                  } else {
                    handleGenerateOrRegenerate();
                  }
                }}
                className="gap-2 shrink-0 h-11 font-semibold"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                {hasKey ? 'Regenerar Clave' : 'Generar Primera Clave'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Esta clave es personal y única. Aísla tus ofertas para que nadie acceda a información fuera de tu catálogo.
            </p>
          </div>

          {/* Fila 2: Endpoint de Consulta */}
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Code2 className="h-4 w-4 text-primary" />
              Endpoint REST de Consulta
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border font-mono text-xs">
              <div className="overflow-x-auto whitespace-nowrap py-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-2">GET</span>
                <span className="text-foreground">{dynamicCatalogUrl}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyUrl(dynamicCatalogUrl)}
                className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground shrink-0 self-start sm:self-auto"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedUrl ? 'Copiada' : 'Copiar URL'}
              </Button>
            </div>

            {/* Cabecera Requerida */}
            <div className="p-3 rounded-lg bg-background border border-border font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-primary font-bold mr-2">Header:</span>
                <span className="text-muted-foreground">x-api-key: {apiKeyData?.key || apiKeyData?.keyPrefix || 'tu_clave_secreta'}</span>
              </div>
            </div>

            {/* Filtros Disponibles */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Filter className="h-3.5 w-3.5 text-primary" />
                Filtros opcionales en la consulta:
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <li className="flex items-start gap-2 bg-background/60 p-2 rounded border border-border/50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <code className="font-bold text-foreground">?type=curso,programa,mentoria</code>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Filtra por tipo de oferta individual o combinado.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2 bg-background/60 p-2 rounded border border-border/50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <code className="font-bold text-foreground">?ids=id1,id2</code>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Consulta una o varias ofertas específicas por su ID.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Reglas de Negocio Garantizadas */}
            <div className="rounded-lg bg-background/40 p-3 text-[11px] text-muted-foreground space-y-1 border border-border/40">
              <p className="font-semibold text-foreground">Garantías de Negocio:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1 text-[11px]">
                <li>Solo devuelve ofertas <span className="text-foreground font-medium">vigentes y activas</span> (las ofertas vencidas no aparecen).</li>
                <li>Incluye el desglose de <span className="text-foreground font-medium">medios de pago, valores y monedas</span> configuradas (ARS / USD).</li>
                <li>Excluye completamente páginas de <span className="text-foreground font-medium">embajadores o referidos</span>.</li>
                <li>Provee URLs directas a la landing de cada oferta para el botón «Ver más» o «Conocer».</li>
                <li>CORS habilitado: consume la API directamente desde el navegador de tu web sin bloqueos de origen.</li>
              </ul>
            </div>
          </div>

          {/* Fila 3: Ejemplo de Código de Integración (cURL) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Ejemplo de Consulta (cURL)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyCurl(curlExample)}
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCurl ? 'Copiado' : 'Copiar Snippet'}
              </Button>
            </div>
            <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
              <code>{curlExample}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Confirmación de Regeneración */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md border border-border bg-card p-6 shadow-none rounded-[0.75rem]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">¿Regenerar clave de API?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Al regenerar la clave, la clave anterior quedará <span className="font-semibold text-foreground">invalidada de inmediato</span>. Deberás actualizar la nueva clave en tu sitio web para no interrumpir la carga del catálogo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleGenerateOrRegenerate}
              disabled={generating}
              className="gap-2 font-semibold"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Sí, Regenerar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
