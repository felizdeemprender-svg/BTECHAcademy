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
import { Plus, Trash2, Pencil, Save, Loader2, CreditCard, Layers, Clock, ShieldCheck, Ban, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AbonosPage() {
  const db = useFirestore();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const plansQuery = useMemoFirebase(() => {
    if (!profile?.roles.includes('admin') || isAuthLoading) return null;
    return query(collection(db, 'subscription-plans'), orderBy('createdAt', 'desc'));
  }, [db, profile, isAuthLoading]);
  const { data: plans, isLoading: plansLoading } = useCollection(plansQuery);

  const [formData, setFormData] = useState({
    name: '',
    durationMonths: 12,
    maxSimultaneousCourses: 5,
    isActive: true
  });

  const handleOpenDialog = (plan: any = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        durationMonths: plan.durationMonths,
        maxSimultaneousCourses: plan.maxSimultaneousCourses,
        isActive: plan.isActive !== false
      });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', durationMonths: 12, maxSimultaneousCourses: 5, isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!formData.name) return;
    setLoading(true);

    const planId = editingPlan?.id || Math.random().toString(36).substring(2, 15);
    const planRef = doc(db, 'subscription-plans', planId);
    
    const planData = {
      ...formData,
      id: planId,
      updatedAt: serverTimestamp(),
      createdAt: editingPlan?.createdAt || serverTimestamp()
    };

    setDoc(planRef, planData, { merge: true })
      .then(() => {
        toast({ title: editingPlan ? 'Plan actualizado' : 'Plan creado exitosamente' });
        setIsDialogOpen(false);
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: planRef.path,
          operation: editingPlan ? 'update' : 'create',
          requestResourceData: planData
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleDeletePlan = (id: string) => {
    const planRef = doc(db, 'subscription-plans', id);
    deleteDoc(planRef)
      .then(() => toast({ title: 'Plan eliminado' }))
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: planRef.path,
          operation: 'delete'
        }));
      });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Gestión de Abonos</h1>
            <p className="text-muted-foreground text-lg font-medium">Control institucional de planes y capacidades para mentores.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-12 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2">
            <Plus className="h-5 w-5" /> Nuevo Abono
          </Button>
        </header>

        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-white/50 backdrop-blur-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Tipo de Abono</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Duración (Meses)</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Cursos Simultáneos</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Estado</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plansLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center text-muted-foreground animate-pulse font-bold text-lg">Sincronizando planes maestros...</TableCell></TableRow>
                ) : plans?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center italic text-muted-foreground">No se han definido abonos institucionales.</TableCell></TableRow>
                ) : plans?.map((plan) => (
                  <TableRow key={plan.id} className="hover:bg-primary/5 transition-colors border-b border-border/30">
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-lg text-foreground">{plan.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 opacity-40" />
                        {plan.durationMonths} Meses
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">
                      <div className="flex items-center justify-center gap-2">
                        <Layers className="h-4 w-4 opacity-40" />
                        Hasta {plan.maxSimultaneousCourses}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "px-3 py-1 border-none",
                        plan.isActive !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {plan.isActive !== false ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                        {plan.isActive !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plan)} className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-destructive">
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-2xl p-10 max-w-md border-none shadow-3xl">
            <DialogHeader className="mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-bold">{editingPlan ? 'Editar Parámetros' : 'Nuevo Plan Maestro'}</DialogTitle>
              <DialogDescription>Define las reglas operativas para los mentores.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSavePlan(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="plan-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Tipo de Abono</Label>
                <Input 
                  id="plan-name"
                  name="name"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Plan Institucional Gold" 
                  className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="plan-duration" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Meses Duración</Label>
                  <Input 
                    id="plan-duration"
                    name="durationMonths"
                    type="number" 
                    value={formData.durationMonths} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, durationMonths: isNaN(val) ? 0 : val});
                    }} 
                    className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-capacity" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cursos Simultáneos</Label>
                  <Input 
                    id="plan-capacity"
                    name="maxSimultaneousCourses"
                    type="number" 
                    value={formData.maxSimultaneousCourses} 
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, maxSimultaneousCourses: isNaN(val) ? 0 : val});
                    }} 
                    className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <Label htmlFor="plan-active" className="font-bold text-sm cursor-pointer">Habilitar Plan</Label>
                </div>
                <input 
                  id="plan-active"
                  name="isActive"
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="h-5 w-5 accent-primary cursor-pointer"
                />
              </div>
              <DialogFooter className="mt-8">
                <Button type="submit" disabled={loading || !formData.name} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                  {editingPlan ? 'Actualizar Abono' : 'Publicar Plan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
