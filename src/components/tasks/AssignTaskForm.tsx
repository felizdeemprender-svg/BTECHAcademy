'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainCircuit, FileText, Info, Loader2, Plus } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export interface TaskFormData {
  type: 'free' | 'course' | 'module';
  title: string;
  description: string;
  evaluationCriteria: string;
  allowFileUpload: boolean;
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  deadline: string;
}

interface AssignTaskFormProps {
  mentorCourses: any[];
  onSubmit: (data: TaskFormData) => Promise<void>;
  loading?: boolean;
}

export function AssignTaskForm({ mentorCourses, onSubmit, loading = false }: AssignTaskFormProps) {
  const db = useFirestore();
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    type: 'free',
    title: '',
    description: '',
    evaluationCriteria: '',
    allowFileUpload: false,
    courseId: '',
    moduleId: '',
    moduleTitle: '',
    deadline: ''
  });

  const modulesQuery = useMemoFirebase(() => taskForm.courseId 
    ? query(collection(db, 'courses', taskForm.courseId, 'modules'), orderBy('order', 'asc')) 
    : null, [db, taskForm.courseId]);

  const { data: courseModules } = useCollection(modulesQuery);

  const handleSubmit = async () => {
    await onSubmit(taskForm);
    setTaskForm({
      type: 'free', title: '', description: '', evaluationCriteria: '',
      allowFileUpload: false, courseId: '', moduleId: '', moduleTitle: '', deadline: ''
    });
  };

  const isFree = taskForm.type === 'free';
  const isValid = isFree ? !!taskForm.description : (taskForm.type === 'module' ? !!taskForm.courseId && !!taskForm.moduleId : !!taskForm.courseId);

  return (
    <Card>
      <CardHeader className="bg-primary/5 p-8 border-b">
        <CardTitle className="text-xl font-bold">Asignar Compromiso</CardTitle>
        <CardDescription>Establece objetivos pedagógicos para el alumno.</CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase ml-1 text-muted-foreground">Tipo de Tarea</Label>
            <div className="flex flex-wrap gap-4 p-4 bg-secondary/10 rounded-xl">
              <div className="flex items-center gap-2">
                <input type="radio" id="task-free" checked={taskForm.type === 'free'} onChange={() => setTaskForm({...taskForm, type: 'free', courseId: '', moduleId: '', moduleTitle: ''})} className="accent-primary" />
                <Label htmlFor="task-free" className="text-xs font-bold cursor-pointer">Pregunta Libre</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" id="task-course" checked={taskForm.type === 'course'} onChange={() => setTaskForm({...taskForm, type: 'course', moduleId: '', moduleTitle: ''})} className="accent-primary" />
                <Label htmlFor="task-course" className="text-xs font-bold cursor-pointer">Vincular Curso Completo</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" id="task-module" checked={taskForm.type === 'module'} onChange={() => setTaskForm({...taskForm, type: 'module'})} className="accent-primary" />
                <Label htmlFor="task-module" className="text-xs font-bold cursor-pointer">Vincular Módulo</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase ml-1 text-muted-foreground">Fecha Límite</Label>
            <Input type="date" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} className="bg-secondary/5"  size="lg" />
          </div>
        </div>

        {taskForm.type === 'free' ? (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase ml-1 text-muted-foreground">Título del Desafío</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Ej: Análisis de Competencia" className="bg-secondary/5"  size="lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase ml-1 text-muted-foreground">Consigna Detallada (Pregunta)</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Describe qué debe realizar el alumno..." size="lg" className="min-h-[100px] bg-secondary/5" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-accent ml-1 flex items-center gap-2"><BrainCircuit className="h-3 w-3" /> Criterios de Evaluación para la IA</Label>
              <Textarea value={taskForm.evaluationCriteria} onChange={e => setTaskForm({...taskForm, evaluationCriteria: e.target.value})} placeholder="Indica qué puntos debe validar Gemini para calificar esta tarea..." size="lg" className="min-h-[100px] bg-accent/5 border-accent/20" />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl border border-dashed border-primary/10">
              <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-primary" /><Label className="text-xs font-bold">Habilitar Adjunto PDF</Label></div>
              <Switch checked={taskForm.allowFileUpload} onCheckedChange={(val) => setTaskForm({...taskForm, allowFileUpload: val})} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase ml-1 text-muted-foreground">Seleccionar Curso del Mentor</Label>
              <Select value={taskForm.courseId} onValueChange={id => setTaskForm({...taskForm, courseId: id, moduleId: '', moduleTitle: ''})}>
                <SelectTrigger size="lg" className="bg-secondary/5"><SelectValue placeholder="Elegir programa..." /></SelectTrigger>
                <SelectContent>
                  {mentorCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {taskForm.type === 'module' && taskForm.courseId && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label className="text-[10px] font-bold uppercase ml-1 text-muted-foreground">Seleccionar Módulo</Label>
                <Select value={taskForm.moduleId} onValueChange={(id) => {
                  const selectedModule = courseModules?.find(m => m.id === id);
                  setTaskForm({...taskForm, moduleId: id, moduleTitle: selectedModule?.title || ''});
                }}>
                  <SelectTrigger size="lg" className="bg-secondary/5"><SelectValue placeholder="Elegir módulo..." /></SelectTrigger>
                  <SelectContent>
                    {courseModules?.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-2 items-start mt-4">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                {taskForm.type === 'module' 
                  ? 'El alumno será inscrito automáticamente al curso, pero solo se le mostrará el módulo seleccionado. La tarea se completará al aprobar este módulo.' 
                  : 'Al seleccionar un curso, el alumno será inscrito automáticamente. La tarea se marcará como completada cuando el curso llegue al 100%.'}
              </p>
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading || !isValid} className="w-full h-14 rounded-2xl font-bold text-lg shadow-primary/20 bg-primary">
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />} Asignar Tarea
        </Button>
      </CardContent>
    </Card>
  );
}
