'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Save, 
  Loader2, 
  CreditCard, 
  Zap, 
  ShieldCheck, 
  Settings2,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff
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

export default function AdminPaymentMethodsPage() {
  const db = useFirestore();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  const methodsQuery = useMemoFirebase(() => {
    if (!profile?.roles?.includes('admin') || isAuthLoading) return null;
    return query(collection(db, 'systemPaymentMethods'), orderBy('createdAt', 'desc'));
  }, [db, profile, isAuthLoading]);
  const { data: methods, isLoading: methodsLoading } = useCollection(methodsQuery);

  const [formData, setFormData] = useState({
    name: '',
    type: 'mercadopago',
    isActive: true,
    config: {
      publicKey: '',
      accessToken: '',
      clientId: '',
      clientSecret: ''
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
          clientSecret: method.config?.clientSecret || ''
        }
      });
    } else {
      setEditingMethod(null);
      setFormData({ 
        name: '', 
        type: 'mercadopago', 
        isActive: true,
        config: { publicKey: '', accessToken: '', clientId: '', clientSecret: '' } 
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveMethod = async () => {
    if (!formData.name || !formData.config.publicKey) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'Nombre y Public Key son obligatorios.' });
      return;
    }
    setLoading(true);

    const methodId = editingMethod?.id || `pm_${Math.random().toString(36).substring(2, 9)}`;
    const methodRef = doc(db, 'systemPaymentMethods', methodId);
    
    const methodData = {
      ...formData,
      id: methodId,
      updatedAt: serverTimestamp(),
      createdAt: editingMethod?.createdAt || serverTimestamp()
    };

    try {
      await setDoc(methodRef, methodData, { merge: true });
      toast({ title: editingMethod ? 'Método actualizado' : 'Método de pago creado' });
      setIsDialogOpen(false);
    } catch (e) {
      console.error("[AdminPaymentMethods] Error al guardar:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el método de pago.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este método de pago?')) return;
    
    deleteDoc(doc(db, 'systemPaymentMethods', id))
      .then(() => toast({ title: 'Método de pago eliminado' }))
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' }));
  };

  const toggleMethodStatus = async (method: any) => {
    const methodRef = doc(db, 'systemPaymentMethods', method.id);
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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Métodos de Pago del Sistema</h1>
            <p className="text-muted-foreground text-lg font-medium">Configura las pasarelas para el cobro de planes de suscripción a los tutores.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-12 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2">
            <Plus className="h-5 w-5" /> Nuevo Método
          </Button>
        </header>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Plataforma / Nombre</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Estado</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Public Key (Preview)</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methodsLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center text-muted-foreground animate-pulse font-bold text-lg">Sincronizando métodos...</TableCell></TableRow>
                ) : methods?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center italic text-muted-foreground">No hay métodos de pago configurados.</TableCell></TableRow>
                ) : methods?.map((method) => (
                  <TableRow key={method.id} className="hover:bg-primary/5 transition-colors border-b border-border/30">
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground">{method.name}</p>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">{method.type}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={method.isActive} 
                          onCheckedChange={() => toggleMethodStatus(method)}
                        />
                        <span className={`text-xs font-bold uppercase tracking-wider ${method.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {method.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {method.config?.publicKey ? `${method.config.publicKey.substring(0, 12)}...` : '-'}
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(method)} className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMethod(method.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-destructive">
                          <Trash2 className="h-4 w-4" />
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
          <DialogContent className="rounded-2xl p-10 max-w-2xl border-none shadow-3xl overflow-y-auto max-h-[90vh]">
            <DialogHeader className="mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-bold">{editingMethod ? 'Configurar Método' : 'Nuevo Método de Pago'}</DialogTitle>
              <DialogDescription>Configura las credenciales de la pasarela para recibir pagos de los tutores.</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveMethod(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre Descriptivo</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej: Mercado Pago Principal" 
                    className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Plataforma</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(val) => setFormData({...formData, type: val})}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold">
                      <SelectValue placeholder="Seleccionar plataforma" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                      <SelectItem value="stripe" disabled>Stripe (Próximamente)</SelectItem>
                      <SelectItem value="paypal" disabled>PayPal (Próximamente)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Credenciales de API</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Public Key</Label>
                  <Input 
                    value={formData.config.publicKey} 
                    onChange={e => setFormData({...formData, config: { ...formData.config, publicKey: e.target.value }})} 
                    placeholder="APP_USR-..." 
                    className="h-12 rounded-xl bg-white border-none px-4 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2 relative">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Access Token</Label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? "text" : "password"}
                      value={formData.config.accessToken} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, accessToken: e.target.value }})} 
                      placeholder="PROD_ACCESS_TOKEN-..." 
                      className="h-12 rounded-xl bg-white border-none px-4 font-mono text-sm pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Client ID (Opcional)</Label>
                    <Input 
                      value={formData.config.clientId} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, clientId: e.target.value }})} 
                      className="h-12 rounded-xl bg-white border-none px-4 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Client Secret (Opcional)</Label>
                    <Input 
                      type="password"
                      value={formData.config.clientSecret} 
                      onChange={e => setFormData({...formData, config: { ...formData.config, clientSecret: e.target.value }})} 
                      className="h-12 rounded-xl bg-white border-none px-4 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Estado del Método</Label>
                  <p className="text-[10px] text-muted-foreground">Define si este método estará disponible para el cobro de planes.</p>
                </div>
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(val) => setFormData({...formData, isActive: val})}
                />
              </div>

              <DialogFooter className="mt-8">
                <Button type="submit" disabled={loading || !formData.name || !formData.config.publicKey} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                  {editingMethod ? 'Actualizar Configuración' : 'Guardar Método de Pago'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
