'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Send, FileText, CheckCircle2, BrainCircuit, Upload, Clock, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { evaluateQuizPerformance } from '@/ai/flows/evaluate-quiz-performance';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Shared Student Components
import { StudentPageHeader } from '@/components/student/PageHeader';

// Hooks
import { useStudentTasks } from '@/hooks/student/useStudentTasks';

export default function StudentTasksPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const { toast } = useToast();
  
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  const { tasks, pendingTasks, completedTasks, isLoading, isEmpty } = useStudentTasks();

  const handleSubmitTask = async (task: any) => {
    const answer = answers[task.id];
    if (!answer?.trim()) return toast({ variant: 'destructive', title: 'Respuesta vacía' });

    setSubmittingId(task.id);
    try {
      let fileUrl = null;
      if (files[task.id]) {
        const fileRef = ref(storage, `tasks/${profile!.uid}/${task.id}/${Date.now()}_${files[task.id].name}`);
        await uploadBytes(fileRef, files[task.id]);
        fileUrl = await getDownloadURL(fileRef);
      }

      // IA Analysis
      const aiResult = await evaluateQuizPerformance({
        questions: [{
          question: task.description,
          type: 'free_response',
          correctAnswer: task.evaluationCriteria || 'Evalúa la profundidad conceptual y aplicación práctica basándote en la consigna.'
        }],
        answers: { "0": answer },
        studentName: profile?.displayName
      });

      const invitationId = profile!.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      let taskRef = doc(db, 'users', profile!.uid, 'individualTasks', task.id);
      
      try {
        await updateDoc(taskRef, {
          answer,
          fileUrl,
          aiFeedback: aiResult.feedback,
          score: aiResult.score,
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        taskRef = doc(db, 'users', invitationId, 'individualTasks', task.id);
        await updateDoc(taskRef, {
          answer,
          fileUrl,
          aiFeedback: aiResult.feedback,
          score: aiResult.score,
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      }

      toast({ title: 'Desafío completado', description: 'Tu respuesta ha sido analizada por la IA.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al enviar' });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20">
        <StudentPageHeader 
          icon={Zap}
          category="Desafíos IA"
          title="Mis Desafíos"
          description="Tareas individuales asignadas por tus mentores y evaluadas por IA."
        />

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-secondary/20 p-1 rounded-2xl h-14 w-full justify-start gap-2 mb-8 overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="pending" className="rounded-xl px-4 md:px-8 font-bold gap-2 text-xs md:text-sm whitespace-nowrap">
              <Clock className="h-4 w-4" /> Pendientes ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-4 md:px-8 font-bold gap-2 text-xs md:text-sm whitespace-nowrap">
              <History className="h-4 w-4" /> Historial ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary opacity-20 h-10 w-10" /></div>
            ) : pendingTasks.length === 0 ? (
              <Card className="p-16 md:p-20 text-center border-2 border-dashed bg-muted/5 rounded-[2rem] md:rounded-[3rem]">
                <p className="text-muted-foreground font-bold italic text-sm md:text-base">No tienes desafíos pendientes por el momento.</p>
              </Card>
            ) : pendingTasks.map((task) => (
              <Card key={task.id} className="border-none shadow-xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-white group">
                <div className="p-6 md:p-8 bg-accent/5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shadow-md">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-primary">{task.title}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Asignado por: {task.mentorName}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="h-6 border-accent/20 text-accent font-bold text-[10px]">Nuevo Desafío</Badge>
                </div>
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="bg-muted/30 p-5 md:p-6 rounded-2xl border-l-4 border-accent">
                    <p className="text-xs md:text-sm font-medium text-slate-700 leading-relaxed italic">"{task.description}"</p>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tu Respuesta</Label>
                    <Textarea 
                      value={answers[task.id] || ''} 
                      onChange={e => setAnswers({...answers, [task.id]: e.target.value})}
                      placeholder="Escribe tu análisis o respuesta aquí..."
                      className="min-h-[120px] md:min-h-[150px] rounded-2xl p-4 md:p-6 text-sm md:text-base shadow-inner border-none bg-secondary/10 focus-visible:ring-accent"
                    />
                  </div>

                  {task.allowFileUpload && (
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Material de Respaldo (PDF)</Label>
                      <div className="p-8 md:p-10 border-2 border-dashed rounded-3xl flex flex-col items-center gap-4 relative bg-muted/5 hover:bg-muted/10 transition-all group">
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setFiles({...files, [task.id]: file});
                          }} 
                        />
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="text-primary h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-sm md:text-base">{files[task.id] ? files[task.id].name : 'Cargar Archivo PDF'}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">El archivo será procesado por la IA junto a tu respuesta.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-6 md:p-8 pt-0">
                  <Button 
                    onClick={() => handleSubmitTask(task)} 
                    disabled={submittingId === task.id || !answers[task.id]}
                    className="w-full h-14 md:h-16 rounded-2xl md:rounded-[1.5rem] text-base md:text-lg font-bold bg-primary shadow-2xl hover:bg-primary/90"
                  >
                    {submittingId === task.id ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Analizando con IA...</> : <><Send className="mr-2 h-5 w-5" /> Enviar para Evaluación</>}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {completedTasks.length === 0 ? (
              <Card className="p-16 md:p-20 text-center border-2 border-dashed bg-muted/5 rounded-[2rem] md:rounded-[3rem]">
                <p className="text-muted-foreground font-bold italic text-sm md:text-base">No tienes desafíos completados aún.</p>
              </Card>
            ) : completedTasks.map((task) => (
              <Card key={task.id} className="border-none shadow-xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-white">
                <div className="p-6 md:p-8 bg-emerald-50/50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-primary">{task.title}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mentor: {task.mentorName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="text-xl md:text-2xl font-black text-emerald-600 leading-none">{task.score}%</p>
                      <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Puntaje IA</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 md:p-8 space-y-8">
                  <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tu Entrega</Label>
                      <div className="bg-muted/20 p-5 md:p-6 rounded-2xl border">
                        <p className="text-xs md:text-sm leading-relaxed text-slate-700">{task.answer}</p>
                        {task.fileUrl && (
                          <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-bold gap-2 mt-4" onClick={() => window.open(task.fileUrl, '_blank')}>
                            <FileText className="h-3 w-3" /> Ver Documento Adjunto
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase text-emerald-600">Devolución de la IA</Label>
                      <div className="bg-emerald-50/30 p-5 md:p-6 rounded-2xl border border-emerald-100 relative">
                        <BrainCircuit className="absolute -right-2 -top-2 h-12 w-12 opacity-5 text-emerald-500" />
                        <p className="text-xs md:text-sm italic text-emerald-800 leading-relaxed">"{task.aiFeedback}"</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
