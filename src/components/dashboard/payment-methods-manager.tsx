'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Save, 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  Wallet,
  Settings2,
  Eye,
  EyeOff,
  Info,
  KeyRound
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PaymentMethodsManagerProps {
  title: React.ReactNode;
  description: string;
  collectionPath: string;
  infoCards: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'emerald' | 'indigo' | 'amber';
  }[];
}

export function PaymentMethodsManager({ title, description, collectionPath, infoCards }: PaymentMethodsManagerProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  const methodsQuery = useMemoFirebase(() => {
    if (!collectionPath) return null;
    return query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
  }, [db, collectionPath]);
  
  const { data: methods, isLoading: methodsLoading } = useCollection(methodsQuery);

  const [formData, setFormData] = useState({
    name: '',
    type: 'mercadopago',
    isActive: true,
    capabilities: {
      directPayment: true,
      subscription: false
    },
    config: {
      publicKey: '',
      accessToken: '',
      clientId: '',
      clientSecret: '',
      secretKey: '',
      webhookSecret: '',
      currency: 'usd',
      sellerId: '',
      alias: '',
      cbu: '',
      bankName: '',
      titularName: ''
    }
  });

  const handleOpenDialog = (method: any = null) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        type: method.type || 'mercadopago',
        isActive: method.isActive ?? true,
        capabilities: {
          directPayment: method.capabilities?.directPayment ?? true,
          subscription: method.capabilities?.subscription ?? false
        },
        config: {
          publicKey: method.config?.publicKey || '',
          accessToken: method.config?.accessToken || '',
          clientId: method.config?.clientId || '',
          clientSecret: method.config?.clientSecret || '',
          secretKey: method.config?.secretKey || '',
          webhookSecret: method.config?.webhookSecret || '',
          currency: method.config?.currency || 'usd',
          sellerId: method.config?.sellerId || '',
          alias: method.config?.alias || '',
          cbu: method.config?.cbu || '',
          bankName: method.config?.bankName || '',
          titularName: method.config?.titularName || ''
        }
      });
    } else {
      setEditingMethod(null);
      setFormData({ 
        name: '', 
        type: 'mercadopago', 
        isActive: true,
        capabilities: { directPayment: true, subscription: false },
        config: { publicKey: '', accessToken: '', clientId: '', clientSecret: '', secretKey: '', webhookSecret: '', currency: 'usd', sellerId: '', alias: '', cbu: '', bankName: '', titularName: '' } 
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveMethod = async () => {
    if (!formData.name) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'El nombre descriptivo es obligatorio.' });
      return;
    }
    
    if (formData.type === 'mercadopago' && (!formData.config.publicKey || !formData.config.accessToken)) {
      toast({ variant: 'destructive', title: 'Credenciales incompletas', description: 'Public Key y Access Token son obligatorios para Mercado Pago.' });
      return;
    }

    if (formData.type === 'getnet' && (!formData.config.clientId || !formData.config.clientSecret || !formData.config.sellerId)) {
      toast({ variant: 'destructive', title: 'Credenciales incompletas', description: 'Client ID, Client Secret y Seller ID son obligatorios para Getnet.' });
      return;
    }

    if (formData.type === 'stripe' && (!formData.config.secretKey)) {
      toast({ variant: 'destructive', title: 'Credenciales incompletas', description: 'Secret Key es obligatoria para Stripe.' });
      return;
    }

    setLoading(true);
    const methodId = editingMethod?.id || `pm_${Math.random().toString(36).substring(2, 9)}`;
    const methodRef = doc(db, collectionPath, methodId);
    
    const methodData = {
      ...formData,
      id: methodId,
      updatedAt: serverTimestamp(),
      createdAt: editingMethod?.createdAt || serverTimestamp()
    };

    try {
      await setDoc(methodRef, methodData, { merge: true });
      toast({ title: editingMethod ? 'Método actualizado' : 'Método de cobro creado' });
      setIsDialogOpen(false);
    } catch (e) {
      console.error("[PaymentMethodsManager] Error al guardar:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este método de cobro?')) return;
    
    deleteDoc(doc(db, collectionPath, id))
      .then(() => toast({ title: 'Método eliminado' }))
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' }));
  };

  const toggleMethodStatus = async (method: any) => {
    const methodRef = doc(db, collectionPath, method.id);
    try {
      await setDoc(methodRef, { isActive: !method.isActive }, { merge: true });
      toast({ title: `Método ${!method.isActive ? 'activado' : 'desactivado'}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar estado' });
    }
  };

  const colorStyles = {
    emerald: { bg: 'bg-success/10', border: 'border-success/15', iconBg: 'bg-success', iconShadow: 'shadow-success/20', textHeading: 'text-success', textMuted: 'text-success' },
    indigo: { bg: 'bg-primary/10', border: 'border-primary/15', iconBg: 'bg-primary', iconShadow: 'shadow-primary/20', textHeading: 'text-foreground', textMuted: 'text-primary' },
    amber: { bg: 'bg-warn/10', border: 'border-warn/15', iconBg: 'bg-warn', iconShadow: 'shadow-warn/20', textHeading: 'text-warn', textMuted: 'text-warn' },
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            {title}
          </h1>
          <p className="text-muted-foreground text-lg font-medium">{description}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-14 px-8 rounded-2xl font-bold bg-foreground text-white flex items-center gap-2 hover:scale-105 transition-all">
          <Plus className="h-5 w-5" /> Añadir Método
        </Button>
      </header>

      {/* Guía rápida */}
      <div className="grid md:grid-cols-3 gap-6">
        {infoCards.map((card, idx) => {
          const style = colorStyles[card.color];
          return (
            <div key={idx} className={cn(style.bg, style.border, "border p-6 rounded-3xl flex items-start gap-4")}>
              <div className={cn(style.iconBg, style.iconShadow, "w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-lg")}>
                {card.icon}
              </div>
              <div>
                <p className={cn(style.textHeading, "font-black text-sm")}>{card.title}</p>
                <p className={cn(style.textMuted, "text-xs font-medium")}>{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="rounded-lg overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-muted/80">
              <TableRow className="border-none">
                <TableHead className="py-6 px-10 text-muted-foreground uppercase tracking-widest text-[10px] font-black">Plataforma / Nombre</TableHead>
                <TableHead className="py-6 text-muted-foreground uppercase tracking-widest text-[10px] font-black">Estado</TableHead>
                <TableHead className="py-6 text-muted-foreground uppercase tracking-widest text-[10px] font-black">Detalles</TableHead>
                <TableHead className="py-6 px-10 text-muted-foreground uppercase tracking-widest text-[10px] font-black text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methodsLoading ? (
                <TableRow><TableCell colSpan={4} className="py-24 text-center">
                  <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
                  <p className="font-black text-muted-foreground uppercase tracking-widest text-xs">Sincronizando pasarelas...</p>
                </TableCell></TableRow>
              ) : methods?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-24 text-center">
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-border">
                      <CreditCard className="h-10 w-10" />
                    </div>
                    <div>
                      <p className="font-black text-foreground">No hay métodos configurados</p>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">Configura al menos un método de cobro.</p>
                    </div>
                    <Button onClick={() => handleOpenDialog()} variant="outline" className="rounded-xl font-bold border-2">Añadir el primero</Button>
                  </div>
                </TableCell></TableRow>
              ) : methods?.map((method) => (
                <TableRow key={method.id} className="hover:bg-muted/50 transition-colors border-b border-muted">
                  <TableCell className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                        method.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {method.type === 'mercadopago' ? <Wallet className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
                      </div>
                      <div>
                        <p className="font-black text-lg text-foreground">{method.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px] uppercase font-black text-muted-foreground border-border">
                            {method.type === 'mercadopago' ? 'Mercado Pago' : method.type === 'getnet' ? 'Getnet' : method.type === 'stripe' ? 'Stripe' : 'Transferencia'}
                          </Badge>
                          {method.capabilities?.directPayment && (
                            <Badge variant="outline" className="text-[9px] uppercase font-black text-primary border-primary/20 bg-primary/5">
                              Único
                            </Badge>
                          )}
                          {method.capabilities?.subscription && (
                            <Badge variant="outline" className="text-[9px] uppercase font-black text-success border-success/20 bg-success/5">
                              Suscripción
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={method.isActive} 
                        onCheckedChange={() => toggleMethodStatus(method)}
                      />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        method.isActive ? "text-success" : "text-muted-foreground"
                      )}>
                        {method.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground font-bold">
                    {method.type === 'mercadopago' ? (
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> {method.config?.publicKey?.substring(0, 15)}...</span>
                      </div>
                    ) : (
                      <span>{method.config?.alias || method.config?.cbu || 'Sin datos'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-10 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(method)} className="h-12 w-12 rounded-2xl hover:bg-muted text-muted-foreground">
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMethod(method.id)} className="h-12 w-12 rounded-2xl hover:bg-danger/10 text-danger">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
           </Table>
          </div>
         </CardContent>
      </Card>

      {/* Dialog: ABM */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="mw-2xl">
          <div className="relative overflow-hidden px-8 pt-8">
             <div className="relative z-10 space-y-2">
               <DialogHeader>
                 <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 backdrop-blur-sm border border-primary/10">
                   <Settings2 className="h-8 w-8" />
                 </div>
                 <DialogTitle className="text-3xl font-black">{editingMethod ? 'Editar Configuración' : 'Nueva Pasarela'}</DialogTitle>
                 <DialogDescription className="text-muted-foreground font-medium">
                   Configura los parámetros globales para el cobro.
                 </DialogDescription>
               </DialogHeader>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSaveMethod(); }} className="p-10 space-y-8 bg-white max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Descriptivo</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Mercado Pago Personal" 
                  className="bg-muted border-none px-6 font-bold text-foreground"
                 size="xl" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pasarela / Plataforma</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => setFormData({...formData, type: val})}
                >
                  <SelectTrigger size="xl" className="bg-muted border-none px-6 font-bold text-foreground">
                    <SelectValue placeholder="Seleccionar plataforma" />
                  </SelectTrigger>
                  <SelectContent className="border-none">
                    <SelectItem value="mercadopago" className="font-bold py-3">Mercado Pago</SelectItem>
                    <SelectItem value="getnet" className="font-bold py-3">Getnet (Santander)</SelectItem>
                    <SelectItem value="transfer" className="font-bold py-3">Transferencia Bancaria</SelectItem>
                    <SelectItem value="stripe" className="font-bold py-3">Stripe (Global)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'mercadopago' ? (
              <div className="p-8 bg-primary/10/50 rounded-lg border border-primary/15 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-foreground">Credenciales Mercado Pago</span>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Public Key</Label>
                  <Input 
                    value={formData.config.publicKey} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, publicKey: e.target.value }})} 
                    placeholder="APP_USR-..." 
                    className="bg-white border-none px-6 font-mono text-xs shadow-sm"
                   size="xl" />
                </div>

                <div className="space-y-3 relative">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Access Token (Privado)</Label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? "text" : "password"}
                      value={formData.config.accessToken} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, accessToken: e.target.value }})} 
                      placeholder="APP_USR-..." 
                      className="bg-white border-none px-6 font-mono text-xs pr-14 shadow-sm"
                     size="xl" />
                    <button 
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-primary/15">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[10px] text-foreground leading-relaxed font-medium">
                    Consigue estas credenciales en el <a href="https://www.mercadopago.com.ar/developers/panel/credentials" target="_blank" className="font-bold underline">Panel de Desarrolladores</a> de Mercado Pago.
                  </p>
                </div>
              </div>
            ) : formData.type === 'getnet' ? (
              <div className="p-8 bg-danger/10/50 rounded-lg border border-danger/15 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-danger" />
                  <span className="text-xs font-black uppercase tracking-widest text-danger">Credenciales Getnet (API Global)</span>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Seller ID</Label>
                  <Input 
                    value={formData.config.sellerId} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, sellerId: e.target.value }})} 
                    placeholder="Tu Seller ID asignado por Getnet" 
                    className="bg-white border-none px-6 font-mono text-xs shadow-sm"
                   size="xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Client ID</Label>
                    <Input 
                      value={formData.config.clientId} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, clientId: e.target.value }})} 
                      placeholder="Identificador de cliente" 
                      className="bg-white border-none px-6 font-mono text-xs shadow-sm"
                     size="xl" />
                  </div>

                  <div className="space-y-3 relative">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Client Secret</Label>
                    <div className="relative">
                      <Input 
                        type={showSecret ? "text" : "password"}
                        value={formData.config.clientSecret} 
                        onChange={e => setFormData({...formData, config: { ...formData.config, clientSecret: e.target.value }})} 
                        placeholder="Secreto de integración" 
                        className="bg-white border-none px-6 font-mono text-xs pr-14 shadow-sm"
                       size="xl" />
                      <button 
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-danger transition-colors"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-danger/15">
                  <Info className="h-4 w-4 text-danger shrink-0" />
                  <p className="text-[10px] text-danger leading-relaxed font-medium">
                    Encuentra estas credenciales en el <a href="https://developers.globalgetnet.com/" target="_blank" className="font-bold underline">Developer Portal</a> de Getnet.
                  </p>
                </div>
              </div>
            ) : formData.type === 'stripe' ? (
              <div className="p-8 bg-indigo-500/10 rounded-lg border border-indigo-500/15 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-500">Credenciales Stripe (Global)</span>
                </div>
                
                <div className="space-y-3 relative">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Secret Key (sk_live_... o sk_test_...)</Label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? "text" : "password"}
                      value={formData.config.secretKey} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, secretKey: e.target.value }})} 
                      placeholder="sk_live_..." 
                      className="bg-white border-none px-6 font-mono text-xs pr-14 shadow-sm"
                     size="xl" />
                    <button 
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-indigo-500 transition-colors"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 relative">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">Webhook Secret (whsec_...) (Opcional)</Label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? "text" : "password"}
                      value={formData.config.webhookSecret} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, webhookSecret: e.target.value }})} 
                      placeholder="whsec_..." 
                      className="bg-white border-none px-6 font-mono text-xs pr-14 shadow-sm"
                     size="xl" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium ml-1">Requerido para validar eventos en modo Producción de forma segura.</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Divisa de Cobro (ISO 3 Letras)</Label>
                  <Select 
                    value={formData.config.currency || 'usd'} 
                    onValueChange={(val) => setFormData({...formData, config: { ...formData.config, currency: val }})}
                  >
                    <SelectTrigger className="bg-white border-none px-6 font-bold text-foreground shadow-sm h-12">
                      <SelectValue placeholder="usd" />
                    </SelectTrigger>
                    <SelectContent className="border-none">
                      <SelectItem value="usd" className="font-bold py-3">Dólares (USD)</SelectItem>
                      <SelectItem value="eur" className="font-bold py-3">Euros (EUR)</SelectItem>
                      <SelectItem value="mxn" className="font-bold py-3">Pesos Mexicanos (MXN)</SelectItem>
                      <SelectItem value="ars" className="font-bold py-3">Pesos Argentinos (ARS)</SelectItem>
                      <SelectItem value="cop" className="font-bold py-3">Pesos Colombianos (COP)</SelectItem>
                      <SelectItem value="clp" className="font-bold py-3">Pesos Chilenos (CLP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-indigo-500/15">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                  <p className="text-[10px] text-indigo-500 leading-relaxed font-medium">
                    Consigue tu API Key en el <a href="https://dashboard.stripe.com/apikeys" target="_blank" className="font-bold underline">Dashboard de Stripe</a>. Recuerda configurar el Webhook hacia <code className="bg-white px-1 py-0.5 rounded">/api/webhooks/stripe</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-success/10/50 rounded-lg border border-success/15 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  <span className="text-xs font-black uppercase tracking-widest text-success">Datos Bancarios</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Titular de la Cuenta</Label>
                    <Input 
                      value={formData.config.titularName} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, titularName: e.target.value }})} 
                      placeholder="Nombre Completo" 
                      className="bg-white border-none px-6 font-bold shadow-sm"
                     size="xl" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Banco / Entidad</Label>
                    <Input 
                      value={formData.config.bankName} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, bankName: e.target.value }})} 
                      placeholder="Ej: Banco Galicia o Brubank" 
                      className="bg-white border-none px-6 font-bold shadow-sm"
                     size="xl" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">CBU / CVU</Label>
                  <Input 
                    value={formData.config.cbu} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, cbu: e.target.value }})} 
                    placeholder="0000000000000000000000" 
                    className="bg-white border-none px-6 font-mono text-sm shadow-sm"
                   size="xl" />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Alias de la Cuenta</Label>
                  <Input 
                    value={formData.config.alias} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, alias: e.target.value }})} 
                    placeholder="MI.ALIAS.PAGO" 
                    className="bg-white border-none px-6 font-bold shadow-sm"
                   size="xl" />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-foreground">Capacidades Soportadas</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-muted">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Cobro Directo (Único)</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Permitir cobros de una sola vez.</p>
                  </div>
                  <Switch 
                    checked={formData.capabilities.directPayment}
                    onCheckedChange={(val) => setFormData({...formData, capabilities: { ...formData.capabilities, directPayment: val }})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-muted">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Suscripciones Automáticas</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Permitir cobros recurrentes delegados.</p>
                  </div>
                  <Switch 
                    checked={formData.capabilities.subscription}
                    onCheckedChange={(val) => setFormData({...formData, capabilities: { ...formData.capabilities, subscription: val }})}
                    disabled={formData.type === 'transfer'}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-muted rounded-3xl border border-muted">
              <div className="space-y-1">
                <Label className="text-sm font-black text-foreground">Estado del Método</Label>
                <p className="text-[10px] text-muted-foreground font-medium tracking-tight">Los métodos inactivos no se utilizarán.</p>
              </div>
              <Switch 
                checked={formData.isActive}
                onCheckedChange={(val) => setFormData({...formData, isActive: val})}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || !formData.name} 
              className="w-full h-16 rounded-[1.5rem] text-xl font-black bg-foreground text-white hover:scale-[1.02] transition-all"
            >
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6 mr-3" />} 
              {editingMethod ? 'Actualizar Pasarela' : 'Guardar Método'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
