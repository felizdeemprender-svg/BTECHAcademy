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
    config: {
      publicKey: '',
      accessToken: '',
      clientId: '',
      clientSecret: '',
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
        config: {
          publicKey: method.config?.publicKey || '',
          accessToken: method.config?.accessToken || '',
          clientId: method.config?.clientId || '',
          clientSecret: method.config?.clientSecret || '',
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
        config: { publicKey: '', accessToken: '', clientId: '', clientSecret: '', sellerId: '', alias: '', cbu: '', bankName: '', titularName: '' } 
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
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-500', iconShadow: 'shadow-emerald-500/20', textHeading: 'text-emerald-900', textMuted: 'text-emerald-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-600', iconShadow: 'shadow-indigo-600/20', textHeading: 'text-indigo-900', textMuted: 'text-indigo-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', iconShadow: 'shadow-amber-500/20', textHeading: 'text-amber-900', textMuted: 'text-amber-700' },
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            {title}
          </h1>
          <p className="text-slate-500 text-lg font-medium">{description}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-14 px-8 rounded-2xl font-bold bg-slate-900 text-white shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
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

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-none">
                <TableHead className="py-6 px-10 text-slate-400 uppercase tracking-widest text-[10px] font-black">Plataforma / Nombre</TableHead>
                <TableHead className="py-6 text-slate-400 uppercase tracking-widest text-[10px] font-black">Estado</TableHead>
                <TableHead className="py-6 text-slate-400 uppercase tracking-widest text-[10px] font-black">Detalles</TableHead>
                <TableHead className="py-6 px-10 text-slate-400 uppercase tracking-widest text-[10px] font-black text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methodsLoading ? (
                <TableRow><TableCell colSpan={4} className="py-24 text-center">
                  <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" />
                  <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Sincronizando pasarelas...</p>
                </TableCell></TableRow>
              ) : methods?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-24 text-center">
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <CreditCard className="h-10 w-10" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">No hay métodos configurados</p>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">Configura al menos un método de cobro.</p>
                    </div>
                    <Button onClick={() => handleOpenDialog()} variant="outline" className="rounded-xl font-bold border-2">Añadir el primero</Button>
                  </div>
                </TableCell></TableRow>
              ) : methods?.map((method) => (
                <TableRow key={method.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                        method.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {method.type === 'mercadopago' ? <Wallet className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-900">{method.name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase font-black text-slate-400 mt-1 border-slate-200">
                          {method.type === 'mercadopago' ? 'Mercado Pago' : 'Transferencia'}
                        </Badge>
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
                        method.isActive ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {method.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-slate-400 font-bold">
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
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(method)} className="h-12 w-12 rounded-2xl hover:bg-slate-100 text-slate-600">
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMethod(method.id)} className="h-12 w-12 rounded-2xl hover:bg-rose-50 text-rose-500">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Descriptivo</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Mercado Pago Personal" 
                  className="bg-slate-50 border-none px-6 font-bold text-slate-800"
                 size="xl" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pasarela / Plataforma</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => setFormData({...formData, type: val})}
                >
                  <SelectTrigger size="xl" className="bg-slate-50 border-none px-6 font-bold text-slate-800">
                    <SelectValue placeholder="Seleccionar plataforma" />
                  </SelectTrigger>
                  <SelectContent className="border-none shadow-2xl">
                    <SelectItem value="mercadopago" className="font-bold py-3">Mercado Pago</SelectItem>
                    <SelectItem value="getnet" className="font-bold py-3">Getnet (Santander)</SelectItem>
                    <SelectItem value="transfer" className="font-bold py-3">Transferencia Bancaria</SelectItem>
                    <SelectItem value="stripe" disabled className="py-3 opacity-50">Stripe (Dólares - Próximamente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'mercadopago' ? (
              <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-900">Credenciales Mercado Pago</span>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">Public Key</Label>
                  <Input 
                    value={formData.config.publicKey} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, publicKey: e.target.value }})} 
                    placeholder="APP_USR-..." 
                    className="bg-white border-none px-6 font-mono text-xs shadow-sm"
                   size="xl" />
                </div>

                <div className="space-y-3 relative">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">Access Token (Privado)</Label>
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
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-indigo-100">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                  <p className="text-[10px] text-indigo-800 leading-relaxed font-medium">
                    Consigue estas credenciales en el <a href="https://www.mercadopago.com.ar/developers/panel/credentials" target="_blank" className="font-bold underline">Panel de Desarrolladores</a> de Mercado Pago.
                  </p>
                </div>
              </div>
            ) : formData.type === 'getnet' ? (
              <div className="p-8 bg-rose-50/50 rounded-[2.5rem] border border-rose-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-rose-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-rose-900">Credenciales Getnet (API Global)</span>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">Seller ID</Label>
                  <Input 
                    value={formData.config.sellerId} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, sellerId: e.target.value }})} 
                    placeholder="Tu Seller ID asignado por Getnet" 
                    className="bg-white border-none px-6 font-mono text-xs shadow-sm"
                   size="xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">Client ID</Label>
                    <Input 
                      value={formData.config.clientId} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, clientId: e.target.value }})} 
                      placeholder="Identificador de cliente" 
                      className="bg-white border-none px-6 font-mono text-xs shadow-sm"
                     size="xl" />
                  </div>

                  <div className="space-y-3 relative">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">Client Secret</Label>
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
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-rose-100">
                  <Info className="h-4 w-4 text-rose-600 shrink-0" />
                  <p className="text-[10px] text-rose-800 leading-relaxed font-medium">
                    Encuentra estas credenciales en el <a href="https://developers.globalgetnet.com/" target="_blank" className="font-bold underline">Developer Portal</a> de Getnet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-900">Datos Bancarios</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular de la Cuenta</Label>
                    <Input 
                      value={formData.config.titularName} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, titularName: e.target.value }})} 
                      placeholder="Nombre Completo" 
                      className="bg-white border-none px-6 font-bold shadow-sm"
                     size="xl" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Banco / Entidad</Label>
                    <Input 
                      value={formData.config.bankName} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, bankName: e.target.value }})} 
                      placeholder="Ej: Banco Galicia o Brubank" 
                      className="bg-white border-none px-6 font-bold shadow-sm"
                     size="xl" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">CBU / CVU</Label>
                  <Input 
                    value={formData.config.cbu} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, cbu: e.target.value }})} 
                    placeholder="0000000000000000000000" 
                    className="bg-white border-none px-6 font-mono text-sm shadow-sm"
                   size="xl" />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Alias de la Cuenta</Label>
                  <Input 
                    value={formData.config.alias} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, alias: e.target.value }})} 
                    placeholder="MI.ALIAS.PAGO" 
                    className="bg-white border-none px-6 font-bold shadow-sm"
                   size="xl" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="space-y-1">
                <Label className="text-sm font-black text-slate-800">Estado del Método</Label>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Los métodos inactivos no se utilizarán.</p>
              </div>
              <Switch 
                checked={formData.isActive}
                onCheckedChange={(val) => setFormData({...formData, isActive: val})}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || !formData.name} 
              className="w-full h-16 rounded-[1.5rem] text-xl font-black bg-slate-900 text-white shadow-2xl hover:scale-[1.02] transition-all"
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
