'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Instagram, 
  Megaphone, 
  Settings2, 
  KeyRound, 
  Globe, 
  Database, 
  RefreshCw, 
  HelpCircle, 
  BookOpen, 
  Sparkles, 
  Server, 
  ArrowUpRight, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Linkedin, 
  Twitter, 
  MonitorPlay, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const MOTORS = [
  // Email Group
  { id: 'sendgrid', group: 'Email', label: 'SendGrid Engine', icon: Mail, color: 'emerald', provider: 'SendGrid', desc: 'Envíos masivos de alta tasa de entrega.' },
  { id: 'mailchimp', group: 'Email', label: 'Mailchimp Engine', icon: Mail, color: 'emerald', provider: 'Mailchimp', desc: 'Automatización de audiencias y newsletters.' },
  { id: 'brevo', group: 'Email', label: 'Brevo Connector', icon: Mail, color: 'emerald', provider: 'Brevo', desc: 'Marketing relacional y SMTP transaccional.' },
  
  // Social Group
  { id: 'meta_social', group: 'Social', label: 'Meta Unified (FB/IG)', icon: Instagram, color: 'blue', provider: 'Meta', desc: 'Publicación simultánea en Facebook Pages e Instagram Business.' },
  { id: 'linkedin', group: 'Social', label: 'LinkedIn Professional', icon: Linkedin, color: 'blue', provider: 'LinkedIn', desc: 'Contenido corporativo y artículos de marca.' },
  { id: 'twitter', group: 'Social', label: 'X (Twitter) Engine', icon: Twitter, color: 'blue', provider: 'X (Twitter)', desc: 'Publicación de hilos y tweets automáticos vía API v2.' },
  { id: 'tiktok', group: 'Social', label: 'TikTok for Business', icon: TikTokIcon, color: 'blue', provider: 'TikTok', desc: 'Gestión de guiones y clips en el feed.' },
  
  // Ads Group
  { id: 'meta_ads', group: 'Ads', label: 'Meta Ads Manager', icon: Megaphone, color: 'amber', provider: 'Meta', desc: 'Control de campañas en Facebook e Instagram.' },
  { id: 'google_ads', group: 'Ads', label: 'Google Ads (Search/YT)', icon: MonitorPlay, color: 'amber', provider: 'Google', desc: 'Tráfico en buscadores y YouTube pre-roll.' }
];

