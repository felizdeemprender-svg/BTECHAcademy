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
import { Plus, Trash2, Pencil, Save, Loader2, Library, BookOpen, Sparkles, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminCategoriesPage() {
  const db = useFirestore();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const categoriesQuery = useMemoFirebase(() => {
    if (!profile?.roles.includes('admin') || isAuthLoading) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db, profile, isAuthLoading]);
  const { data: categories, isLoading: categoriesLoading } = useCollection(categoriesQuery);

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleOpenDialog = (category: any = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name) return;
    setLoading(true);

    const categoryId = editingCategory?.id || Math.random().toString(36).substring(2, 15);
    const categoryRef = doc(db, 'categories', categoryId);
    
    const categoryData = {
      ...formData,
      id: categoryId,
      updatedAt: serverTimestamp(),
      createdAt: editingCategory?.createdAt || serverTimestamp()
    };

    setDoc(categoryRef, categoryData, { merge: true })
      .then(() => {
        toast({ title: editingCategory ? 'Categoría actualizada' : 'Categoría creada exitosamente' });
        setIsDialogOpen(false);
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: categoryRef.path,
          operation: editingCategory ? 'update' : 'create',
          requestResourceData: categoryData
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleDeleteCategory = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    
    const categoryRef = doc(db, 'categories', id);
    deleteDoc(categoryRef)
      .then(() => toast({ title: 'Categoría eliminada' }))
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: categoryRef.path,
          operation: 'delete'
        }));
      });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Categorías Académicas</h1>
            <p className="text-muted-foreground text-lg font-medium">Define las áreas de conocimiento institucionales para la clasificación de los programas.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleOpenDialog()} className="h-12 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nueva Categoría
            </Button>
          </div>
        </header>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Nombre de Categoría</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Descripción Académica</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesLoading ? (
                  <TableRow><TableCell colSpan={3} className="py-20 text-center text-muted-foreground animate-pulse font-bold text-lg">Sincronizando categorías...</TableCell></TableRow>
                ) : categories?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-20 text-center italic text-muted-foreground">No hay categorías definidas.</TableCell></TableRow>
                ) : categories?.map((category) => (
                  <TableRow key={category.id} className="hover:bg-primary/5 transition-colors border-b border-border/30">
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Library className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-lg text-foreground">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)} className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-destructive">
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
          <DialogContent className="rounded-2xl p-10 max-w-md border-none shadow-3xl">
            <DialogHeader className="mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <BookOpen className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-bold">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría Académica'}</DialogTitle>
              <DialogDescription>Define una nueva rama del conocimiento para organizar tus programas.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre de la Categoría</Label>
                <Input 
                  id="category-name"
                  name="name"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Marketing Digital" 
                  className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Descripción</Label>
                <Input 
                  id="category-description"
                  name="description"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Descripción breve..." 
                  className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                />
              </div>
              <DialogFooter className="mt-8">
                <Button type="submit" disabled={loading || !formData.name} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                  {editingCategory ? 'Actualizar Categoría' : 'Crear Categoría'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
