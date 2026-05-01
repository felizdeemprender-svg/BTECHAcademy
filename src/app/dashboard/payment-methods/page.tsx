'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, getDoc, updateDoc, deleteField } from 'firebase/firestore';
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
  Zap, 
  ShieldCheck, 
  Wallet,
  Settings2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  ChevronRight,
  Sparkles,
  Globe
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

export default function TutorPaymentMethodsPage() {
  const db = useFirestore();
  const { profile, user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  const methodsQuery = useMemoFirebase(() => {
    if (!user?.uid || isAuthLoading) return null;
    return query(collection(db, 'users', user.uid, 'paymentMethods'), orderBy('createdAt', 'desc'));
  }, [db, user?.uid, isAuthLoading]);
  
  const { data: methods, isLoading: methodsLoading } = useCollection(methodsQuery);

  const [formData, setFormData] = useState({
    name: '',
    type: 'mercadopago',
    isActive: true,
    config: {
      publicKey: '',
      accessToken: '',
      alias: '',
      cbu: '',
      bankName: '',
      titularName: ''
    }
  });

  // Migración automática de datos antiguos del perfil
  useEffect(() => {
    const migrateOldData = async () => {
      if (!user?.uid || methodsLoading || (methods && methods.length > 0) || isMigrating) return;
      
      const oldMP = profile?.profile?.mercadopago;
      if (oldMP?.accessToken || oldMP?.publicKey) {
        setIsMigrating(true);
        try {
          const methodId = `pm_mp_legacy`;
          const methodRef = doc(db, 'users', user.uid, 'paymentMethods', methodId);
          await setDoc(methodRef, {
            id: methodId,
            name: 'Mercado Pago (Migrado)',
            type: 'mercadopago',
            isActive: true,
            config: {
              publicKey: oldMP.publicKey || '',
              accessToken: oldMP.accessToken || '',
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isMigrated: true
          });
          toast({ title: 'Datos migrados', description: 'Tus credenciales de Mercado Pago se han movido a este nuevo sistema.' });
        } catch (e) {
          console.error("Error migrando datos:", e);
        } finally {
          setIsMigrating(false);
        }
      }
    };

    migrateOldData();
  }, [user?.uid, methods, methodsLoading, profile, db, toast]);

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
        config: { publicKey: '', accessToken: '', alias: '', cbu: '', bankName: '', titularName: '' } 
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

    setLoading(true);
    const methodId = editingMethod?.id || `pm_${Math.random().toString(36).substring(2, 9)}`;
    const methodRef = doc(db, 'users', user!.uid, 'paymentMethods', methodId);
    
    const methodData = {
      ...formData,
      id: methodId,
      updatedAt: serverTimestamp(),
      createdAt: editingMethod?.createdAt || serverTimestamp()
    };

    try {
      // Si este método se activa, desactivamos los demás del mismo tipo (opcional, pero recomendado por ahora)
      // O simplemente permitimos varios. Por ahora permitimos varios.
      await setDoc(methodRef, methodData, { merge: true });
      toast({ title: editingMethod ? 'Método actualizado' : 'Método de cobro creado' });
      setIsDialogOpen(false);
    } catch (e) {
      console.error("[TutorPaymentMethods] Error al guardar:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este método de cobro?')) return;
    
    deleteDoc(doc(db, 'users', user!.uid, 'paymentMethods', id))
      .then(() => toast({ title: 'Método eliminado' }))
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' }));
  };

  const toggleMethodStatus = async (method: any) => {
    const methodRef = doc(db, 'users', user!.uid, 'paymentMethods', method.id);
    try {
      await setDoc(methodRef, { isActive: !method.isActive }, { merge: true });
      toast({ title: `Método ${!method.isActive ? 'activado' : 'desactivado'}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar estado' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Wallet className="h-10 w-10 text-indigo-600" /> Métodos de Cobro
            </h1>
            <p className="text-slate-500 text-lg font-medium">Configura cómo deseas recibir los pagos de tus alumnos.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-14 px-8 rounded-2xl font-bold bg-slate-900 text-white shadow-xl flex items-center gap-2 hover:scale-105 transition-all">
            <Plus className="h-5 w-5" /> Añadir Método
          </Button>
        </header>

        {/* Guía rápida */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-emerald-900 text-sm">Cobro Directo</p>
              <p className="text-xs text-emerald-700 font-medium">El dinero va directo a tu cuenta sin intermediarios ni comisiones de BTECH.</p>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-indigo-900 text-sm">Página de Ventas</p>
              <p className="text-xs text-indigo-700 font-medium">Los métodos activos aparecerán automáticamente en tu checkout público.</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-amber-900 text-sm">Seguridad Total</p>
              <p className="text-xs text-amber-700 font-medium">Tus credenciales se almacenan de forma segura y encriptada.</p>
            </div>
          </div>
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
                {methodsLoading || isMigrating ? (
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
                        <p className="font-black text-slate-900">No tienes métodos de cobro</p>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Configura al menos un método para que tus alumnos puedan inscribirse a tus cursos.</p>
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
      </div>

      {/* Dialog: ABM */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-0 max-w-2xl border-none shadow-3xl overflow-hidden">
          <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
             <div className="relative z-10 space-y-2">
               <DialogHeader>
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 backdrop-blur-sm border border-white/10">
                   <Settings2 className="h-8 w-8" />
                 </div>
                 <DialogTitle className="text-3xl font-black">{editingMethod ? 'Editar Configuración' : 'Nueva Pasarela de Cobro'}</DialogTitle>
                 <DialogDescription className="text-slate-400 font-medium">
                   Configura los parámetros necesarios para que tus alumnos puedan pagarte directamente.
                 </DialogDescription>
               </DialogHeader>
             </div>
             {/* Decoración */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-32 -mt-32 blur-3xl" />
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSaveMethod(); }} className="p-10 space-y-8 bg-white max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Descriptivo</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Mercado Pago Personal" 
                  className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold text-slate-800"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pasarela / Plataforma</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => setFormData({...formData, type: val})}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-6 font-bold text-slate-800">
                    <SelectValue placeholder="Seleccionar plataforma" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="mercadopago" className="font-bold py-3">Mercado Pago</SelectItem>
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
                    className="h-14 rounded-2xl bg-white border-none px-6 font-mono text-xs shadow-sm"
                  />
                </div>

                <div className="space-y-3 relative">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">Access Token (Privado)</Label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? "text" : "password"}
                      value={formData.config.accessToken} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, accessToken: e.target.value }})} 
                      placeholder="APP_USR-..." 
                      className="h-14 rounded-2xl bg-white border-none px-6 font-mono text-xs pr-14 shadow-sm"
                    />
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
                      className="h-14 rounded-2xl bg-white border-none px-6 font-bold shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Banco / Entidad</Label>
                    <Input 
                      value={formData.config.bankName} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, bankName: e.target.value }})} 
                      placeholder="Ej: Banco Galicia o Brubank" 
                      className="h-14 rounded-2xl bg-white border-none px-6 font-bold shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">CBU / CVU</Label>
                  <Input 
                    value={formData.config.cbu} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, cbu: e.target.value }})} 
                    placeholder="0000000000000000000000" 
                    className="h-14 rounded-2xl bg-white border-none px-6 font-mono text-sm shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Alias de la Cuenta</Label>
                  <Input 
                    value={formData.config.alias} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, alias: e.target.value }})} 
                    placeholder="MI.ALIAS.PAGO" 
                    className="h-14 rounded-2xl bg-white border-none px-6 font-bold shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="space-y-1">
                <Label className="text-sm font-black text-slate-800">Estado del Método</Label>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Los métodos inactivos no aparecerán en tus páginas de venta.</p>
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
              {editingMethod ? 'Actualizar Pasarela' : 'Guardar Método de Cobro'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