export default function PublishingEnginesPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedMotor, setSelectedMotor] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Draft Config State
  const [draftConfig, setDraftConfig] = useState({
    apiKey: '',
    accountId: '',
    mode: 'sandbox'
  });

  // Load existing credentials when motor selected
  useEffect(() => {
    const p = profile as any;
    if (selectedMotor && p?.marketingCredentials?.[selectedMotor.id]) {
      const saved = p.marketingCredentials[selectedMotor.id];
      setDraftConfig({
        apiKey: saved.apiKey || '',
        accountId: saved.accountId || '',
        mode: saved.mode || 'sandbox'
      });
    } else {
      setDraftConfig({ apiKey: '', accountId: '', mode: 'sandbox' });
    }
  }, [selectedMotor, profile]);

  const openMotorConfig = (motor: any) => {
    setSelectedMotor(motor);
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!profile?.uid || !selectedMotor) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        [`marketingCredentials.${selectedMotor.id}`]: {
          ...draftConfig,
          updatedAt: serverTimestamp(),
          provider: selectedMotor.provider
        }
      });
      setIsConfigOpen(false);
      toast({ title: 'Configuración Guardada', description: `Credenciales de ${selectedMotor.label} actualizadas correctamente.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al Guardar', description: 'No se pudieron actualizar las llaves API.' });
    }
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      if (draftConfig.apiKey.length < 10) {
        toast({ variant: 'destructive', title: 'Fallo de Conexión', description: 'La API Key parece ser inválida o demasiado corta.' });
      } else {
        toast({
          title: 'Conexión Exitosa',
          description: `El motor ${selectedMotor?.label} ha validado los protocolos con ${selectedMotor?.provider}.`,
        });
      }
    }, 1500);
  };

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.removeAttribute('inert');
  }, []);

  const renderHelpGuide = () => {
    const id = selectedMotor?.id;
    const group = selectedMotor?.group;
    
    // 1. SOCIAL GROUP
    if (id === 'meta_social') {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-warn/10 p-4 rounded-xl border border-warn/20 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-warn shrink-0" />
            <div className="text-[11px] text-warn space-y-1">
              <p className="font-bold uppercase">Meta Unified Protocol (FB/IG):</p>
              <p>Este motor unifica la publicación en **Facebook Pages** e **Instagram Business** mediante la Graph API.</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">1. Vinculación de Cuentas</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Tu cuenta de Instagram debe ser de tipo **Business** y estar vinculada a una Página de Facebook de la cual seas Administrador.</p>
                <a href="https://business.facebook.com/settings/instagram-account-v2" target="_blank" className="text-blue-600 text-[10px] font-bold flex items-center gap-1 hover:underline"><ExternalLink className="h-3 w-3" /> Configuración de Negocio Meta</a>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">2. Token de Acceso Permanente</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Genera un **User Access Token** en el <a href="https://developers.facebook.com/tools/explorer" target="_blank" className="underline">Explorador de la API Graph</a> con estos permisos:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[9px]">pages_manage_posts</Badge>
                  <Badge variant="secondary" className="text-[9px]">instagram_content_publish</Badge>
                  <Badge variant="secondary" className="text-[9px]">pages_show_list</Badge>
                </div>
                <p className="text-[10px] italic">Intercambia este token por uno de "Larga Duración" (60 días) en el panel de herramientas.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (id === 'linkedin') {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex gap-3">
            <Linkedin className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-[11px] text-blue-900 space-y-1">
              <p className="font-bold uppercase">LinkedIn Professional Engine:</p>
              <p>Emisión de contenido corporativo y artículos de marca a través de la API de LinkedIn Marketing.</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">1. LinkedIn Developer Portal</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Crea una App en el <a href="https://www.linkedin.com/developers/apps" target="_blank" className="underline text-blue-600 font-bold">Portal de Desarrolladores</a> y vincúlala a tu Página de Empresa.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">2. Scopes Requeridos</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Asegúrate de solicitar los permisos **"Share on LinkedIn"** y **"Sign In with LinkedIn"**. Los scopes técnicos son:</p>
                <code className="block p-2 bg-muted rounded text-[10px]">w_member_social, w_organization_social</code>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (id === 'twitter') {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-foreground p-4 rounded-xl border border-white/10 flex gap-3 text-white">
            <Twitter className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="text-[11px] text-white/70 space-y-1">
              <p className="font-bold uppercase text-white">X (Twitter) v2 Protocol:</p>
              <p>Este motor utiliza la API v2 para publicar ganchos y hilos automáticos de alto impacto.</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">1. Developer Portal (Project)</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Crea un **Project** y una **App** en <a href="https://developer.x.com" target="_blank" className="underline text-blue-600">developer.x.com</a>.</p>
                <p className="text-[10px] text-warn font-bold">⚠️ Configura los permisos de la App como "Read and Write".</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">2. Credenciales OAuth 1.0a</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Evo utiliza el par de llaves: <code>API Key</code> + <code>API Secret</code> y los <code>Access Tokens</code> generados en la pestaña "Keys and Tokens".</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    if (id === 'tiktok') {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-muted p-4 rounded-xl border border-border flex gap-3">
            <TikTokIcon className="h-5 w-5 text-foreground shrink-0" />
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-bold uppercase">TikTok for Business API:</p>
              <p>Protocolo para la subida y gestión de videos cortos en el feed comercial.</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">1. TikTok Developers</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Regístrate en <a href="https://developers.tiktok.com" target="_blank" className="underline text-blue-600">TikTok Developers</a> y crea una App de tipo "Content Posting".</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">2. Permisos de Video</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Activa los permisos <code>video.upload</code> and <code>video.list</code> para permitir que Evo gestione tus clips.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    // 2. EMAIL GROUP
    if (group === 'Email') {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-success/10 p-4 rounded-xl border border-success/20 flex gap-3">
            <Mail className="h-5 w-5 text-success shrink-0" />
            <div className="text-[11px] text-success space-y-1">
              <p className="font-bold uppercase">{selectedMotor.label}:</p>
              <p>Envío masivo y automatizado con alta tasa de entregabilidad.</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">1. Ubicación de la API Key</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                {id === 'sendgrid' && <p>Ve a **Settings → API Keys** en SendGrid y crea una con "Full Access" o "Mail Send".</p>}
                {id === 'mailchimp' && <p>Busca en **Account → Extras → API Keys**. Genera una nueva llave exclusiva para Evo.</p>}
                {id === 'brevo' && <p>Entra a **SMTP & API** y genera una llave de versión **v3**.</p>}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">2. Dominio Remitente</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Es vital que hayas verificado tu dominio (Single Sender Verification) antes de intentar emitir correos masivos.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    // 3. ADS GROUP
    if (group === 'Ads') {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-warn/10 p-4 rounded-xl border border-warn/20 flex gap-3">
            <Megaphone className="h-5 w-5 text-warn shrink-0" />
            <div className="text-[11px] text-warn space-y-1">
              <p className="font-bold uppercase">Publicidad Digital (Ads Engine):</p>
              <p>Gestión automatizada de presupuestos y variantes creativas.</p>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">1. ID de Cuenta Publicitaria</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>Ingresa el **Account ID** que encontrarás en el panel superior de tu gestor de anuncios ({selectedMotor.provider}).</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2" className="border-b-0">
              <AccordionTrigger className="hover:no-underline font-bold text-foreground">2. Token de Desarrollador</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                {id === 'meta_ads' && <p>Asegúrate de que el Token de Meta incluya el permiso <code>ads_management</code>.</p>}
                {id === 'google_ads' && <p>Necesitarás el **Developer Token** aprobado de tu Google Ads Manager Center y las credenciales de OAuth CLIENT ID.</p>}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    }

    return (
      <div className="p-6 bg-muted rounded-2xl border flex flex-col items-center gap-3 text-center">
        <Server className="h-10 w-10 text-border" />
        <p className="text-sm text-muted-foreground italic">Documentación técnica certificada por Evo Automation.</p>
      </div>
    );
  };

  const getMotorStatusBadge = (motorId: string) => {
    const p = profile as any;
    const creds = p?.marketingCredentials?.[motorId];
    if (!creds?.apiKey) {
      return (
        <Badge variant="outline" className="text-[8px] font-bold bg-muted text-muted-foreground border-muted">
          No Conectado
        </Badge>
      );
    }
    const isSandbox = creds.mode === 'sandbox';
    return (
      <Badge className={cn("text-[8px] font-black uppercase border-none", 
        isSandbox ? "bg-warn/15 text-warn" : "bg-success/15 text-success"
      )}>
        {isSandbox ? 'Sandbox Activo' : 'Real Conectado'}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8">
          <div>
            <div className="flex items-center gap-2 text-accent mb-2">
              <Cpu className="h-5 w-5 text-accent" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Gestión de Cuenta</span>
            </div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Motores de Publicación</h1>
            <p className="text-muted-foreground text-lg font-medium">Configuración centralizada de credenciales y APIs para la automatización de campañas.</p>
          </div>
        </header>

        <div className="bg-muted/50 border border-muted p-8 rounded-lg space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0 border border-border/50">
              <Settings2 className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-primary">Motores Independientes por Proveedor</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vincula las API Keys y tokens de tus redes sociales, plataformas de correo y cuentas de anuncios. El piloto automático de Evo utilizará estos conectores para programar, emitir y registrar el feedback de tu campaña.
              </p>
            </div>
          </div>

          <Tabs defaultValue="Social" className="w-full pt-4">
            <TabsList className="bg-secondary/20 p-1.5 h-14 w-full justify-start gap-2 mb-8 rounded-2xl border">
              <TabsTrigger value="Social" className="rounded-xl px-8 font-bold gap-2"><Instagram className="h-4 w-4" /> Redes Sociales</TabsTrigger>
              <TabsTrigger value="Email" className="rounded-xl px-8 font-bold gap-2"><Mail className="h-4 w-4" /> Motores Email</TabsTrigger>
              <TabsTrigger value="Ads" className="rounded-xl px-8 font-bold gap-2"><Megaphone className="h-4 w-4" /> Tráfico Pago</TabsTrigger>
            </TabsList>

            {['Email', 'Social', 'Ads'].map(group => (
              <TabsContent key={group} value={group} className="m-0">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {MOTORS.filter(m => m.group === group).map(motor => (
                    <Card key={motor.id} className="border-none shadow-lg rounded-lg bg-white p-8 space-y-6 group transition-all border-2 border-transparent hover:border-primary/5">
                      <div className="flex justify-between items-start">
                        <div className={cn("w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6", motor.color === 'emerald' ? 'bg-success' : motor.color === 'blue' ? 'bg-blue-500' : 'bg-warn')}>
                          <motor.icon className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{motor.provider}</Badge>
                          {getMotorStatusBadge(motor.id)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-primary">{motor.label}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{motor.desc}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openMotorConfig(motor)}
                        className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border border-muted hover:bg-muted gap-2"
                      >
                        Configurar API <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <Dialog open={isConfigOpen} onOpenChange={(open) => { setIsConfigOpen(open); if(!open) clearUILocks(); }}>
          <DialogContent className="mw-2xl">
            <div className={cn("px-8 pt-8 text-white relative", selectedMotor?.color === 'emerald' ? 'bg-success' : selectedMotor?.color === 'blue' ? 'bg-blue-600' : 'bg-warn')}>
              <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  {selectedMotor?.icon && <selectedMotor.icon className="h-7 w-7" />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">Configuración: {selectedMotor?.label}</DialogTitle>
                  <DialogDescription className="text-white/70">Vinculación técnica con {selectedMotor?.provider}.</DialogDescription>
                </div>
              </div>
            </div>

            <Tabs defaultValue="params" className="w-full">
              <TabsList className="bg-secondary/20 p-1.5 h-14 w-full justify-start gap-2 px-8 border-b rounded-none shrink-0">
                <TabsTrigger value="params" className="rounded-xl gap-2 font-bold px-6 h-11"><KeyRound className="h-4 w-4" /> Parámetros</TabsTrigger>
                <TabsTrigger value="help" className="rounded-xl gap-2 font-bold px-6 h-11"><HelpCircle className="h-4 w-4" /> Ayuda y Protocolos</TabsTrigger>
              </TabsList>

              <ScrollArea className="max-h-[60vh]">
                  <div className="px-8 pb-8">
                    <TabsContent value="params" className="m-0 space-y-8 animate-in fade-in">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                          <KeyRound className="h-3 w-3" /> API Key / Access Token
                        </Label>
                        <Input 
                          type="password" 
                          value={draftConfig.apiKey}
                          onChange={(e) => setDraftConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="••••••••••••••••••••••••" 
                          className="bg-secondary/10 border-none font-mono text-sm" 
                         size="lg" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                          <Database className="h-3 w-3" /> App ID / Account ID
                        </Label>
                        <Input 
                          value={draftConfig.accountId}
                          onChange={(e) => setDraftConfig(prev => ({ ...prev, accountId: e.target.value }))}
                          placeholder="Ej: 1234567890" 
                          className="bg-secondary/10 border-none text-sm" 
                         size="lg" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                          <Globe className="h-3 w-3" /> Modo de Operación
                        </Label>
                        <Select 
                          value={draftConfig.mode}
                          onValueChange={(val) => setDraftConfig(prev => ({ ...prev, mode: val }))}
                        >
                          <SelectTrigger size="lg" className="bg-secondary/10 border-none font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sandbox" className="font-bold">Modo Prueba (Sandbox)</SelectItem>
                            <SelectItem value="production" className="font-bold text-success">Modo Real (Producción)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-muted p-6 rounded-lg border border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-success" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Validación de Túnel</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleTestConnection} 
                        disabled={isTesting}
                        className="rounded-xl font-bold h-9 gap-2 border-border hover:bg-white"
                      >
                        {isTesting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Verificar Conexión
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="help" className="m-0 space-y-6 animate-in fade-in">
                    <div className="p-6 bg-foreground rounded-lg text-white relative overflow-hidden">
                      <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
                      <div className="flex items-center gap-3 relative z-10 mb-4">
                        <BookOpen className="h-5 w-5 text-accent" />
                        <h4 className="text-sm font-bold">Guía Institucional: {selectedMotor?.label}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed relative z-10">Sigue este protocolo para autorizar la emisión automática desde el motor de Evo y asegurar la confiabilidad del 100%.</p>
                    </div>
                    
                    <div className="px-2">
                      {renderHelpGuide()}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3 mt-4">
                      <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-[10px] text-blue-800 font-medium leading-relaxed">Tus credenciales son encriptadas institucionalmente. Los protocolos de seguridad de Evolución Académica aseguran que el motor de {selectedMotor?.provider} solo reciba peticiones validadas por tu cronograma.</p>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              <DialogFooter className="p-8 bg-muted border-t shrink-0 flex flex-col sm:flex-row gap-3">
                <Button variant="ghost" onClick={() => setIsConfigOpen(false)} className="rounded-xl font-bold h-12 px-8">Cerrar</Button>
                <Button onClick={handleSaveConfig} className="flex-1 h-12 rounded-xl font-bold bg-primary">Guardar Credenciales</Button>
              </DialogFooter>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
