'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { QRCodeSVG } from 'qrcode.react';
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
  Zap,
  PhoneCall,
  Loader2,
  Send,
  UserCheck,
  UserX,
  MessageCircle,
  Search,
  ArrowRight,
  User,
  CheckCheck,
} from 'lucide-react';
import { IoLogoWhatsapp } from 'react-icons/io5';

const DIRECT_EVO_URL = 'https://bilon.pagarqr.ar/fastoria-evolution';
const DIRECT_EVO_HEADERS = {
  'x-internal-proxy-token': 'fastoria_proxy_token_98374fa21bc894de01',
  'apikey': 'fastoria_evo_key_8f92a10b45cd2e1a87',
};

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

interface ConversationItem {
  id: string;
  phone: string;
  display_name?: string;
  mode: 'BOT' | 'HUMAN';
  last_message?: string;
  last_message_at?: string;
  last_message_time?: string;
  inbound_count?: number;
  total_messages?: number;
  notes?: string;
  tags?: string[];
  lead_status?: 'nuevo' | 'interesado' | 'cliente' | 'cerrado' | 'seguimiento' | string;
  assigned_agent?: string;
  email?: string;
}

interface ChatMessage {
  id: string;
  external_message_id?: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'bot' | 'human';
  content: string;
  handled_by?: string;
  created_at: string;
}

const CANNED_RESPONSES = [
  { label: '👋 Saludo', text: '¡Hola! Te escribe un asesor del equipo de Fastoria. ¿En qué podemos ayudarte hoy?' },
  { label: '💎 Planes y Precios', text: 'Contamos con planes diseñados a tu medida: Básico ($9.999), Pro ($19.999) y Elite ($39.999) con créditos de IA, landings y mentoría. Podés ver el detalle en https://fastoria.com.ar/planes' },
  { label: '💳 Medios de Pago', text: 'Aceptamos transferencias bancarias, tarjetas de crédito/débito y Mercado Pago con activación inmediata.' },
  { label: '🤖 Demo de IA', text: 'Con Fastoria podés generar guiones, voces clonadas y videos de alta conversión con un solo clic. ¿Te gustaría agendar una demo en vivo?' },
  { label: '🤝 Asesor Comercial', text: 'Te derivo con un especialista comercial para coordinar una reunión y evaluar el mejor plan para tu proyecto.' },
];

