'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { getAppBaseUrl } from '@/lib/app-url';
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
  ExternalLink,
  Code2,
  AlertTriangle,
  Globe,
} from 'lucide-react';

interface TutorCatalogApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorCatalogApiKeyModal({
  open,
  onOpenChange,
}: TutorCatalogApiKeyModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
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
      console.error('[API Key Modal] Error fetching key:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setBaseUrl(getAppBaseUrl());
      fetchKeyInfo();
      setShowKey(false);
      setCopied(false);
      setCopiedUrl(false);
    }
  }, [open]);

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
          description: 'Copia tu nueva clave y configúrala en tu servidor o web.',
        });
      } else {
        toast({
          title: 'Error al generar clave',
          description: 'No se pudo generar la API Key. Intenta nuevamente.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[API Key Modal] Error regenerating key:', err);
      toast({
        title: 'Error de conexión',
        description: 'Verifica tu red y vuelve a intentar.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = apiKeyData?.key || '';
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast({
      title: 'Clave copiada',
      description: 'API Key copiada al portapapeles.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyUrl = (urlToCopy: string) => {
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(true);
    toast({
      title: 'URL copiada',
      description: 'Endpoint de la API copiado al portapapeles.',
    });
    setTimeout(() => setCopiedUrl(false), 2500);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl border border-border bg-card p-6 shadow-none rounded-[0.75rem]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  API de Catálogo de Ofertas
                </DialogTitle>
              </div>
              {hasKey && (
                <div>
                  {isBlocked ? (
                    <Badge variant="destructive" className="flex items-center gap-1 font-semibold">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Bloqueada por Seguridad
                    </Badge>
                  ) : isActive ? (
                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Activa y Operativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactiva</Badge>
                  )}
                </div>
              )}
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Conecta y muestra automáticamente las ofertas vigentes de tu catálogo (cursos, programas y mentorías) en tu propio sitio web o página externa mediante API.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex h-44 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Alerta de Auto-Bloqueo (Circuit Breaker) */}
              {isBlocked && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold">Clave Bloqueada por Actividad Inusual (Circuit Breaker)</p>
                      <p className="text-xs leading-relaxed opacity-90">
                        {apiKeyData?.blockedReason ||
                          'Se detectó un exceso crítico de peticiones o sospecha de ataque en tu endpoint. Para proteger la base de datos, el acceso fue suspendido temporalmente.'}
                      </p>
                      <p className="text-xs font-semibold pt-1">
                        Para reactivar el catálogo en tu web, haz clic en «Regenerar Clave».
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Caja de Visualización de la Clave */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tu Clave Secreta de API (x-api-key)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      readOnly
                      value={currentDisplayKey}
                      className="font-mono text-sm pr-10 border-border bg-muted/40"
                    />
                    {apiKeyData?.key && (
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {apiKeyData?.key && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopy}
                      className="gap-1.5 shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copiada' : 'Copiar'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Guía Rápida de Integración */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  Instrucciones de Consulta
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-background border border-border">
                    <div className="overflow-x-auto whitespace-nowrap">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">GET</span>{' '}
                      <span className="text-foreground">{dynamicCatalogUrl}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyUrl(dynamicCatalogUrl)}
                      className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copiedUrl ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedUrl ? 'Copiada' : 'Copiar URL'}
                    </Button>
                  </div>
                  <div className="p-2.5 rounded bg-background border border-border overflow-x-auto text-muted-foreground">
                    <span className="text-primary font-bold">Header:</span> x-api-key: {apiKeyData?.key || apiKeyData?.keyPrefix || 'tu_api_key'}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                  <p>
                    <span className="font-semibold text-foreground">Filtros opcionales:</span>{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">?type=curso,programa,mentoria</code> o{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">?ids=sp_123,sp_456</code>. Solo devolverá ofertas vigentes y activas. Las ofertas de embajadores quedan excluidas.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={generating}
              onClick={() => {
                if (hasKey) {
                  setConfirmOpen(true);
                } else {
                  handleGenerateOrRegenerate();
                }
              }}
              className="gap-2 text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {hasKey ? 'Regenerar Clave' : 'Generar Primera Clave'}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Regeneración */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md border border-border bg-card p-6 shadow-none rounded-[0.75rem]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">¿Regenerar clave de API?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Al regenerar la clave, la clave anterior quedará <span className="font-semibold text-foreground">invalidada de inmediato</span>. Deberás actualizar la nueva clave en tu web o servidor para que no se interrumpa la sincronización del catálogo.
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
              className="gap-2"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Sí, Regenerar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
