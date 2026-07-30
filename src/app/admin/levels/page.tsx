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
import { Plus, Trash2, Pencil, Save, Loader2, Target, Trophy, Sparkles, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminLevelsPage() {
  const db = useFirestore();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);

  const levelsQuery = useMemoFirebase(() => {
    if (!profile?.roles?.includes('admin') || isAuthLoading) return null;
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db, profile, isAuthLoading]);
  const { data: levels, isLoading: levelsLoading } = useCollection(levelsQuery);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: 0
  });

  const handleOpenDialog = (level: any = null) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        name: level.name,
        description: level.description || '',
        order: level.order || 0
      });
    } else {
      setEditingLevel(null);
      setFormData({ name: '', description: '', order: levels?.length || 0 });
    }
    setIsDialogOpen(true);
  };

  const handleSaveLevel = async () => {
    if (!formData.name) return;
    setLoading(true);

    const levelId = editingLevel?.id || Math.random().toString(36).substring(2, 15);
    const levelRef = doc(db, 'levels', levelId);
    
    const levelData = {
      ...formData,
      id: levelId,
      updatedAt: serverTimestamp(),
      createdAt: editingLevel?.createdAt || serverTimestamp()
    };

    setDoc(levelRef, levelData, { merge: true })
      .then(() => {
        toast({ title: editingLevel ? 'Nivel actualizado' : 'Nivel creado exitosamente' });
        setIsDialogOpen(false);
      })
      .catch(async (e: any) => {
        console.error("[AdminLevels] Error DETALLADO:", e.message || e);
        console.log("[AdminLevels] Tus roles actuales:", profile?.roles);
        toast({
          variant: 'destructive',
          title: 'Error al Guardar',
          description: `Detalle: ${e.message || 'Error de permisos o red'}`
        });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: levelRef.path,
          operation: editingLevel ? 'update' : 'create',
          requestResourceData: levelData
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleDeleteLevel = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este nivel?')) return;
    
    const levelRef = doc(db, 'levels', id);
    deleteDoc(levelRef)
      .then(() => toast({ title: 'Nivel eliminado' }))
      .catch(async (e) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo eliminar el nivel.'
        });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: levelRef.path,
          operation: 'delete'
        }));
      });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Niveles Académicos</h1>
            <p className="text-muted-foreground text-lg font-medium">Define la complejidad y el progreso de los programas (Ej: Básico, Avanzado).</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleOpenDialog()} className="h-12 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nuevo Nivel
            </Button>
          </div>
        </header>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold w-20">Orden</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Nivel</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Descripción</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levelsLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center text-muted-foreground animate-pulse font-bold text-lg">Sincronizando niveles...</TableCell></TableRow>
                ) : levels?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center italic text-muted-foreground">No hay niveles definidos.</TableCell></TableRow>
                ) : levels?.map((level) => (
                  <TableRow key={level.id} className="hover:bg-primary/5 transition-colors border-b border-border/30">
                    <TableCell className="px-10 py-6 font-mono text-xs font-bold text-primary/40">
                      {level.order}
                    </TableCell>
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Target className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-lg text-foreground">{level.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {level.description || '-'}
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(level)} className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLevel(level.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-destructive">
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

        {/* Dialog: Manual Add/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="mw-md">
            <DialogHeader className="mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <Trophy className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-bold">{editingLevel ? 'Editar Nivel' : 'Nuevo Nivel Académico'}</DialogTitle>
              <DialogDescription>Define un grado de complejidad para los cursos.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveLevel(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="level-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre del Nivel</Label>
                <Input 
                  id="level-name"
                  name="name"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Principiante" 
                  className="bg-secondary/10 border-none px-4 font-bold"
                 size="lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level-order" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Orden de Visualización</Label>
                <Input 
                  id="level-order"
                  name="order"
                  type="number"
                  value={formData.order} 
                  onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} 
                  className="bg-secondary/10 border-none px-4 font-bold"
                 size="lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level-description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Descripción</Label>
                <Input 
                  id="level-description"
                  name="description"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Descripción breve..." 
                  className="bg-secondary/10 border-none px-4 font-bold"
                 size="lg" />
              </div>
              <DialogFooter className="mt-8">
                <Button type="submit" disabled={loading || !formData.name} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                  {editingLevel ? 'Actualizar Nivel' : 'Crear Nivel'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
