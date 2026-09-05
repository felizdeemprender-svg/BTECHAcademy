'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  QrCode,
  Sparkles,
  Bot,
  Users,
  Database,
  RefreshCw,
  Power,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { IoLogoWhatsapp } from 'react-icons/io5';

interface BotSettings {
  tone: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  salesGroupJid: string;
  supportGroupJid: string;
  model: string;
  autoHandoffEnabled: boolean;
}

interface KnowledgeItem {
  id?: string;
  title: string;
  category: string;
  content: string;
  updatedAt?: string;
}

export default function WhatsAppBotAdminPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingPlans, setSyncingPlans] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);

  // Status state
  const [botStatus, setBotStatus] = useState<{
    instance?: string;
    state?: 'open' | 'connecting' | 'close';
    qrCode?: string;
    pairingCode?: string;
    phone?: string;
  }>({
    instance: 'fastoria',
    state: 'open',
    phone: '+54 9 11 5744-8819',
  });

  // Settings state
  const [settings, setSettings] = useState<BotSettings>({
    tone: 'amigable',
    systemPrompt: `Sos el Asistente Virtual Oficial de Fastoria. Respondés de manera clara, entusiasta y precisa sobre nuestros planes, academia, herramientas de IA y mentoría.

Reglas clave:
1. Si el usuario pregunta por precios o características de planes, respondé con la información oficial sincronizada.
2. Si el usuario tiene dudas avanzadas de compra o desea negociar, derívalo cordialmente al equipo de Ventas.
3. Si el usuario tiene problemas de acceso o errores técnicos, derívalo al equipo de Soporte Técnico.
4. Mantené siempre un trato profesional, cálido y conciso.`,
    temperature: 0.7,
    maxTokens: 500,
    salesGroupJid: '120363384910293847@g.us',
    supportGroupJid: '120363294857201938@g.us',
    model: 'deepseek/deepseek-chat-v3.1',
    autoHandoffEnabled: true,
  });

  // Knowledge base state
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([
    {
      id: 'k1',
      title: 'Planes Comerciales y Membresías Fastoria',
      category: 'planes_comerciales',
      content: 'Fastoria ofrece planes de suscripción mensual con acceso a la plataforma, tokens de IA para generación de video, landing pages y mentoría guiada.',
      updatedAt: '2026-09-05',
    },
    {
      id: 'k2',
      title: 'Política de Soporte y Acceso',
      category: 'soporte',
      content: 'El soporte técnico opera de lunes a viernes de 9 a 18hs. Los alumnos pueden acceder a sus cursos desde cualquier dispositivo mediante autenticación segura.',
      updatedAt: '2026-09-05',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newContent, setNewContent] = useState('');

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load status
        const statusRes = await fetch('/api/admin/whatsapp-bot?action=status');
        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.state) {
            setBotStatus((prev) => ({ ...prev, ...data }));
          }
        }

        // Load settings
        const settingsRes = await fetch('/api/admin/whatsapp-bot?action=settings');
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.settings) {
            setSettings(data.settings);
          }
        }

        // Load knowledge
        const knowledgeRes = await fetch('/api/admin/whatsapp-bot?action=knowledge');
        if (knowledgeRes.ok) {
          const data = await knowledgeRes.json();
          if (data.items && data.items.length > 0) {
            setKnowledgeItems(data.items);
          }
        }
      } catch (err: any) {
        console.error('Error cargando datos del bot:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/whatsapp-bot?action=settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({
          title: 'Configuración guardada',
          description: 'Los parámetros del bot y las derivaciones de grupo fueron actualizados exitosamente.',
        });
      } else {
        throw new Error('Error al guardar');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración en el servidor.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Sync Plans with RAG
  const handleSyncPlans = async () => {
    try {
      setSyncingPlans(true);
      const res = await fetch('/api/admin/whatsapp-bot?action=sync-plans', {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Sincronización RAG Completada',
          description: `Se sincronizaron ${data.syncedCount || 0} planes oficiales y precios con la base de conocimiento vectorial del bot.`,
        });
      } else {
        throw new Error(data.error || 'Error al sincronizar');
      }
    } catch (err: any) {
      toast({
        title: 'Error de sincronización',
        description: err.message || 'No se pudieron sincronizar los planes.',
        variant: 'destructive',
      });
    } finally {
      setSyncingPlans(false);
    }
  };

  // Add Knowledge item
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Completa el título y el contenido del fragmento de conocimiento.',
        variant: 'destructive',
      });
      return;
    }

    const newItem: KnowledgeItem = {
      id: 'k_' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
      updatedAt: new Date().toISOString().split('T')[0],
    };

    try {
      await fetch('/api/admin/whatsapp-bot?action=knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      setKnowledgeItems([newItem, ...knowledgeItems]);
      setNewTitle('');
      setNewContent('');
      toast({
        title: 'Conocimiento agregado',
        description: 'El fragmento fue indexado para que el bot lo use en sus respuestas.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el fragmento.',
        variant: 'destructive',
      });
    }
  };

  // Delete Knowledge item
  const handleDeleteKnowledge = async (id: string) => {
    try {
      await fetch(`/api/admin/whatsapp-bot?action=knowledge&id=${id}`, {
        method: 'DELETE',
      });
      setKnowledgeItems(knowledgeItems.filter((item) => item.id !== id));
      toast({
        title: 'Fragmento eliminado',
        description: 'El documento fue retirado de la base vectorial.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar.',
        variant: 'destructive',
      });
    }
  };

  // Connect / Refresh QR
  const handleRefreshQr = async () => {
    try {
      setRefreshingQr(true);
      const res = await fetch('/api/admin/whatsapp-bot?action=connect', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.state) {
        setBotStatus((prev) => ({ ...prev, state: data.state }));
      }
      toast({
        title: 'Sesión actualizada',
        description: 'Se verificó la conexión con Evolution API.',
      });
    } catch (err) {
      toast({
        title: 'Error al conectar',
        description: 'No se pudo comunicar con el worker de WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setRefreshingQr(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
                <IoLogoWhatsapp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Bot de WhatsApp & RAG
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Administración de IA conversacional, derivación por grupos y base de conocimiento.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-xs font-semibold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  botStatus.state === 'open'
                    ? 'bg-emerald-500 animate-pulse'
                    : botStatus.state === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {botStatus.state === 'open'
                  ? 'Conectado (En Línea)'
                  : botStatus.state === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'}
              </span>
            </div>

            <Button
              onClick={handleSyncPlans}
              disabled={syncingPlans}
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 hover:bg-primary/5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingPlans ? 'animate-spin text-primary' : ''}`} />
              {syncingPlans ? 'Sincronizando Planes...' : 'Sincronizar Catálogo'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid grid-cols-3 max-w-md bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="settings" className="gap-2 text-xs font-semibold rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              Comportamiento & IA
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-2 text-xs font-semibold rounded-lg">
              <QrCode className="w-3.5 h-3.5" />
              Conexión & QR
            </TabsTrigger>
            <TabsTrigger value="rag" className="gap-2 text-xs font-semibold rounded-lg">
              <Database className="w-3.5 h-3.5" />
              Base RAG
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: COMUNICACIÓN & IA */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main settings */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      Prompt del Sistema y Personalidad
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Define la identidad y directivas fundamentales que el modelo OpenRouter (DeepSeek) seguirá al chatear.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Instrucción Principal (System Prompt)</Label>
                      <Textarea
                        rows={8}
                        value={settings.systemPrompt}
                        onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                        className="font-mono text-xs leading-relaxed"
                        placeholder="Escribe las directivas del bot..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Tono de Conversación</Label>
                        <Select
                          value={settings.tone}
                          onValueChange={(val) => setSettings({ ...settings, tone: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tono" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amigable">Amigable y Entusiasta</SelectItem>
                            <SelectItem value="formal">Formal y Corporativo</SelectItem>
                            <SelectItem value="comercial">Comercial y Persuasivo</SelectItem>
                            <SelectItem value="ejecutivo">Ejecutivo y Conciso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Modelo LLM</Label>
                        <Select
                          value={settings.model}
                          onValueChange={(val) => setSettings({ ...settings, model: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el modelo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deepseek/deepseek-chat-v3.1">
                              DeepSeek V3.1 (Predeterminado)
                            </SelectItem>
                            <SelectItem value="google/gemini-2.0-flash">
                              Gemini 2.0 Flash
                            </SelectItem>
                            <SelectItem value="openai/gpt-4o-mini">
                              GPT-4o Mini
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center text-xs">
                        <Label className="font-semibold">Temperatura (Creatividad vs Rigor)</Label>
                        <span className="font-mono text-muted-foreground">{settings.temperature}</span>
                      </div>
                      <Slider
                        value={[settings.temperature]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={([val]) => setSettings({ ...settings, temperature: val })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Group handoff config */}
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Derivación Inteligente a Grupos de Asesores
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configura los identificadores (JID) de los grupos de WhatsApp donde el bot transferirá los leads.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          JID Grupo Ventas
                        </Label>
                        <Input
                          value={settings.salesGroupJid}
                          onChange={(e) => setSettings({ ...settings, salesGroupJid: e.target.value })}
                          placeholder="120363xxx@g.us"
                          className="font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Para consultas comerciales, contratación y mejoras de plan.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          JID Grupo Soporte
                        </Label>
                        <Input
                          value={settings.supportGroupJid}
                          onChange={(e) => setSettings({ ...settings, supportGroupJid: e.target.value })}
                          placeholder="120363yyy@g.us"
                          className="font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Para problemas técnicos, acceso a cursos y plataforma.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl border text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Mecanismo de respuesta bidireccional (Quote Reply):
                      </p>
                      <p>
                        Cuando un asesor responde dentro del grupo <strong>citando (reply/quote)</strong> el mensaje derivado, el bot reenvía automáticamente la respuesta por privado al cliente original.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar actions */}
              <div className="space-y-6">
                <Card className="border border-border/80 shadow-sm bg-muted/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Guardar Cambios</CardTitle>
                    <CardDescription className="text-xs">
                      Aplica la configuración inmediatamente en el worker VPS.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="w-full gap-2 font-semibold"
                    >
                      <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                      {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Estado de la Infraestructura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-muted-foreground">Servidor VPS:</span>
                      <span className="font-mono font-semibold">166.1.85.188</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-muted-foreground">Evolution API:</span>
                      <span className="text-emerald-600 font-semibold">Puerto 18081</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-muted-foreground">Worker Fastify:</span>
                      <span className="text-emerald-600 font-semibold">Puerto 13002</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-muted-foreground">Base Vectorial:</span>
                      <span className="font-semibold">PostgreSQL + pgvector</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CONEXIÓN & QR */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    Vinculación de WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escanea el código QR desde la aplicación WhatsApp en tu teléfono para autorizar la instancia de Fastoria.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                  {botStatus.state === 'open' ? (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Instancia Vinculada y Activa</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        El número <span className="font-mono font-bold text-foreground">{botStatus.phone}</span> está respondiendo y procesando mensajes en tiempo real.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-2xl border shadow-inner flex flex-col items-center">
                      <div className="w-52 h-52 bg-slate-100 flex items-center justify-center rounded-xl text-slate-400 font-mono text-xs">
                        [ Código QR de Evolution API ]
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 w-full pt-2">
                    <Button
                      onClick={handleRefreshQr}
                      disabled={refreshingQr}
                      variant="outline"
                      className="flex-1 gap-2 text-xs font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingQr ? 'animate-spin' : ''}`} />
                      Verificar / Refrescar QR
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Instrucciones de Vinculación
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pasos sencillos para conectar tu línea de WhatsApp institucional.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
                    <li className="leading-relaxed">
                      Abre <strong>WhatsApp</strong> en el teléfono donde reside la línea comercial.
                    </li>
                    <li className="leading-relaxed">
                      Toca en <strong>Menú (tres puntos)</strong> o <strong>Configuración</strong> y selecciona <strong>Dispositivos vinculados</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Toca en <strong>Vincular un dispositivo</strong> y apunta la cámara hacia el código QR mostrado a la izquierda.
                    </li>
                    <li className="leading-relaxed">
                      Una vez vinculado, el estado cambiará automáticamente a <strong className="text-emerald-600">Conectado (En Línea)</strong>.
                    </li>
                  </ol>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 dark:text-amber-200">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Recomendación importante:
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Utiliza una línea con WhatsApp Business para mayor estabilidad y soporte en la atención a alumnos y clientes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: BASE DE CONOCIMIENTO RAG */}
          <TabsContent value="rag" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add form */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      Agregar Conocimiento RAG
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Inyecta información, políticas o preguntas frecuentes para que el bot las consulte con búsqueda semántica.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddKnowledge} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Título del Documento</Label>
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Ej: Política de Reembolsos"
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Categoría</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planes_comerciales">Planes y Precios</SelectItem>
                            <SelectItem value="soporte">Soporte y Plataforma</SelectItem>
                            <SelectItem value="general">Información General</SelectItem>
                            <SelectItem value="academico">Cursos y Mentoría</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Contenido / Fragmento</Label>
                        <Textarea
                          rows={5}
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          placeholder="Escribe el texto detallado que el bot debe memorizar..."
                          className="text-xs leading-relaxed"
                        />
                      </div>

                      <Button type="submit" size="sm" className="w-full gap-2 font-semibold pt-2">
                        <Plus className="w-3.5 h-3.5" />
                        Guardar e Indexar
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* List */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border border-border/80 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        Documentos Indexados ({knowledgeItems.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Fragmentos de texto vectorizados en PostgreSQL con pgvector.
                      </CardDescription>
                    </div>

                    <Button
                      onClick={handleSyncPlans}
                      disabled={syncingPlans}
                      size="sm"
                      variant="outline"
                      className="gap-2 text-xs font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingPlans ? 'animate-spin' : ''}`} />
                      Sincronizar Catálogo
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {knowledgeItems.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-xs border border-dashed rounded-xl">
                        No hay documentos indexados en la base RAG.
                      </div>
                    ) : (
                      knowledgeItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-border/80 bg-background hover:border-primary/30 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">
                                {item.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                              {item.content}
                            </p>
                            {item.updatedAt && (
                              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Actualizado: {item.updatedAt}
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={() => item.id && handleDeleteKnowledge(item.id)}
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
                            aria-label="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