export default function WhatsAppBotAdminPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingPlans, setSyncingPlans] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  // Status state
  const [botStatus, setBotStatus] = useState<{
    instance?: string;
    state?: 'open' | 'connecting' | 'close';
    qrCode?: string;
    pairingCode?: string;
    phone?: string;
  }>({
    instance: 'fastoria',
    state: 'close',
    qrCode: '',
    phone: '',
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
    salesGroupJid: '120363412233530296@g.us',
    supportGroupJid: '120363413305659507@g.us',
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

  // Live Chat state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'BOT' | 'HUMAN' | 'interesado' | 'cliente'>('all');

  // CRM Profile State (for current active conversation)
  const [crmDisplayName, setCrmDisplayName] = useState('');
  const [crmEmail, setCrmEmail] = useState('');
  const [crmStatus, setCrmStatus] = useState<string>('nuevo');
  const [crmNotes, setCrmNotes] = useState('');
  const [crmTags, setCrmTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [savingCrm, setSavingCrm] = useState(false);
  const [transferring, setTransferring] = useState<string | null>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync CRM state when active conversation changes
  useEffect(() => {
    if (selectedPhone) {
      const active = conversations.find((c) => c.phone === selectedPhone);
      if (active) {
        setCrmDisplayName(active.display_name || '');
        setCrmEmail(active.email || '');
        setCrmStatus(active.lead_status || 'nuevo');
        setCrmNotes(active.notes || '');
        setCrmTags(Array.isArray(active.tags) ? active.tags : []);
      }
    }
  }, [selectedPhone, conversations]);

  // Check direct instance status from Evolution API
  const checkDirectEvolution = async () => {
    try {
      const instRes = await fetch(`${DIRECT_EVO_URL}/instance/fetchInstances`, {
        headers: DIRECT_EVO_HEADERS,
      });

      if (instRes.ok) {
        const instances = await instRes.json();
        const inst = Array.isArray(instances)
          ? instances.find((i: any) => i.name === 'fastoria')
          : instances;

        if (inst && inst.connectionStatus === 'open') {
          const phoneNum = inst.ownerJid
            ? inst.ownerJid.replace('@s.whatsapp.net', '')
            : inst.number || '';

          setBotStatus((prev) => ({
            ...prev,
            state: 'open',
            phone: phoneNum,
            qrCode: '',
          }));
          return true;
        }
      }

      const evoRes = await fetch(`${DIRECT_EVO_URL}/instance/connect/fastoria`, {
        headers: DIRECT_EVO_HEADERS,
      });
      if (evoRes.ok) {
        const evoData = await evoRes.json();
        const qr = evoData?.base64 || evoData?.qrcode?.base64 || evoData?.code || '';
        if (qr) {
          setBotStatus((prev) => ({
            ...prev,
            qrCode: qr,
            pairingCode: evoData?.pairingCode || prev.pairingCode,
            state: evoData?.state || 'connecting',
          }));
          return true;
        }
      }
    } catch (e: any) {
      console.warn('Direct Evolution fetch warning:', e.message);
    }
    return false;
  };

  // Fetch status helper
  const fetchStatus = async () => {
    try {
      const statusRes = await fetch(`/api/admin/whatsapp-bot?action=status&_t=${Date.now()}`);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setBotStatus((prev) => ({
          instance: data.instance || 'fastoria',
          state: data.state || 'close',
          qrCode: data.qrCode || prev.qrCode,
          pairingCode: data.pairingCode || prev.pairingCode,
          phone: data.phone || prev.phone,
        }));

        if (data.state !== 'open') {
          await checkDirectEvolution();
        }
        return data;
      }
    } catch (err: any) {
      console.warn('Error al consultar estado:', err.message);
      await checkDirectEvolution();
    }
    return null;
  };

  // Fetch conversations list
  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoadingConversations(true);
      const res = await fetch(`/api/admin/whatsapp-bot?action=conversations&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const convList: ConversationItem[] = data.conversations || [];
        setConversations(convList);
        if (convList.length > 0 && !selectedPhone) {
          setSelectedPhone(convList[0].phone);
        }
      }
    } catch (e: any) {
      console.warn('Error cargando conversaciones:', e.message);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (phone: string, silent = false) => {
    if (!phone) return;
    try {
      if (!silent) setLoadingMessages(true);
      const res = await fetch(`/api/admin/whatsapp-bot?action=messages&phone=${encodeURIComponent(phone)}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e: any) {
      console.warn('Error cargando mensajes:', e.message);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Send human message from admin dashboard
  const handleSendMessage = async (textCustom?: string) => {
    const textToSend = (textCustom || replyText).trim();
    if (!selectedPhone || !textToSend || sendingReply) return;

    try {
      setSendingReply(true);
      if (!textCustom) setReplyText('');

      const res = await fetch('/api/admin/whatsapp-bot?action=send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          text: textToSend,
          senderName: profile?.displayName || 'Asesor Fastoria',
        }),
      });

      if (res.ok) {
        toast({
          title: 'Mensaje enviado',
          description: 'Respuesta despachada directamente al WhatsApp del cliente.',
        });
        await fetchMessages(selectedPhone, true);
        await fetchConversations(true);
      } else {
        throw new Error('Error al despachar el mensaje');
      }
    } catch (err: any) {
      toast({
        title: 'Error al enviar',
        description: err.message || 'No se pudo enviar el mensaje por WhatsApp.',
        variant: 'destructive',
      });
      if (!textCustom) setReplyText(textToSend);
    } finally {
      setSendingReply(false);
    }
  };

  // Toggle Mode (Takeover / Resume Bot)
  const handleToggleMode = async (phone: string, targetMode: 'BOT' | 'HUMAN') => {
    try {
      const res = await fetch('/api/admin/whatsapp-bot?action=toggle-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: targetMode }),
      });

      if (res.ok) {
        toast({
          title: targetMode === 'BOT' ? 'Bot IA Reanudado' : 'Control Tomado (Modo Humano)',
          description:
            targetMode === 'BOT'
              ? 'El asistente virtual volverá a responder automáticamente.'
              : 'El bot ha sido pausado para este chat. Podés atenderlo manualmente.',
        });
        await fetchConversations(true);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el modo de la conversación.',
        variant: 'destructive',
      });
    }
  };

  // Transfer conversation to WhatsApp group (Ventas / Soporte)
  const handleTransferGroup = async (department: 'ventas' | 'soporte') => {
    if (!selectedPhone) return;
    try {
      setTransferring(department);
      const res = await fetch('/api/admin/whatsapp-bot?action=transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          department,
          reason: `Derivación manual de ${profile?.displayName || 'Asesor'} desde el Live Chat Fastoria`,
        }),
      });

      if (res.ok) {
        toast({
          title: `Derivado al grupo de ${department === 'ventas' ? 'Ventas' : 'Soporte'}`,
          description: 'Se envió una tarjeta de derivación con el historial al grupo oficial de WhatsApp.',
        });
        await fetchConversations(true);
      } else {
        throw new Error('Error al transferir');
      }
    } catch (err: any) {
      toast({
        title: 'Error al derivar',
        description: err.message || 'No se pudo enviar la derivación al grupo de WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setTransferring(null);
    }
  };

  // Save CRM Profile
  const handleSaveCrmProfile = async () => {
    if (!selectedPhone) return;
    try {
      setSavingCrm(true);
      const res = await fetch(`/api/admin/whatsapp-bot?action=update-conversation&phone=${encodeURIComponent(selectedPhone)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: crmDisplayName,
          email: crmEmail,
          lead_status: crmStatus,
          notes: crmNotes,
          tags: crmTags,
          assigned_agent: profile?.displayName || 'Asesor Fastoria',
        }),
      });

      if (res.ok) {
        toast({
          title: 'Ficha del Cliente Guardada',
          description: 'Los datos y notas internas fueron actualizados con éxito.',
        });
        await fetchConversations(true);
      } else {
        throw new Error('Error al actualizar ficha');
      }
    } catch (err: any) {
      toast({
        title: 'Error al guardar',
        description: err.message || 'No se pudo guardar la ficha del cliente.',
        variant: 'destructive',
      });
    } finally {
      setSavingCrm(false);
    }
  };

  // Add a tag to CRM profile
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!crmTags.includes(tag)) {
      setCrmTags([...crmTags, tag]);
    }
    setNewTagInput('');
  };

  // Remove tag from CRM profile
  const handleRemoveTag = (tagToRemove: string) => {
    setCrmTags(crmTags.filter((t) => t !== tagToRemove));
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchStatus();
        await fetchConversations();

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

  // Polling for selected conversation messages and list
  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
    }
  }, [selectedPhone]);

  // Periodic background refresh for Live Chat (every 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'chat') {
        fetchConversations(true);
        if (selectedPhone) {
          fetchMessages(selectedPhone, true);
        }
      }
      if (botStatus.state !== 'open') {
        fetchStatus();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, selectedPhone, botStatus.state]);

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
      await checkDirectEvolution();
      toast({
        title: 'Estado verificado',
        description: 'Se consultó el estado de conexión con Evolution API.',
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

  // Logout / Disconnect
  const handleLogout = async () => {
    if (!confirm('¿Estás seguro de que deseas desconectar la línea de WhatsApp?')) return;
    try {
      setLoggingOut(true);
      await fetch(`${DIRECT_EVO_URL}/instance/logout/fastoria`, {
        method: 'DELETE',
        headers: DIRECT_EVO_HEADERS,
      }).catch(() => {});

      await fetch('/api/admin/whatsapp-bot?action=logout', { method: 'POST' });

      setBotStatus({
        instance: 'fastoria',
        state: 'close',
        qrCode: '',
        phone: '',
      });
      toast({
        title: 'Sesión cerrada',
        description: 'Se desconectó la sesión de WhatsApp.',
      });
      handleRefreshQr();
    } catch (err) {
      toast({
        title: 'Error al desconectar',
        description: 'No se pudo cerrar la sesión.',
        variant: 'destructive',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const isQrBase64 = botStatus.qrCode?.startsWith('data:image') || botStatus.qrCode?.startsWith('iVBORw0KGgo');
  const qrImageSrc = isQrBase64
    ? botStatus.qrCode?.startsWith('data:image')
      ? botStatus.qrCode
      : `data:image/png;base64,${botStatus.qrCode}`
    : null;

  // Filtered conversations with multi-field search and mode tabs
  const filteredConversations = conversations.filter((c) => {
    const q = chatSearch.toLowerCase();
    const matchesSearch =
      c.phone.toLowerCase().includes(q) ||
      (c.display_name && c.display_name.toLowerCase().includes(q)) ||
      (c.last_message && c.last_message.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q)) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)));

    if (!matchesSearch) return false;

    if (filterMode === 'BOT') return c.mode === 'BOT';
    if (filterMode === 'HUMAN') return c.mode === 'HUMAN';
    if (filterMode === 'interesado') return c.lead_status === 'interesado';
    if (filterMode === 'cliente') return c.lead_status === 'cliente';

    return true;
  });

  const activeConversation = conversations.find((c) => c.phone === selectedPhone);
  const botModeCount = conversations.filter((c) => c.mode === 'BOT').length;
  const humanModeCount = conversations.filter((c) => c.mode === 'HUMAN').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
                <IoLogoWhatsapp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  WhatsApp CRM & Live Chat
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Fastoria Pro
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bandeja en vivo, toma de control instantánea, gestión CRM de clientes y derivaciones a WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Metrics */}
            <div className="hidden lg:flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border text-xs">
              <span className="text-muted-foreground">Chats: <strong className="text-foreground">{conversations.length}</strong></span>
              <span className="text-border">|</span>
              <span className="text-purple-600 font-semibold flex items-center gap-1">
                <Bot className="w-3 h-3" /> {botModeCount} Bot
              </span>
              <span className="text-border">|</span>
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> {humanModeCount} Asesor
              </span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-background text-xs font-semibold shadow-xs">
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
                  ? `+${botStatus.phone || '1176411666'} En Línea`
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
              {syncingPlans ? 'Sincronizando...' : 'Sincronizar Catálogo'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="grid grid-cols-4 max-w-xl bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="chat" className="gap-2 text-xs font-semibold rounded-lg">
              <MessageSquare className="w-3.5 h-3.5" />
              Live Chat & CRM
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-2 text-xs font-semibold rounded-lg">
              <QrCode className="w-3.5 h-3.5" />
              Conexión & QR
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 text-xs font-semibold rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              Comportamiento & IA
            </TabsTrigger>
            <TabsTrigger value="rag" className="gap-2 text-xs font-semibold rounded-lg">
              <Database className="w-3.5 h-3.5" />
              Base RAG
            </TabsTrigger>
          </TabsList>

          {/* TAB 0: LIVE CHAT & CRM WORKSPACE */}
          <TabsContent value="chat" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[680px]">
              
              {/* COL 1: CONVERSATIONS LIST & SEARCH (3.5 cols) */}
              <Card className="lg:col-span-4 xl:col-span-3 flex flex-col border border-border shadow-xs overflow-hidden h-[700px]">
                <CardHeader className="p-3 border-b bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Conversaciones ({filteredConversations.length})
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => fetchConversations()}
                      disabled={loadingConversations}
                      title="Actualizar lista"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingConversations ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, cel, notas..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-background"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-2 py-0.5 rounded-full font-semibold transition shrink-0 ${
                        filterMode === 'all'
                          ? 'bg-foreground text-background shadow-xs'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Todos ({conversations.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('BOT')}
                      className={`px-2 py-0.5 rounded-full font-semibold transition shrink-0 ${
                        filterMode === 'BOT'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'
                      }`}
                    >
                      🤖 Bot ({botModeCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('HUMAN')}
                      className={`px-2 py-0.5 rounded-full font-semibold transition shrink-0 ${
                        filterMode === 'HUMAN'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20'
                      }`}
                    >
                      👤 Humano ({humanModeCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('interesado')}
                      className={`px-2 py-0.5 rounded-full font-semibold transition shrink-0 ${
                        filterMode === 'interesado'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      🔥 Leads
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-border/40">
                  {loadingConversations && conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                      <p className="text-xs">Cargando conversaciones...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs space-y-1">
                      <p className="font-semibold text-foreground">Sin resultados</p>
                      <p className="text-muted-foreground text-[11px]">
                        {chatSearch ? 'No hay chats que coincidan con la búsqueda.' : 'Aún no hay mensajes registrados.'}
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
                      const isSelected = selectedPhone === conv.phone;
                      const isLid = conv.phone.includes('@lid');
                      const displayPhone = isLid
                        ? (conv.display_name ? conv.display_name : 'Usuario WhatsApp')
                        : `+${conv.phone}`;

                      return (
                        <div
                          key={conv.id || conv.phone}
                          onClick={() => setSelectedPhone(conv.phone)}
                          className={`p-3 cursor-pointer transition flex items-start gap-2.5 text-left ${
                            isSelected
                              ? 'bg-primary/10 border-l-4 border-primary'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                            {conv.display_name ? conv.display_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {conv.display_name || displayPhone}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                  conv.mode === 'HUMAN'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                    : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                }`}
                              >
                                {conv.mode === 'HUMAN' ? 'Humano' : 'Bot IA'}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                              {conv.last_message || 'Sin mensajes'}
                            </p>

                            {/* Tags and Lead Status preview */}
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-muted-foreground/70">
                              <div className="flex items-center gap-1 overflow-hidden">
                                {conv.lead_status && conv.lead_status !== 'nuevo' && (
                                  <span className="text-[9px] font-semibold px-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    {conv.lead_status}
                                  </span>
                                )}
                                {conv.tags && conv.tags.length > 0 && (
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[90px]">
                                    #{conv.tags[0]}
                                  </span>
                                )}
                              </div>
                              {conv.last_message_at && (
                                <span className="font-mono text-[9px] shrink-0">
                                  {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* COL 2: LIVE CHAT MESSAGES & COMPOSER (5.5 cols) */}
              <Card className="lg:col-span-5 xl:col-span-6 flex flex-col border border-border shadow-xs overflow-hidden h-[700px]">
                {selectedPhone ? (
                  <>
                    {/* Header del Chat */}
                    <div className="p-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                          {activeConversation?.display_name ? activeConversation.display_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-foreground truncate flex items-center gap-1.5">
                            {activeConversation?.display_name || selectedPhone}
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                                activeConversation?.mode === 'HUMAN'
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                  : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                              }`}
                            >
                              {activeConversation?.mode === 'HUMAN' ? '👤 Modo Asesor' : '🤖 IA Activa'}
                            </span>
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {selectedPhone.includes('@lid') ? 'WhatsApp LID' : `+${selectedPhone}`}
                          </p>
                        </div>
                      </div>

                      {/* Mode Toggle Switch & Actions */}
                      <div className="flex items-center gap-1.5">
                        {activeConversation?.mode === 'HUMAN' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-semibold border-purple-500/40 text-purple-600 hover:bg-purple-500/10 gap-1.5"
                            onClick={() => handleToggleMode(selectedPhone, 'BOT')}
                          >
                            <Bot className="w-3 h-3 text-purple-600" />
                            Devolver al Bot IA
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-semibold border-blue-500/40 text-blue-600 hover:bg-blue-500/10 gap-1.5"
                            onClick={() => handleToggleMode(selectedPhone, 'HUMAN')}
                          >
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            Tomar Control (Modo Humano)
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => fetchMessages(selectedPhone)}
                          disabled={loadingMessages}
                          title="Actualizar mensajes"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingMessages ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-muted/10">
                      {loadingMessages && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          <p className="text-xs">Cargando mensajes del chat...</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-xs p-6 space-y-1">
                          <MessageSquare className="w-6 h-6 text-muted-foreground/40 mb-1" />
                          <p className="font-semibold text-foreground">Sin mensajes previos</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            Escribe una respuesta abajo o selecciona una plantilla rápida para enviar por WhatsApp.
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isInbound = msg.direction === 'inbound';
                          const isBot = msg.sender_type === 'bot';
                          const isHuman = msg.sender_type === 'human';

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${
                                isInbound ? 'items-start' : 'items-end'
                              }`}
                            >
                              <div
                                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 text-xs space-y-1 shadow-xs ${
                                  isInbound
                                    ? 'bg-background border border-border text-foreground rounded-tl-none'
                                    : isBot
                                    ? 'bg-emerald-600 text-white rounded-tr-none'
                                    : 'bg-primary text-primary-foreground rounded-tr-none'
                                }`}
                              >
                                {/* Sender Tag & Time */}
                                <div className="flex items-center justify-between gap-3 text-[10px] opacity-85 font-semibold pb-0.5">
                                  <span>
                                    {isInbound
                                      ? activeConversation?.display_name || 'Cliente WhatsApp'
                                      : isBot
                                      ? '🤖 Bot IA Fastoria'
                                      : `👤 ${msg.handled_by || 'Asesor Fastoria'}`}
                                  </span>
                                  {msg.created_at && (
                                    <span className="font-mono text-[9px] opacity-75">
                                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>

                                <p className="leading-relaxed whitespace-pre-wrap select-text text-[11.5px]">{msg.content}</p>

                                {!isInbound && (
                                  <div className="flex justify-end pt-0.5">
                                    <CheckCheck className="w-3 h-3 opacity-75" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Canned Responses Toolbar (Respuestas Rápidas) */}
                    <div className="px-3 py-1.5 bg-muted/30 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider shrink-0 mr-1 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-500" /> Snippets:
                      </span>
                      {CANNED_RESPONSES.map((snip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyText(snip.text)}
                          className="px-2 py-0.5 text-[10.5px] font-semibold bg-background border border-border/80 hover:border-primary/40 hover:bg-primary/5 rounded-md text-foreground transition shrink-0"
                          title="Hacer clic para insertar en el mensaje"
                        >
                          {snip.label}
                        </button>
                      ))}
                    </div>

                    {/* Composer / Barra de Respuesta */}
                    <div className="p-3 border-t bg-background">
                      <div className="flex items-end gap-2">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Escribe un mensaje de WhatsApp... (Enter para enviar)"
                          rows={2}
                          className="text-xs resize-none flex-1 leading-relaxed"
                          disabled={sendingReply}
                        />
                        <Button
                          onClick={() => handleSendMessage()}
                          disabled={!replyText.trim() || sendingReply}
                          size="sm"
                          className="h-12 px-4 font-semibold shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                          {sendingReply ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span className="hidden sm:inline">Enviar</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          Al enviar una respuesta manual, el chat pasa a modo Humano.
                        </span>
                        {!selectedPhone.includes('@lid') && (
                          <a
                            href={`https://wa.me/${selectedPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            Abrir WhatsApp Web <ArrowRight className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                    <h4 className="font-bold text-sm text-foreground">Selecciona una conversación</h4>
                    <p className="text-xs max-w-sm mt-1">
                      Elige un chat de la lista izquierda para ver el historial y responder directamente desde Fastoria a WhatsApp.
                    </p>
                  </div>
                )}
              </Card>

              {/* COL 3: FICHA DEL CLIENTE / CRM PROFILE (3.5 cols) */}
              <Card className="lg:col-span-3 xl:col-span-3 flex flex-col border border-border shadow-xs overflow-hidden h-[700px]">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Ficha del Cliente (CRM)
                  </CardTitle>
                  <Button
                    onClick={handleSaveCrmProfile}
                    disabled={savingCrm || !selectedPhone}
                    size="sm"
                    className="h-6 px-2 text-[10px] font-semibold gap-1 bg-primary text-primary-foreground"
                  >
                    {savingCrm ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                    Guardar
                  </Button>
                </CardHeader>

                <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-4 text-xs">
                  {selectedPhone ? (
                    <>
                      {/* Nombre y Teléfono */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-xl border">
                        <div>
                          <Label className="text-[11px] text-muted-foreground font-semibold">Nombre del Contacto</Label>
                          <Input
                            value={crmDisplayName}
                            onChange={(e) => setCrmDisplayName(e.target.value)}
                            placeholder="Ej: Martín Rodríguez"
                            className="h-7 text-xs mt-1 bg-background"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground font-semibold">Correo Electrónico</Label>
                          <Input
                            type="email"
                            value={crmEmail}
                            onChange={(e) => setCrmEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="h-7 text-xs mt-1 bg-background"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground font-semibold">Estado del Lead</Label>
                          <Select value={crmStatus} onValueChange={setCrmStatus}>
                            <SelectTrigger className="h-7 text-xs mt-1 bg-background">
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nuevo">🟡 Nuevo Contacto</SelectItem>
                              <SelectItem value="interesado">🟢 Interesado / Prospecto</SelectItem>
                              <SelectItem value="cliente">🔵 Cliente Activo</SelectItem>
                              <SelectItem value="seguimiento">🟣 En Seguimiento</SelectItem>
                              <SelectItem value="cerrado">⚪ Cerrado / No Interesado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Etiquetas / Tags */}
                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                          <span>Etiquetas del Lead</span>
                          <span className="text-[10px] font-normal">{crmTags.length} asignadas</span>
                        </Label>
                        <div className="flex flex-wrap gap-1 min-h-[28px] p-1.5 bg-muted/20 border rounded-lg">
                          {crmTags.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground/60 italic p-1">Sin etiquetas</span>
                          ) : (
                            crmTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="hover:text-destructive transition"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        <div className="flex gap-1.5">
                          <Input
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="Nueva etiqueta (ej: Plan Pro)..."
                            className="h-7 text-xs bg-background"
                          />
                          <Button
                            type="button"
                            onClick={handleAddTag}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs font-semibold shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Notas Internas del Asesor */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
                          <span>Notas Internas del Asesor</span>
                          <span className="text-[10px] font-normal text-muted-foreground">Privado</span>
                        </Label>
                        <Textarea
                          value={crmNotes}
                          onChange={(e) => setCrmNotes(e.target.value)}
                          placeholder="Escribe notas sobre intereses del cliente, presupuesto o acuerdos..."
                          rows={4}
                          className="text-xs resize-none bg-background leading-relaxed"
                        />
                      </div>

                      {/* Acciones de Derivación a Grupos */}
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="text-[11px] text-muted-foreground font-semibold">Derivación a Grupos WhatsApp</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            onClick={() => handleTransferGroup('ventas')}
                            disabled={transferring !== null}
                            variant="outline"
                            size="sm"
                            className="h-8 text-[11px] font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1"
                          >
                            {transferring === 'ventas' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            Grupo Ventas
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleTransferGroup('soporte')}
                            disabled={transferring !== null}
                            variant="outline"
                            size="sm"
                            className="h-8 text-[11px] font-semibold border-blue-500/30 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 gap-1"
                          >
                            {transferring === 'soporte' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <PhoneCall className="w-3 h-3" />
                            )}
                            Grupo Soporte
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground text-xs space-y-2">
                      <User className="w-8 h-8 text-muted-foreground/30" />
                      <p>Selecciona un contacto para visualizar y editar su ficha de cliente.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TAB 1: CONEXIÓN & QR */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    Vinculación de WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Estado de la sesión oficial de Fastoria en Evolution API.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                  {botStatus.state === 'open' ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Instancia Vinculada y Activa</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        {botStatus.phone ? (
                          <>Línea <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{botStatus.phone}</span> vinculada y respondiendo en tiempo real.</>
                        ) : (
                          <>El bot está en línea y respondiendo mensajes en tiempo real.</>
                        )}
                      </p>

                      <div className="pt-4">
                        <Button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          variant="destructive"
                          size="sm"
                          className="gap-2 text-xs font-semibold"
                        >
                          <Power className="w-3.5 h-3.5" />
                          {loggingOut ? 'Desconectando...' : 'Desconectar / Cambiar Número'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/20 shadow-md flex flex-col items-center justify-center min-w-[240px] min-h-[240px]">
                        {qrImageSrc ? (
                          <img
                            src={qrImageSrc}
                            alt="Código QR de WhatsApp"
                            className="w-56 h-56 object-contain rounded-lg"
                          />
                        ) : botStatus.qrCode ? (
                          <QRCodeSVG
                            value={botStatus.qrCode}
                            size={220}
                            level="M"
                            includeMargin={false}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3 p-6 text-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p className="text-xs font-medium">Cargando código QR desde Evolution API...</p>
                          </div>
                        )}
                      </div>

                      {botStatus.pairingCode && (
                        <div className="p-2.5 bg-muted/60 rounded-xl border text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código de Emparejamiento</p>
                          <p className="text-sm font-mono font-black text-primary tracking-widest">{botStatus.pairingCode}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Actualización automática en tiempo real</span>
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
                      {refreshingQr ? 'Verificando...' : 'Verificar / Actualizar Estado'}
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

          {/* TAB 2: COMUNICACIÓN & IA */}
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
