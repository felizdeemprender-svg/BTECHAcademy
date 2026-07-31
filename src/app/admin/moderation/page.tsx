
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2,
  Info,
  BrainCircuit,
  Sparkles,
  Search,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { generateModerationSuggestions } from '@/ai/flows/generate-moderation-suggestions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function AdminModerationPage() {
  const db = useFirestore();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');

  // AI Suggestion State
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  const configRef = useMemoFirebase(() => doc(db, 'config', 'moderation'), [db]);
  const { data: config, isLoading: configLoading } = useDoc(configRef);

  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    if (config?.sensitiveTopics) {
      setTopics(config.sensitiveTopics);
    } else if (config === null && !configLoading) {
      setTopics([]);
    }
  }, [config, configLoading]);

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    const cleanTopic = newTopic.trim();
    if (topics.includes(cleanTopic)) {
      toast({ variant: 'destructive', title: 'Tema duplicado' });
      return;
    }
    setTopics([...topics, cleanTopic]);
    setNewTopic('');
  };

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleSaveModeration = () => {
    if (!profile?.roles.includes('admin')) return;
    setLoading(true);

    const saveData = {
      sensitiveTopics: topics,
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid
    };

    setDoc(configRef, saveData, { merge: true })
      .then(() => {
        toast({ title: 'Protocolo Guardado', description: 'La IA ha sido actualizada con los nuevos criterios.' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: configRef.path,
          operation: 'update',
          requestResourceData: saveData
        }));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleGenerateAI = async () => {
    if (!contextInput.trim()) return;
    setIsGenerating(true);
    setAiSuggestions([]);
    setSelectedSuggestions([]);

    try {
      const result = await generateModerationSuggestions({
        context: contextInput,
        existingTopics: topics
      });

      // Filtrar por si acaso la IA repite algo de la lista actual
      const uniqueSuggestions = result.suggestions.filter(s => 
        !topics.some(t => t.toLowerCase() === s.topic.toLowerCase())
      );

      setAiSuggestions(uniqueSuggestions);
      if (uniqueSuggestions.length === 0) {
        toast({ title: 'Sin novedades', description: 'La IA considera que tu protocolo actual ya es robusto para este contexto.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudieron obtener sugerencias.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiSelection = () => {
    const newItems = selectedSuggestions.filter(s => !topics.includes(s));
    setTopics([...topics, ...newItems]);
    setIsAiDialogOpen(false);
    setAiSuggestions([]);
    setContextInput('');
    toast({ title: 'Protocolo Ampliado', description: `Se han añadido ${newItems.length} temas para supervisión.` });
  };

  if (configLoading) return <DashboardLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Temas Sensibles</h1>
            <p className="text-muted-foreground text-lg font-medium">Define los conceptos que requieren supervisión administrativa obligatoria.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAiDialogOpen(true)}
              className="h-14 px-6 rounded-2xl font-bold border-2 border-dashed border-accent text-accent hover:bg-accent/5 gap-2"
            >
              <Sparkles className="h-5 w-5" /> Sugerencias IA
            </Button>
            <Button onClick={handleSaveModeration} disabled={loading} className="h-14 px-8 rounded-2xl font-bold flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Guardar Protocolo
            </Button>
          </div>
        </header>

        <div className="grid gap-8">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
            <BrainCircuit className="h-6 w-6 text-amber-500 shrink-0" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-bold">¿Cómo funciona la moderación profunda?</p>
              <p>La IA de Evolución Académica analiza cada curso comparándolo con esta lista. El análisis incluye:</p>
              <ul className="list-disc list-inside ml-2 opacity-80">
                <li>Título y descripción del programa.</li>
                <li>Documentos maestros cargados por el mentor.</li>
                <li><strong>Todas las preguntas de evaluación (Quizzes).</strong></li>
              </ul>
              <p className="mt-2 text-rose-700 font-bold">Si hay coincidencia, el curso se bloquea hasta tu aprobación manual.</p>
            </div>
          </div>

          <Card className="card-prof p-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Plus className="h-4 w-4" /> Incorporar Palabra Clave Manualmente
              </Label>
              <div className="flex gap-3">
                <Input 
                  id="new-sensitive-topic"
                  name="newTopic"
                  value={newTopic} 
                  onChange={e => setNewTopic(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
                  placeholder="Ej: Criptomonedas, Salud Mental, Política..." 
                  className="bg-secondary/10 border-none font-bold px-6 focus:ring-2 focus:ring-primary/20"
                 size="xl" />
                <Button onClick={handleAddTopic} className="h-14 px-6 rounded-2xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-dashed">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Temas bajo vigilancia ({topics.length})
                </Label>
                {topics.length > 0 && <p className="text-[10px] font-bold text-amber-600 uppercase animate-pulse">Cambios sin guardar</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                {topics.length === 0 ? (
                  <div className="w-full space-y-6">
                    <div className="w-full py-12 text-center border-2 border-dashed rounded-lg bg-amber-50/30 border-amber-200">
                      <BrainCircuit className="h-10 w-10 text-amber-500/40 mx-auto mb-3" />
                      <p className="text-amber-800 font-bold text-sm px-10 uppercase">Modo Proactivo Activado</p>
                      <p className="text-[10px] text-amber-600 font-medium px-10 mt-1 uppercase tracking-tighter">Al no haber una lista manual, Gemini aplicará automáticamente los siguientes criterios de vigilancia ética:</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        "Riesgo Psicológico", 
                        "Falta de Soporte Clínico", 
                        "Opacidad Financiera", 
                        "Manipulación Emocional", 
                        "Privacidad de Datos", 
                        "Ética Pedagógica"
                      ].map(t => (
                        <div key={t} className="p-3 rounded-xl bg-white border border-amber-100 flex items-center gap-2 shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tighter">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  topics.map((topic, idx) => (
                    <Badge key={`${topic}-${idx}`} className="bg-white border-2 border-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-3 text-sm font-bold shadow-sm hover:border-destructive transition-colors group">
                      {topic}
                      <button onClick={() => handleRemoveTopic(idx)} className="text-muted-foreground hover:text-destructive group-hover:scale-110 transition-transform">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* AI Suggestion Dialog */}
        <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
          <DialogContent className="mw-xl">
            <div className="px-8 pt-8 relative">
              <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <ShieldAlert className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">Generador de Protocolos IA</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Indica el área de actividad y Gemini propondrá temas que podrían requerir supervisión humana.
              </DialogDescription>
            </div>

            <div className="px-8 pb-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Área o Contexto Institucional</Label>
                <div className="flex gap-3">
                  <Input 
                    value={contextInput} 
                    onChange={e => setContextInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                    placeholder="Ej: Fintech, Salud Infantil, Educación Terciaria..." 
                    className="bg-secondary/10 border-none font-bold px-6 focus:ring-2 focus:ring-primary/20"
                   size="xl" />
                  <Button 
                    onClick={handleGenerateAI} 
                    disabled={isGenerating || !contextInput.trim()}
                    className="h-14 px-6 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-lg"
                  >
                    {isGenerating ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alertas Propuestas</Label>
                    <button 
                      onClick={() => setSelectedSuggestions(aiSuggestions.map(s => s.topic))}
                      className="text-[10px] font-bold text-accent uppercase hover:underline"
                    >
                      Seleccionar Todo
                    </button>
                  </div>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="grid gap-3">
                      {aiSuggestions.map((suggestion) => (
                        <div 
                          key={suggestion.topic}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                            selectedSuggestions.includes(suggestion.topic) 
                              ? "bg-rose-50 border-rose-200 shadow-sm" 
                              : "bg-white border-border/50 hover:border-rose-100"
                          )}
                          onClick={() => {
                            if (selectedSuggestions.includes(suggestion.topic)) {
                              setSelectedSuggestions(selectedSuggestions.filter(s => s !== suggestion.topic));
                            } else {
                              setSelectedSuggestions([...selectedSuggestions, suggestion.topic]);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900">{suggestion.topic}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed italic">"{suggestion.reason}"</p>
                            </div>
                            <Checkbox 
                              checked={selectedSuggestions.includes(suggestion.topic)}
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
                      onClick={handleApplyAiSelection} 
                      className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-900"
                    >
                      <Check className="mr-2 h-5 w-5" /> 
                      Incorporar {selectedSuggestions.length} Temas al Protocolo
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsAiDialogOpen(false);
                      setAiSuggestions([]);
                      setContextInput('');
                    }} 
                    className="text-xs font-bold text-muted-foreground"
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
