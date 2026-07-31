'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Plus, Trash2, Pencil, Save, Loader2, Tags, Tag as TagIcon, Sparkles, BrainCircuit, Check, Search, X, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generateTagSuggestions } from '@/ai/flows/generate-tag-suggestions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function AdminTagsPage() {
  const db = useFirestore();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  
  const [editingTag, setEditingTag] = useState<any>(null);
  const [branchInput, setBranchInput] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const tagsQuery = useMemoFirebase(() => {
    if (!profile?.roles.includes('admin') || isAuthLoading) return null;
    return query(collection(db, 'tags'), orderBy('name', 'asc'));
  }, [db, profile, isAuthLoading]);
  const { data: tags, isLoading: tagsLoading } = useCollection(tagsQuery);

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleOpenDialog = (tag: any = null) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        description: tag.description || ''
      });
    } else {
      setEditingTag(null);
      setFormData({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!formData.name) return;
    setLoading(true);

    const tagId = editingTag?.id || Math.random().toString(36).substring(2, 15);
    const tagRef = doc(db, 'tags', tagId);
    
    const tagData = {
      ...formData,
      id: tagId,
      updatedAt: serverTimestamp(),
      createdAt: editingTag?.createdAt || serverTimestamp()
    };

    setDoc(tagRef, tagData, { merge: true })
      .then(() => {
        toast({ title: editingTag ? 'Etiqueta actualizada' : 'Etiqueta creada exitosamente' });
        setIsDialogOpen(false);
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: tagRef.path,
          operation: editingTag ? 'update' : 'create',
          requestResourceData: tagData
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleGenerateAI = async () => {
    if (!branchInput.trim()) return;
    setIsGenerating(true);
    setAiSuggestions([]);
    setSelectedSuggestions([]);

    try {
      const existingNames = tags?.map(t => t.name.toLowerCase()) || [];
      const result = await generateTagSuggestions({
        branch: branchInput,
        existingTags: existingNames
      });

      // Filtrar sugerencias que ya existen por nombre en el cliente (doble verificación)
      const uniqueSuggestions = result.suggestions.filter(s => 
        !existingNames.includes(s.name.toLowerCase())
      );

      setAiSuggestions(uniqueSuggestions);
      if (uniqueSuggestions.length === 0) {
        toast({ title: 'Sin novedades', description: 'La IA no encontró nuevas categorías SEO para esta rama.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de generación', description: 'No se pudo conectar con Gemini.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadAiSelected = async () => {
    if (selectedSuggestions.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let addedCount = 0;

      for (const name of selectedSuggestions) {
        const suggestion = aiSuggestions.find(s => s.name === name);
        if (suggestion) {
          const newId = Math.random().toString(36).substring(2, 15);
          const ref = doc(db, 'tags', newId);
          batch.set(ref, {
            ...suggestion,
            id: newId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          addedCount++;
        }
      }
      
      await batch.commit();
      toast({ title: 'Taxonomía SEO Actualizada', description: `Se han incorporado ${addedCount} etiquetas clave.` });
      setIsAiDialogOpen(false);
      setAiSuggestions([]);
      setBranchInput('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar etiquetas' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = (id: string) => {
    const tagRef = doc(db, 'tags', id);
    deleteDoc(tagRef)
      .then(() => toast({ title: 'Etiqueta eliminada' }))
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: tagRef.path,
          operation: 'delete'
        }));
      });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Etiquetas Académicas</h1>
            <p className="text-muted-foreground text-lg font-medium">Define las categorías institucionales para la clasificación de cursos y el posicionamiento SEO en Google.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAiDialogOpen(true)} 
              disabled={loading || isAuthLoading}
              className="h-12 px-6 rounded-xl font-bold border-2 border-dashed border-accent text-accent hover:bg-accent/5 gap-2"
            >
              <Sparkles className="h-4 w-4" /> Cargar Sugerencias SEO
            </Button>
            <Button onClick={() => handleOpenDialog()} className="h-12 px-8 rounded-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nueva Etiqueta
            </Button>
          </div>
        </header>

        <Card className="border-none rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Palabra Clave (SEO)</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Descripción Semántica</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagsLoading ? (
                  <TableRow><TableCell colSpan={3} className="py-20 text-center text-muted-foreground animate-pulse font-bold text-lg">Sincronizando taxonomías...</TableCell></TableRow>
                ) : tags?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-20 text-center italic text-muted-foreground">No hay etiquetas definidas. Usa "Cargar Sugerencias SEO" para que Gemini te proponga keywords.</TableCell></TableRow>
                ) : tags?.map((tag) => (
                  <TableRow key={tag.id} className="hover:bg-primary/5 transition-colors border-b border-border/30">
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <TagIcon className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-lg text-foreground">{tag.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {tag.description || '-'}
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tag)} className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-destructive">
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
                <Tags className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-bold">{editingTag ? 'Editar Etiqueta' : 'Nueva Keyword SEO'}</DialogTitle>
              <DialogDescription>Define términos clave para mejorar el posicionamiento orgánico en Google.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveTag(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tag-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre de la Keyword</Label>
                <Input 
                  id="tag-name"
                  name="name"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Inteligencia Artificial Aplicada" 
                  className="bg-secondary/10 border-none px-4 font-bold"
                 size="lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Descripción para Buscadores</Label>
                <Input 
                  id="tag-description"
                  name="description"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Incluye términos semánticos..." 
                  className="bg-secondary/10 border-none px-4 font-bold"
                 size="lg" />
              </div>
              <DialogFooter className="mt-8">
                <Button type="submit" disabled={loading || !formData.name} className="w-full h-14 rounded-2xl text-lg font-bold">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                  {editingTag ? 'Actualizar Keyword' : 'Crear Keyword'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: AI Suggestion */}
        <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
          <DialogContent className="mw-xl">
            <div className="px-8 pt-8 relative">
              <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">Generador SEO Inteligente</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Indica una rama académica y Gemini propondrá keywords estratégicas para tu catálogo en Google.
              </DialogDescription>
            </div>

            <div className="px-8 pb-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Rama o Nicho Académico</Label>
                <div className="flex gap-3">
                  <Input 
                    value={branchInput} 
                    onChange={e => setBranchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                    placeholder="Ej: Marketing, Salud Mental, Python..." 
                    className="bg-secondary/10 border-none font-bold px-6 focus:ring-2 focus:ring-primary/20"
                   size="xl" />
                  <Button 
                    onClick={handleGenerateAI} 
                    disabled={isGenerating || !branchInput.trim()}
                    className="h-14 px-6 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-lg"
                  >
                    {isGenerating ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sugerencias SEO de Gemini</Label>
                    <button 
                      onClick={() => setSelectedSuggestions(aiSuggestions.map(s => s.name))}
                      className="text-[10px] font-bold text-accent uppercase hover:underline"
                    >
                      Marcar Todas
                    </button>
                  </div>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="grid gap-3">
                      {aiSuggestions.map((suggestion) => (
                        <div 
                          key={suggestion.name}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                            selectedSuggestions.includes(suggestion.name) 
                              ? "bg-primary/5 border-primary shadow-sm" 
                              : "bg-white border-border/50 hover:border-primary/20"
                          )}
                          onClick={() => {
                            if (selectedSuggestions.includes(suggestion.name)) {
                              setSelectedSuggestions(selectedSuggestions.filter(s => s !== suggestion.name));
                            } else {
                              setSelectedSuggestions([...selectedSuggestions, suggestion.name]);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="font-bold text-primary">{suggestion.name}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.description}</p>
                            </div>
                            <Checkbox 
                              checked={selectedSuggestions.includes(suggestion.name)}
                              className="rounded-full mt-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter className="pt-4">
                <div className="w-full flex flex-col gap-4">
                  {selectedSuggestions.length > 0 && (
                    <Button 
                      onClick={handleLoadAiSelected} 
                      disabled={loading}
                      className="w-full h-14 rounded-2xl font-bold text-lg"
                    >
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 h-5 w-5" />} 
                      Incorporar {selectedSuggestions.length} Keywords al Sistema
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsAiDialogOpen(false);
                      setAiSuggestions([]);
                      setBranchInput('');
                    }} 
                    className="text-xs font-bold text-muted-foreground hover:text-primary"
                  >
                    Cancelar
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
