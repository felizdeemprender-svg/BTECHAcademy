
'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Zap, Clock, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { evaluateQuizPerformance } from '@/ai/flows/evaluate-quiz-performance';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

// Shared Student Components
import { StudentPageHeader } from '@/components/student/PageHeader';

// Hooks
import { useStudentTasks } from '@/hooks/student/useStudentTasks';

// Local Components
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskModals } from '@/components/tasks/TaskModals';

export default function StudentTasksPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const { toast } = useToast();
  
  // Data State
  const { pendingTasks, completedTasks, isLoading } = useStudentTasks();

  // UI State
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmitTask = async (task: any) => {
    if (!answer.trim()) return toast({ variant: 'destructive', title: 'Respuesta vacía' });

    setLoading(true);
    try {
      let fileUrl = null;
      if (file) {
        const fileRef = ref(storage, `tasks/${profile!.uid}/${task.id}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
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
      
      const updateData = {
        answer,
        fileUrl,
        aiFeedback: aiResult.feedback,
        score: aiResult.score,
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      try {
        await updateDoc(taskRef, updateData);
      } catch (e) {
        taskRef = doc(db, 'users', invitationId, 'individualTasks', task.id);
        await updateDoc(taskRef, updateData);
      }

      toast({ title: 'Desafío completado', description: 'Tu respuesta ha sido analizada por la IA.' });
      setIsResponseOpen(false);
      setAnswer('');
      setFile(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al enviar' });
    } finally {
      setLoading(false);
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

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              <TabsContent value="pending" className="m-0 animate-in fade-in">
                <TaskTable 
                  tasks={pendingTasks} 
                  isLoading={isLoading} 
                  type="pending" 
                  onAction={(task) => {
                    setSelectedTask(task);
                    setAnswer('');
                    setFile(null);
                    setIsResponseOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="history" className="m-0 animate-in fade-in">
                <TaskTable 
                  tasks={completedTasks} 
                  isLoading={isLoading} 
                  type="history" 
                  onAction={(task) => {
                    setSelectedTask(task);
                    setIsDetailOpen(true);
                  }}
                />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        <TaskModals 
          isResponseOpen={isResponseOpen}
          setIsResponseOpen={setIsResponseOpen}
          isDetailOpen={isDetailOpen}
          setIsDetailOpen={setIsDetailOpen}
          selectedTask={selectedTask}
          answer={answer}
          setAnswer={setAnswer}
          file={file}
          setFile={setFile}
          loading={loading}
          onSubmit={handleSubmitTask}
        />
      </div>
    </DashboardLayout>
  );
}
