
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Pencil, 
  Upload, 
  Settings2, 
  Zap,
  Star,
  BrainCircuit,
  FileCheck,
  X,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
  Sparkles,
  ClipboardCheck,
  FileText,
  Check,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { generateQuizQuestions } from '@/ai/flows/generate-quiz-questions';
import { extractDocumentText } from '@/ai/flows/extract-document-text-flow';
import { ImageEditor } from '@/components/courses/ImageEditor';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'free_response';
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation?: string;
  allowFileUpload?: boolean;
}

interface SupportMaterial {
  id: string;
  name: string;
  content: string;
  type: string;
  isMaster?: boolean;
  fileBlob?: File;
}

interface ModuleData {
  id?: string;
  title: string;
  contentType: 'video' | 'text';
  contentBody: string;
  videoUrl: string;
  supportMaterials: SupportMaterial[];
  questions: Question[];
  supportQuestions: Question[];
  order: number;
  minPassingScore: number;
  allowRetries: boolean;
  enableSupportQuestions: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const prepareForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(prepareForFirestore);
  if (typeof obj === 'object') {
    if (obj.constructor?.name === 'FieldValue' || obj instanceof Date) {
      return obj;
    }
    const cleaned: any = {};
    for (const key in obj) {
      if (key !== 'fileBlob' && Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        cleaned[key] = val === undefined ? null : prepareForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
};

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { storage } = useFirebase();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const courseRef = useMemoFirebase(() => (id ? doc(db, 'courses', id) : null), [db, id]);
  const { data: course, isLoading: courseLoading } = useDoc(courseRef);

  const modulesQuery = useMemoFirebase(() => 
    id ? query(collection(db, 'courses', id, 'modules'), orderBy('order', 'asc')) : null
  , [db, id]);
  const { data: modules, isLoading: modulesLoading } = useCollection(modulesQuery);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    skipAllowed: true,
  });

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState<ModuleData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // AI Generation State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetType, setAiTargetType] = useState<'main' | 'support'>('main');
  const [aiFlowStep, setAiFlowStep] = useState<1 | 2>(1); 
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrefs, setAiPrefs] = useState({
    numQuestions: 5,
    role: 'Tutor experto empático',
    expectations: '',
    types: ['multiple_choice', 'true_false', 'free_response'] as string[],
  });

  useEffect(() => {
    if (course) {
      // Bloqueo de seguridad: No se puede editar un curso publicado
      if (course.isActive) {
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: 'No se puede editar un curso publicado. Por favor, ocúltalo primero desde el panel de gestión para asegurar que los nuevos cambios pasen por la auditoría institucional.'
        });
        router.push('/courses/manage');
        return;
      }

      setFormData({
        title: course.title || '',
        description: course.description || '',
        thumbnail: course.thumbnail || '',
        skipAllowed: course.settings?.skipAllowed !== false,
      });
    }
  }, [course, router, toast]);

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.removeAttribute('inert');
  }, []);

  const handleSaveGeneral = async () => {
    if (!id || !formData.title) return;
    setLoading(true);
    const ref = doc(db, 'courses', id);
    const updateData = prepareForFirestore({
      ...formData,
      settings: { skipAllowed: formData.skipAllowed },
      updatedAt: serverTimestamp()
    });
    updateDoc(ref, updateData).then(() => {
      toast({ title: 'Plan Académico Actualizado' });
    }).catch(async (err: any) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: ref.path,
        operation: 'update',
        requestResourceData: updateData
      }));
    }).finally(() => {
      setLoading(false);
    });
  };

  const openEditModule = (mod: any) => {
    setCurrentModule({
      ...mod,
      supportMaterials: mod.supportMaterials || [],
      questions: mod.questions || [],
      supportQuestions: mod.supportQuestions || [],
      minPassingScore: mod.minPassingScore ?? 70,
      allowRetries: mod.allowRetries !== false,
      enableSupportQuestions: !!mod.enableSupportQuestions
    });
    setIsModuleModalOpen(true);
  };

  const handleOpenNewModule = () => {
    const nextOrder = (modules?.length || 0) + 1;
    setCurrentModule({
      title: '',
      contentType: 'text',
      contentBody: '',
      videoUrl: '',
      supportMaterials: [],
      questions: [],
      supportQuestions: [],
      order: nextOrder,
      minPassingScore: 70,
      allowRetries: true,
      enableSupportQuestions: false
    });
    setIsModuleModalOpen(true);
  };

  const isCompatibleWithAI = (file: File | undefined, filename: string) => {
    if (file) {
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt');
      const isWord = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
      return isText || isWord;
    }
    return filename.endsWith('.txt') || filename.endsWith('.docx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentModule) return;

    setIsProcessingFile(true);
    const compatible = isCompatibleWithAI(file, file.name);
    const hasMasterAlready = currentModule.supportMaterials.some(m => m.isMaster);

    const newMaterial: SupportMaterial = {
      id: generateId(),
      name: file.name,
      content: '', 
      type: file.type || 'application/octet-stream',
      isMaster: compatible && !hasMasterAlready,
      fileBlob: file 
    };

    setCurrentModule(prev => prev ? { 
      ...prev, 
      supportMaterials: [...prev.supportMaterials, newMaterial] 
    } : null);
    
    setIsProcessingFile(false);
    toast({ title: 'Archivo adjuntado' });
  };

  const handleExtractText = async () => {
    const masterDoc = currentModule?.supportMaterials.find(m => m.isMaster);
    if (!masterDoc) {
      return toast({ variant: 'destructive', title: 'Falta Documento Maestro', description: 'Marca un archivo compatible como maestro.' });
    }

    setIsExtracting(true);
    try {
      let extraction;
      
      if (masterDoc.fileBlob) {
        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(masterDoc.fileBlob!);
        });
        
        extraction = await extractDocumentText({
          documentDataUri: dataUri,
          documentName: masterDoc.name
        });
      } else if (masterDoc.content) {
        extraction = await extractDocumentText({
          documentUrl: masterDoc.content,
          documentName: masterDoc.name
        });
      } else {
        throw new Error("No se detectó contenido para procesar en el documento maestro.");
      }
      
      if (extraction?.error) throw new Error(extraction.error);

      if (extraction?.extractedText) {
        setExtractedContent(extraction.extractedText);
        setAiFlowStep(2);
        toast({ title: 'Lectura Finalizada' });
      }
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de Lectura', 
        description: e.message || "Ocurrió un error al contactar con el motor de extracción." 
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (aiPrefs.types.length === 0 || !currentModule) return;
    setLoading(true);
    try {
      const contentToUse = extractedContent || currentModule.title;
      const result = await generateQuizQuestions({
        content: contentToUse,
        numQuestions: aiPrefs.numQuestions,
        questionTypes: aiPrefs.types as any[],
        role: aiPrefs.role,
        expectations: aiPrefs.expectations
      });
      
      if (result && 'error' in result) throw new Error(result.error);

      const questionsWithIds = result.map(q => ({
        ...q,
        id: generateId(),
        options: q.options || (q.type === 'multiple_choice' ? ['', '', '', ''] : undefined)
      })) as Question[];
      
      if (aiTargetType === 'main') {
        setCurrentModule({ ...currentModule, questions: [...currentModule.questions, ...questionsWithIds] });
      } else {
        setCurrentModule({ ...currentModule, supportQuestions: [...currentModule.supportQuestions, ...questionsWithIds] });
      }
      
      setIsAiModalOpen(false);
      setExtractedContent('');
      setAiFlowStep(1);
      toast({ title: `Se han añadido ${questionsWithIds.length} sugerencias` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Fallo en Generación', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModule = async () => {
    if (!id || !currentModule || !currentModule.title) return;
    setLoading(true);
    
    try {
      const updatedMaterials = await Promise.all(currentModule.supportMaterials.map(async (mat) => {
        if (mat.fileBlob) {
          const storagePath = `courses/${id}/modules/${currentModule.order}/${Date.now()}_${mat.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadResult = await uploadBytes(storageRef, mat.fileBlob, { 
            contentType: mat.type
          });
          const downloadUrl = await getDownloadURL(uploadResult.ref);
          return { 
            id: mat.id, 
            name: mat.name, 
            content: downloadUrl, 
            type: mat.type, 
            isMaster: mat.isMaster 
          };
        }
        return mat;
      }));

      const modId = currentModule.id || generateId();
      const modRef = doc(db, 'courses', id, 'modules', modId);
      const data = prepareForFirestore({ 
        ...currentModule,
        supportMaterials: updatedMaterials,
        id: modId, 
        courseId: id,
        updatedAt: serverTimestamp() 
      });
      
      setDoc(modRef, data, { merge: true }).then(() => {
        setIsModuleModalOpen(false);
        setTimeout(clearUILocks, 150);
        toast({ title: currentModule.id ? 'Clase actualizada' : 'Nueva clase añadida' });
      }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: modRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      });
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar clase',
        description: err.message || 'Ocurrió un fallo inesperado al sincronizar con el almacenamiento o la base de datos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderQuestionEditor = (q: Question, qIdx: number, isSupport: boolean) => (
    <Card key={q.id} className={`p-6 ${isSupport ? 'bg-emerald-50/30' : 'bg-muted/10'} rounded-[2rem] relative border-none shadow-sm`}>
      <Button 
        variant="ghost" size="icon" 
        onClick={() => { 
          if (!currentModule) return;
          const key = isSupport ? 'supportQuestions' : 'questions';
          const qs = [...currentModule[key]]; 
          qs.splice(qIdx, 1); 
          setCurrentModule({...currentModule, [key]: qs}); 
        }} 
        className="absolute top-4 right-4 text-destructive"
      >
        <X className="h-5 w-5" />
      </Button>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
           <span className={`w-8 h-8 rounded-xl ${isSupport ? 'bg-emerald-500' : 'bg-primary'} text-white flex items-center justify-center text-xs font-bold`}>
             {isSupport ? 'S' : ''}{qIdx + 1}
           </span>
           <div className="flex gap-2">
              {['multiple_choice', 'true_false', 'free_response'].map(type => (
                <button 
                  key={type} 
                  type="button"
                  onClick={() => {
                    const key = isSupport ? 'supportQuestions' : 'questions';
                    const newQs = [...currentModule![key]];
                    newQs[qIdx] = { ...newQs[qIdx], type: type as any, options: type === 'multiple_choice' ? ['','','',''] : undefined, correctAnswer: type === 'true_false' ? true : '' };
                    setCurrentModule({...currentModule!, [key]: newQs});
                  }} 
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${q.type === type ? (isSupport ? 'bg-emerald-600' : 'bg-primary') + ' text-white' : 'bg-white border text-muted-foreground'}`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
           </div>
        </div>
        
        <Textarea 
          value={q.question} 
          onChange={e => {
            const key = isSupport ? 'supportQuestions' : 'questions';
            const newQs = [...currentModule![key]];
            newQs[qIdx].question = e.target.value;
            setCurrentModule({...currentModule!, [key]: newQs});
          }} 
          className="w-full bg-white text-sm font-bold p-4 rounded-xl border shadow-sm min-h-[80px]" 
          placeholder="Escribe aquí la pregunta..." 
        />
        
        <div className="pl-4 border-l-4 border-primary/20 space-y-4">
          {q.type === 'multiple_choice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options?.map((opt, optIdx) => (
                <div key={`${q.id}-opt-${optIdx}`} className="flex gap-3 items-center bg-white p-2 rounded-xl border shadow-sm">
                  <button type="button" className={`w-8 h-8 rounded-lg font-bold ${q.correctAnswer === opt ? (isSupport ? 'bg-emerald-500' : 'bg-primary') + ' text-white' : 'bg-muted'}`} onClick={() => {
                    const key = isSupport ? 'supportQuestions' : 'questions';
                    const newQs = [...currentModule![key]];
                    newQs[qIdx].correctAnswer = opt;
                    setCurrentModule({...currentModule!, [key]: newQs});
                  }}>{String.fromCharCode(65+optIdx)}</button>
                  <input value={opt} onChange={e => {
                    const key = isSupport ? 'supportQuestions' : 'questions';
                    const newQs = [...currentModule![key]];
                    newQs[qIdx].options![optIdx] = e.target.value;
                    setCurrentModule({...currentModule!, [key]: newQs});
                  }} className="flex-1 border-none outline-none text-xs" placeholder="Opción" />
                </div>
              ))}
            </div>
          )}
          {q.type === 'true_false' && (
            <div className="flex gap-4">
              <Button variant={q.correctAnswer === true ? 'default' : 'outline'} className="flex-1 h-10 rounded-xl" onClick={() => {
                const key = isSupport ? 'supportQuestions' : 'questions';
                const newQs = [...currentModule![key]];
                newQs[qIdx].correctAnswer = true;
                setCurrentModule({...currentModule!, [key]: newQs});
              }}>Verdadero</Button>
              <Button variant={q.correctAnswer === false ? 'default' : 'outline'} className="flex-1 h-10 rounded-xl" onClick={() => {
                const key = isSupport ? 'supportQuestions' : 'questions';
                const newQs = [...currentModule![key]];
                newQs[qIdx].correctAnswer = false;
                setCurrentModule({...currentModule!, [key]: newQs});
              }}>Falso</Button>
            </div>
          )}
          {q.type === 'free_response' && (
            <div className="space-y-3">
              <Textarea value={q.correctAnswer as string} onChange={e => {
                const key = isSupport ? 'supportQuestions' : 'questions';
                const newQs = [...currentModule![key]];
                newQs[qIdx].correctAnswer = e.target.value;
                setCurrentModule({...currentModule!, [key]: newQs});
              }} placeholder="Respuesta esperada..." className="min-h-[80px] rounded-xl text-xs" />
              <div className="flex items-center justify-between bg-white/40 p-3 rounded-xl border border-dashed">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><Label className="text-xs font-bold">Habilitar Adjunto PDF</Label></div>
                <Switch checked={q.allowFileUpload} onCheckedChange={(val) => {
                  const key = isSupport ? 'supportQuestions' : 'questions';
                  const newQs = [...currentModule![key]];
                  newQs[qIdx].allowFileUpload = val;
                  setCurrentModule({...currentModule!, [key]: newQs});
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (courseLoading || modulesLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/courses/manage')} className="rounded-full"><ArrowLeft className="h-6 w-6" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Editor Académico</h1>
            <p className="text-sm text-muted-foreground font-medium truncate max-w-md">{course?.title}</p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); clearUILocks(); }} className="space-y-6">
          <TabsList className="bg-secondary/20 p-1 rounded-2xl">
            <TabsTrigger value="general" className="rounded-xl px-8 font-bold">Información General</TabsTrigger>
            <TabsTrigger value="modules" className="rounded-xl px-8 font-bold">Temario ({modules?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
              <CardContent className="p-8 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Título del Programa</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-12 rounded-xl font-bold" /></div>
                    
                    <ImageEditor 
                      label="Miniatura del Curso" 
                      url={formData.thumbnail} 
                      onUpdate={url => setFormData({...formData, thumbnail: url})} 
                      courseId={id!} 
                      channel="thumbnails" 
                      keywords={formData.title}
                    />
                  </div>
                  
                  <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary"><Settings2 className="h-4 w-4" /> Comportamiento</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5"><Label className="text-sm font-bold">Exigir Correlatividad</Label><p className="text-[10px] text-muted-foreground">Bloquea módulos si no se aprueba el anterior.</p></div>
                      <Switch checked={!formData.skipAllowed} onCheckedChange={(val) => setFormData({...formData, skipAllowed: !val})} />
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Descripción General</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="min-h-[120px] rounded-xl" /></div>
                </div>
                <Button onClick={handleSaveGeneral} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl" disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Guardar Cambios</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-bold text-lg text-muted-foreground">Estructura del Programa</h3>
              <Button onClick={handleOpenNewModule} className="rounded-xl gap-2 font-bold h-11 bg-primary text-white shadow-lg">
                <Plus className="h-4 w-4" /> Nuevo Tema
              </Button>
            </div>
            <div className="grid gap-4">
              {modules?.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                  <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="font-bold text-muted-foreground">Este curso no tiene clases aún.</p>
                  <Button variant="link" onClick={handleOpenNewModule} className="font-bold text-primary">Comenzar a añadir temas</Button>
                </div>
              ) : modules?.map((mod, idx) => (
                <Card key={mod.id} className="p-6 flex items-center justify-between shadow-md rounded-2xl bg-white border-none hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-lg">{idx + 1}</div>
                    <div>
                      <h4 className="font-bold truncate max-w-[300px] text-lg">{mod.title}</h4>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground mt-1">{mod.contentType}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => openEditModule(mod)} className="rounded-xl h-11 w-11"><Pencil className="h-5 w-5 text-primary" /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isModuleModalOpen} onOpenChange={(open) => { setIsModuleModalOpen(open); if(!open) clearUILocks(); }}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <DialogHeader className="p-8 bg-primary/5">
              <DialogTitle className="text-2xl font-bold">{currentModule?.id ? 'Diseñador de Clase' : 'Nuevo Tema Académico'}</DialogTitle>
              <DialogDescription>Define el contenido y los criterios de evaluación del módulo.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 p-8">
              {currentModule && (
                <div className="space-y-10">
                  <div className="space-y-2"><Label>Nombre de la Clase</Label><Input value={currentModule.title} onChange={e => setCurrentModule({...currentModule!, title: e.target.value})} className="h-14 font-bold rounded-xl text-xl" /></div>
                  <Tabs value={currentModule.contentType} onValueChange={v => setCurrentModule({...currentModule!, contentType: v as any})}>
                    <TabsList className="mb-6 h-12 rounded-2xl p-1 bg-muted">
                      <TabsTrigger value="text" className="rounded-xl font-bold">Bibliografía</TabsTrigger>
                      <TabsTrigger value="video" className="rounded-xl font-bold">Video</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="text" className="space-y-6">
                      <div className="p-10 border-2 border-dashed rounded-3xl flex flex-col items-center gap-4 cursor-pointer relative bg-muted/5">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                        {isProcessingFile ? <Loader2 className="animate-spin h-10 w-10 text-primary" /> : <Upload className="h-10 w-10 text-primary" />}
                        <div className="text-center">
                          <p className="font-bold">Añadir Bibliografía o Material</p>
                          <p className="text-xs text-muted-foreground">Admite cualquier formato para el alumno.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {currentModule.supportMaterials.map((mat) => {
                          const compatible = isCompatibleWithAI(mat.fileBlob, mat.name);
                          return (
                            <div key={mat.id} className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                              mat.isMaster ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-border/50"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl", mat.isMaster ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                  {mat.isMaster ? <BrainCircuit className="h-5 w-5" /> : <FileCheck className="h-5 w-5" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold truncate max-w-[200px]">{mat.name}</p>
                                  {mat.isMaster ? (
                                    <Badge className="bg-primary text-[8px] h-4 uppercase">Documento Maestro (Privado)</Badge>
                                  ) : compatible ? (
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Compatible con IA</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!mat.isMaster && compatible && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    if (currentModule) {
                                      setCurrentModule({
                                        ...currentModule,
                                        supportMaterials: currentModule.supportMaterials.map(m => ({ ...m, isMaster: m.id === mat.id }))
                                      });
                                    }
                                  }} className="text-[10px] font-bold h-8 rounded-lg gap-1">
                                    <Star className="h-3 w-3" /> Hacer Maestro
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => {
                                  if (currentModule) {
                                    setCurrentModule({
                                      ...currentModule,
                                      supportMaterials: currentModule.supportMaterials.filter(m => m.id !== mat.id)
                                    });
                                  }
                                }} className="text-destructive h-8 w-8">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="video">
                      <div className="space-y-4">
                        <Label>URL de Video (YouTube o Vimeo)</Label>
                        <Input value={currentModule.videoUrl} onChange={e => setCurrentModule({...currentModule!, videoUrl: e.target.value})} className="h-12 rounded-xl" placeholder="https://..." />
                        
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl flex items-start gap-3 mt-2">
                          <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                          <div className="text-[11px] text-blue-700 space-y-1">
                            <p className="font-bold uppercase tracking-tight">Seguridad Académica de Video:</p>
                            <ul className="list-disc list-inside opacity-90 space-y-1">
                              <li><strong>YouTube:</strong> Configura como <strong>"Oculto" (Unlisted)</strong> y desactiva incorporación externa para proteger tu marca. YouTube siempre mantendrá ciertos logos visibles al pausar.</li>
                              <li><strong>Vimeo (Recomendado):</strong> Permite <strong>ocultar totalmente el logo</strong> y restringir la reproducción a este dominio mediante su panel de privacidad avanzado.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="bg-accent/5 p-8 rounded-[2rem] border border-accent/10 space-y-6">
                    <h4 className="font-bold text-accent flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Reglas de Aprobación</h4>
                    <div className="grid sm:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label>Exigencia (%)</Label>
                        <Input 
                          type="number" 
                          value={currentModule.minPassingScore || 0} 
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            setCurrentModule({...currentModule!, minPassingScore: isNaN(val) ? 0 : val});
                          }} 
                          className="h-12 rounded-xl" 
                        />
                        <div className="flex items-start gap-2 mt-2 px-1">
                          <Info className="h-3 w-3 text-accent mt-0.5" />
                          <p className="text-[10px] text-accent/80 leading-tight">
                            <strong>Nota:</strong> Al definir 0%, se prioriza la retroalimentación cualitativa y el alumno podrá avanzar sin un umbral mínimo de aciertos.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white/50 p-4 rounded-xl border border-dashed h-12 self-end">
                        <Label className="font-bold">Permitir Reintentos</Label>
                        <Switch checked={currentModule.allowRetries} onCheckedChange={(val) => {
                          if (currentModule) setCurrentModule({...currentModule, allowRetries: val});
                        }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t space-y-8">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xl flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-primary" /> Evaluación Académica</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setCurrentModule({...currentModule!, questions: [...currentModule!.questions, { id: generateId(), type: 'multiple_choice', question: '', correctAnswer: '', options: ['','','',''] }]})} className="rounded-xl font-bold"><Plus className="h-4 w-4 mr-2" /> Añadir Manual</Button>
                        <Button onClick={() => { setAiTargetType('main'); setAiFlowStep(1); setIsAiModalOpen(true); }} className="rounded-xl gap-2 bg-accent hover:bg-accent/90 text-white font-bold shadow-lg"><Sparkles className="h-4 w-4" /> Generar con IA</Button>
                      </div>
                    </div>
                    <div className="space-y-6">{currentModule.questions.map((q, qIdx) => renderQuestionEditor(q, qIdx, false))}</div>
                  </div>

                  <div className="bg-emerald-50/50 p-8 rounded-[3rem] border-2 border-dashed border-emerald-200/50 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><Zap className="h-6 w-6" /></div><div><h3 className="font-bold text-emerald-700">Refuerzo Académico</h3><p className="text-[10px] text-emerald-600 font-medium">Se activa si el alumno reprueba.</p></div></div>
                      <Switch checked={currentModule.enableSupportQuestions} onCheckedChange={(val) => {
                        if (currentModule) setCurrentModule({...currentModule, enableSupportQuestions: val});
                      }} />
                    </div>
                    {currentModule.enableSupportQuestions && (
                      <div className="space-y-8">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-lg flex items-center gap-3"><Zap className="h-5 w-5 text-emerald-600" /> Evaluación de Soporte</h4>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setCurrentModule({...currentModule!, supportQuestions: [...currentModule!.supportQuestions, { id: generateId(), type: 'multiple_choice', question: '', correctAnswer: '', options: ['','','',''] }]})} className="rounded-xl font-bold border-emerald-200 text-emerald-700"><Plus className="h-4 w-4 mr-2" /> Añadir Soporte</Button>
                            <Button onClick={() => { setAiTargetType('support'); setAiFlowStep(1); setIsAiModalOpen(true); }} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg"><Sparkles className="h-4 w-4" /> Generar Soporte IA</Button>
                          </div>
                        </div>
                        <div className="space-y-6">{currentModule.supportQuestions.map((sq, sqIdx) => renderQuestionEditor(sq, sqIdx, true))}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
            <DialogFooter className="p-8 bg-primary/5">
              <Button onClick={handleSaveModule} className="h-14 px-12 rounded-2xl text-lg font-bold shadow-xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Guardar Clase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Modal */}
        <Dialog open={isAiModalOpen} onOpenChange={(open) => { setIsAiModalOpen(open); if(!open) { setAiFlowStep(1); setExtractedContent(''); clearUILocks(); } }}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl max-w-xl">
            <div className="bg-primary p-8 text-white relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                <BrainCircuit className="text-white h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-bold">Generación Inteligente</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-sm mt-1">Utiliza el Documento Maestro para entrenar a la IA.</DialogDescription>
              
              <div className="mt-8 flex items-center justify-between relative px-4">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 z-0 mx-8" />
                <div className={cn("relative z-10 flex flex-col items-center gap-2", aiFlowStep >= 1 ? "text-white" : "text-white/30")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all", aiFlowStep === 1 ? "bg-accent border-accent shadow-[0_0_15px_rgba(var(--accent),0.5)]" : aiFlowStep > 1 ? "bg-green-500 border-green-500" : "bg-primary border-white/20")}>
                    {aiFlowStep > 1 ? <Check className="h-4 w-4" /> : "1"}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Lectura</span>
                </div>
                <div className={cn("relative z-10 flex flex-col items-center gap-2", aiFlowStep >= 2 ? "text-white" : "text-white/30")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all", aiFlowStep === 2 ? "bg-accent border-accent shadow-[0_0_15px_rgba(var(--accent),0.5)]" : "bg-primary border-white/20")}>2</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Generación</span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {aiFlowStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex flex-col items-center text-center gap-4 py-6 px-10 bg-secondary/10 rounded-[2rem] border-2 border-dashed border-primary/10">
                    <FileText className="h-12 w-12 text-primary/40" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">Procesar Documento Maestro</h4>
                      <p className="text-xs text-muted-foreground">Gemini analizará el archivo para proponer evaluaciones.</p>
                    </div>
                    {currentModule?.supportMaterials.find(m => m.isMaster) ? (
                      <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 mt-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold truncate max-w-[200px]">{currentModule?.supportMaterials.find(m => m.isMaster)?.name}</span>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="mt-2">Sin Maestro compatible (.docx/.txt)</Badge>
                    )}
                  </div>

                  <Button onClick={handleExtractText} disabled={isExtracting || !currentModule?.supportMaterials.find(m => m.isMaster)} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl">
                    {isExtracting ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Leyendo...</> : <><Zap className="mr-2 h-5 w-5" /> Iniciar Lectura Profunda</>}
                  </Button>
                </div>
              )}

              {aiFlowStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center"><ClipboardCheck className="h-6 w-6" /></div>
                    <div><p className="text-xs font-bold text-green-700">Contenido Preparado</p><p className="text-[10px] text-green-600">Base de conocimiento cargada con éxito.</p></div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Cantidad</Label>
                      <Input type="number" className="h-12 rounded-xl bg-secondary/30 border-none font-bold" value={aiPrefs.numQuestions} onChange={e => setAiPrefs({...aiPrefs, numQuestions: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Rol</Label>
                      <Input className="h-12 rounded-xl bg-secondary/30 border-none" value={aiPrefs.role} onChange={e => setAiPrefs({...aiPrefs, role: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Instrucciones / Énfasis</Label>
                    <Textarea 
                      placeholder="Ej: Prioriza conceptos prácticos sobre teóricos, genera preguntas de nivel avanzado..."
                      className="min-h-[80px] rounded-xl bg-secondary/30 border-none text-xs"
                      value={aiPrefs.expectations}
                      onChange={e => setAiPrefs({...aiPrefs, expectations: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tipos</Label>
                    <div className="flex flex-wrap gap-3 p-4 bg-secondary/20 rounded-2xl border border-dashed">
                      {['multiple_choice', 'true_false', 'free_response'].map(type => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox checked={aiPrefs.types.includes(type)} onCheckedChange={(checked) => {
                            const newTypes = checked ? [...aiPrefs.types, type] : aiPrefs.types.filter(t => t !== type);
                            setAiPrefs({...aiPrefs, types: newTypes});
                          }} />
                          <Label className="text-xs font-bold capitalize">{type.replace('_', ' ')}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setAiFlowStep(1)} className="rounded-xl font-bold">Atrás</Button>
                    <Button onClick={handleGenerateQuestions} disabled={loading} className="flex-1 h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 bg-primary text-white">
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="h-5 w-5 mr-2" />} Generar Sugerencias</Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
