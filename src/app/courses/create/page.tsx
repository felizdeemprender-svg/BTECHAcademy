'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout as AppLayout } from '../../../components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Sparkles,
  ArrowRight,
  Check,
  Upload,
  Video,
  BookOpen,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  Save,
  FileText,
  Star,
  Settings2,
  ShieldCheck,
  Zap,
  FileCheck,
  BrainCircuit,
  ClipboardCheck,
  Palette,
  Users,
  Power,
  UserPlus,
  Mail,
  ImageIcon,
  ShieldAlert,
  Clock,
  ArrowLeft,
  Scale,
  Info,
  User,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Phone,
  Calendar,
  Trash2,
  Maximize,
  Rocket
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, query, where, updateDoc, getDocs, getDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractDocumentText } from '@/ai/flows/extract-document-text-flow';
import { generateQuizQuestions } from '@/ai/flows/generate-quiz-questions';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const initialModule = {
  title: '',
  contentType: 'text' as 'text' | 'video',
  content: '',
  videoUrl: '',
  supportMaterials: [] as any[],
  questions: [] as any[],
  supportQuestions: [] as any[],
  isProcessing: false,
  minPassingScore: 70,
  allowRetries: true,
  enableSupportQuestions: false
};

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { firestore: db, storage } = useFirebase();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    categoryId: '',
    level: '',
    tags: [] as string[]
  });

  const [currentModule, setCurrentModule] = useState(initialModule);
  const [moduleOrder, setModuleOrder] = useState(1);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [invitedStudents, setInvitedStudents] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInvitation, setIsInvitation] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const classNameInputRef = useRef<HTMLInputElement>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [brandingData, setBrandingData] = useState({
    bio: '',
    socials: {} as Record<string, string>,
    logoUrl: '',
    primaryColor: '#0f172a'
  });

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiFlowStep, setAiFlowStep] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');
  const [aiPrefs, setAiPrefs] = useState({
    numQuestions: 5,
    role: 'Mentor Académico',
    expectations: 'Enfócate en conceptos clave y aplicación práctica.',
    types: ['multiple_choice']
  });

  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  const [showNextModuleDialog, setShowNextModuleDialog] = useState(false);
  const [aiTargetType, setAiTargetType] = useState<'main' | 'support'>('main');

  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, 'categories'), orderBy('name', 'asc')) : null, [db]);
  const levelsQuery = useMemoFirebase(() => db ? query(collection(db, 'levels'), orderBy('order', 'asc')) : null, [db]);

  const { data: categories } = useCollection(categoriesQuery);
  const { data: levels } = useCollection(levelsQuery);
  const { data: termsConfig } = useDoc(useMemoFirebase(() => db ? doc(db, 'config', 'terms') : null, [db]));


  const logoInputRef = useRef<HTMLInputElement>(null);

  const clearUILocks = () => {
    document.body.style.pointerEvents = '';
  };

  const handleGenerateTags = async () => {
    if (!courseData.categoryId) return;
    setIsGeneratingTags(true);
    try {
      const response = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: courseData.categoryId, title: courseData.title })
      });
      const data = await response.json();
      setSuggestedTags(data.tags || []);
    } catch (error) {
      toast({ title: 'Error al generar etiquetas', variant: 'destructive' });
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleStartCourse = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newCourseRef = doc(collection(db, 'courses'));
      await setDoc(newCourseRef, {
        ...courseData,
        mentorId: user.uid,
        status: 'creating',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        modulesCount: 0,
        studentsCount: 0
      });
      setCourseId(newCourseRef.id);
      setStep(2);
    } catch (error) {
      toast({ title: 'Error al iniciar curso', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;
    setCurrentModule({ ...currentModule, isProcessing: true });
    try {
      const storageRef = ref(storage, `courses/${courseId}/materials/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const newMaterial = { id: Date.now().toString(), name: file.name, url, isMaster: false, fileBlob: file };
      setCurrentModule(prev => ({ ...prev, supportMaterials: [...prev.supportMaterials, newMaterial], isProcessing: false }));
    } catch (error) {
      toast({ title: 'Error al subir archivo', variant: 'destructive' });
      setCurrentModule(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const isCompatibleWithAI = (file: File | any) => {
    const fileName = file?.name || file?.fileName || '';
    const name = fileName.toLowerCase();
    const type = file?.type || '';
    return (
      name.endsWith('.docx') || 
      name.endsWith('.doc') || 
      name.endsWith('.txt') || 
      name.endsWith('.pdf') ||
      type === 'application/pdf' ||
      type.includes('wordprocessingml.document') ||
      type.includes('msword')
    );
  };

  const setAsMaster = (id: string) => {
    setCurrentModule(prev => ({
      ...prev,
      supportMaterials: prev.supportMaterials.map(m => ({ ...m, isMaster: m.id === id }))
    }));
  };

  const removeMaterial = (id: string) => {
    setCurrentModule(prev => ({
      ...prev,
      supportMaterials: prev.supportMaterials.filter(m => m.id !== id)
    }));
  };

  const addManualQuestion = (isSupport: boolean) => {
    const newQ = { id: Date.now().toString(), text: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: 0 };
    if (isSupport) {
      setCurrentModule(prev => ({ ...prev, supportQuestions: [...prev.supportQuestions, newQ] }));
    } else {
      setCurrentModule(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    }
  };

  const handleSaveModule = async () => {
    if (!currentModule.title.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Faltan datos', 
        description: 'Por favor, introduce un nombre para la clase antes de continuar.' 
      });
      classNameInputRef.current?.focus();
      return;
    }

    if (currentModule.contentType === 'video' && !currentModule.videoUrl.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Falta el video', 
        description: 'Has seleccionado tipo Video pero no has proporcionado una URL válida.' 
      });
      return;
    }

    if (!courseId) return;
    setLoading(true);

    try {
      // Función para limpiar profundamente el objeto antes de enviarlo a Firestore
      const cleanForFirestore = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(cleanForFirestore);
        if (obj !== null && typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([key, value]) => key !== 'fileBlob' && key !== 'isProcessing' && value !== undefined)
              .map(([key, value]) => [key, cleanForFirestore(value)])
          );
        }
        return obj;
      };

      const moduleData = cleanForFirestore({
        ...currentModule,
        order: moduleOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const moduleRef = doc(collection(db, 'courses', courseId, 'modules'));
      await setDoc(moduleRef, moduleData);
      
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, { 
        modulesCount: moduleOrder,
        updatedAt: serverTimestamp() 
      });
      
      toast({ title: 'Clase guardada correctamente' });
      setShowNextModuleDialog(true);
    } catch (error: any) {
      console.error("Critical Save Error:", error);
      toast({ 
        title: 'Error al guardar clase', 
        description: error.message || 'Error de comunicación con la base de datos.',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `courses/${courseId}/branding/logo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setBrandingData({ ...brandingData, logoUrl: url });
    } catch (error) {
      toast({ title: 'Error al subir logo', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, { branding: brandingData });
      setStep(4);
    } catch (error) {
      toast({ title: 'Error al guardar branding', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStudent = async () => {
    if (!courseId || !inviteEmail) return;
    setAddingStudent(true);
    try {
      const inviteRef = doc(collection(db, 'courses', courseId, 'invites'));
      const studentData = { inviteEmail, isInvited: isInvitation, createdAt: serverTimestamp(), studentName: inviteEmail.split('@')[0] };
      await setDoc(inviteRef, studentData);
      setInvitedStudents([...invitedStudents, studentData]);
      setInviteEmail('');
      toast({ title: 'Alumno inscrito con éxito' });
    } catch (error) {
      toast({ title: 'Error al inscribir alumno', variant: 'destructive' });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, { termsAccepted: true, termsAcceptedAt: serverTimestamp() });
      setStep(6);
    } catch (error) {
      toast({ title: 'Error al aceptar términos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalFinish = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, { status: 'draft', updatedAt: serverTimestamp() });
      toast({ title: 'Curso finalizado' });
      router.push('/courses/manage');
    } catch (error) {
      toast({ title: 'Error al finalizar curso', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const handleExtractText = async () => {
    const master = currentModule.supportMaterials.find(m => m.isMaster);
    if (!master?.url) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay un documento maestro configurado o la URL no es válida.' });
      return;
    }

    setIsExtracting(true);
    try {
      const extraction = await extractDocumentText({ 
        documentUrl: master.url, 
        documentName: master.name 
      });
      
      if (extraction.error) throw new Error(extraction.error);
      
      if (extraction.extractedText) {
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
    if (aiPrefs.types.length === 0) return;
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
        options: q.options || (q.type === 'multiple_choice' ? ['', '', '', ''] : null)
      }));
      
      if (aiTargetType === 'main') {
        setCurrentModule(prev => ({ ...prev, questions: [...prev.questions, ...questionsWithIds] }));
      } else {
        setCurrentModule(prev => ({ ...prev, supportQuestions: [...prev.supportQuestions, ...questionsWithIds] }));
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

  const renderQuestionEditor = (q: any, idx: number, isSupport: boolean) => (
    <Card key={q.id} className="border-2 border-primary/10 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="py-4 px-6 bg-secondary/5 flex flex-row justify-between items-center">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-bold">Pregunta {idx + 1}</Badge>
          <div className="flex gap-2">
            {['multiple_choice', 'true_false', 'free_response'].map(type => (
              <button 
                key={type} 
                type="button"
                onClick={() => {
                  const key = isSupport ? 'supportQuestions' : 'questions';
                  const newQs = [...currentModule[key]];
                  newQs[idx] = { 
                    ...newQs[idx], 
                    type: type as any, 
                    options: type === 'multiple_choice' ? ['', '', '', ''] : undefined, 
                    correctAnswer: type === 'true_false' ? true : 0 
                  };
                  setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                }} 
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${q.type === type ? 'bg-primary text-white' : 'bg-white border text-muted-foreground'}`}
              >
                {type === 'multiple_choice' ? 'Opción Múltiple' : type === 'true_false' ? 'V/F' : 'Abierta'}
              </button>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
          if (isSupport) {
            setCurrentModule(prev => ({ ...prev, supportQuestions: prev.supportQuestions.filter(x => x.id !== q.id) }));
          } else {
            setCurrentModule(prev => ({ ...prev, questions: prev.questions.filter(x => x.id !== q.id) }));
          }
        }}><Trash2 className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Enunciado</Label>
          <Input value={q.text || q.question || ''} onChange={e => {
            const newQs = [...(isSupport ? currentModule.supportQuestions : currentModule.questions)];
            newQs[idx].text = e.target.value;
            newQs[idx].question = e.target.value;
            setCurrentModule(prev => ({ ...prev, [isSupport ? 'supportQuestions' : 'questions']: newQs }));
          }} placeholder="¿Cuál es la pregunta?" className="font-medium h-12 rounded-xl" />
        </div>

        {q.type === 'multiple_choice' && q.options && (
          <div className="space-y-3 pt-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Opciones de Respuesta</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((opt: string, optIdx: number) => (
                <div key={optIdx} className="flex gap-3 items-center bg-white p-2 rounded-xl border shadow-sm">
                  <button 
                    type="button" 
                    className={`w-8 h-8 rounded-lg font-bold shrink-0 transition-colors ${
                      (q.correctAnswer === optIdx || q.correctAnswer === opt) 
                        ? 'bg-primary text-white' 
                        : 'bg-muted hover:bg-muted/80'
                    }`} 
                    onClick={() => {
                      const key = isSupport ? 'supportQuestions' : 'questions';
                      const newQs = [...currentModule[key]];
                      newQs[idx].correctAnswer = optIdx;
                      setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                    }}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </button>
                  <input 
                    value={opt} 
                    onChange={e => {
                      const key = isSupport ? 'supportQuestions' : 'questions';
                      const newQs = [...currentModule[key]];
                      newQs[idx].options[optIdx] = e.target.value;
                      setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                    }} 
                    className="flex-1 border-none outline-none text-xs bg-transparent" 
                    placeholder={`Opción ${String.fromCharCode(65 + optIdx)}`} 
                  />
                  {q.options.length > 2 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => {
                        const key = isSupport ? 'supportQuestions' : 'questions';
                        const newQs = [...currentModule[key]];
                        newQs[idx].options.splice(optIdx, 1);
                        if (newQs[idx].correctAnswer >= newQs[idx].options.length) {
                          newQs[idx].correctAnswer = 0;
                        }
                        setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {q.options.length < 6 && (
              <div className="flex justify-end pt-1">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl text-[10px] font-bold h-8"
                  onClick={() => {
                    const key = isSupport ? 'supportQuestions' : 'questions';
                    const newQs = [...currentModule[key]];
                    newQs[idx].options.push('');
                    setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir Opción
                </Button>
              </div>
            )}
          </div>
        )}

        {q.type === 'true_false' && (
          <div className="space-y-3 pt-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Respuesta Correcta</Label>
            <div className="flex gap-4">
              <Button 
                type="button"
                variant={q.correctAnswer === true ? 'default' : 'outline'} 
                className="flex-1 h-12 rounded-xl font-bold transition-all" 
                onClick={() => {
                  const key = isSupport ? 'supportQuestions' : 'questions';
                  const newQs = [...currentModule[key]];
                  newQs[idx].correctAnswer = true;
                  setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                }}
              >
                Verdadero
              </Button>
              <Button 
                type="button"
                variant={q.correctAnswer === false ? 'default' : 'outline'} 
                className="flex-1 h-12 rounded-xl font-bold transition-all" 
                onClick={() => {
                  const key = isSupport ? 'supportQuestions' : 'questions';
                  const newQs = [...currentModule[key]];
                  newQs[idx].correctAnswer = false;
                  setCurrentModule(prev => ({ ...prev, [key]: newQs }));
                }}
              >
                Falso
              </Button>
            </div>
          </div>
        )}

        {q.type === 'free_response' && (
          <div className="space-y-3 pt-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Respuesta Esperada / Puntos Clave</Label>
            <Textarea 
              value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''}
              onChange={e => {
                const key = isSupport ? 'supportQuestions' : 'questions';
                const newQs = [...currentModule[key]];
                newQs[idx].correctAnswer = e.target.value;
                setCurrentModule(prev => ({ ...prev, [key]: newQs }));
              }}
              placeholder="Escribe la respuesta esperada o los puntos clave que debe cubrir el alumno..."
              className="min-h-[80px] bg-white rounded-xl text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", step < 5 ? "bg-primary" : step === 5 ? "bg-amber-500" : "bg-emerald-500")}>
              {step < 5 ? <Settings2 /> : step === 5 ? <Scale /> : <CheckCircle2 />}
            </div>
            <div>
              <h1 className="text-2xl font-headline font-bold text-primary">Asistente de Creación</h1>
              <p className="text-sm text-muted-foreground font-medium">Configura tu programa institucional paso a paso.</p>
            </div>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Etapa {step} de 6</span>
            <Progress value={(step / 6) * 100} className="w-40 h-1.5" />
          </div>
        </header>

        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
              <div className="bg-primary/5 p-10 border-b">
                <Badge className="bg-primary/10 text-primary border-none mb-2 px-3 py-1 rounded-full uppercase tracking-tighter font-black text-[9px]">Paso 01</Badge>
                <h2 className="text-2xl font-bold text-primary">Información Institucional</h2>
                <p className="text-muted-foreground text-sm">Define las bases y el alcance de tu nuevo programa educativo.</p>
              </div>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="course-title" className="text-sm font-bold ml-1">Título del Programa</Label>
                      <Input 
                        id="course-title"
                        name="title"
                        placeholder="Ej: Master en ADN Modeling" 
                        value={courseData.title}
                        onChange={e => setCourseData({ ...courseData, title: e.target.value })}
                        className="h-12 rounded-xl bg-secondary/5 border-none px-4 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course-description" className="text-sm font-bold ml-1">Descripción Breve</Label>
                      <Textarea 
                        id="course-description"
                        name="description"
                        placeholder="Explica de qué trata este programa..."
                        value={courseData.description}
                        onChange={e => setCourseData({ ...courseData, description: e.target.value })}
                        className="min-h-[120px] rounded-xl bg-secondary/5 border-none p-4 text-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-secondary/5 p-8 rounded-3xl border border-dashed space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="course-category" className="text-sm font-bold ml-1">Categoría Académica</Label>
                        <Select value={courseData.categoryId} onValueChange={v => setCourseData({ ...courseData, categoryId: v })}>
                          <SelectTrigger id="course-category" className="h-12 rounded-xl bg-white border-none shadow-sm px-4 font-bold">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-2xl">
                            {categories?.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="course-level" className="text-sm font-bold ml-1">Nivel del Programa</Label>
                        <Select value={courseData.level} onValueChange={v => setCourseData({ ...courseData, level: v })}>
                          <SelectTrigger id="course-level" className="h-12 rounded-xl bg-white border-none shadow-sm px-4 font-bold">
                            <SelectValue placeholder="Selecciona el nivel" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-2xl">
                            {levels?.map((lvl: any) => (
                              <SelectItem key={lvl.id} value={lvl.name} className="font-bold">{lvl.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      onClick={handleStartCourse} 
                      disabled={!courseData.title || !courseData.categoryId || loading}
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-primary shadow-xl hover:scale-[1.01] transition-transform"
                    >
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-5 w-5" />} INICIAR CREACIÓN
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardHeader className="bg-accent/10 p-8 flex flex-row justify-between items-center"><div><Badge className="bg-accent text-white h-6 mb-2">Clase #{moduleOrder}</Badge><CardTitle className="text-2xl font-bold">Contenido Académico</CardTitle></div></CardHeader>
              <CardContent className="p-8 space-y-8">
                <Input 
                  ref={classNameInputRef}
                  placeholder="Nombre de la Clase" 
                  value={currentModule.title} 
                  onChange={e => setCurrentModule({ ...currentModule, title: e.target.value })} 
                  className="h-14 font-bold text-xl border-none bg-muted/40 rounded-2xl" 
                />
                <Tabs value={currentModule.contentType} onValueChange={v => setCurrentModule({ ...currentModule, contentType: v as any })}>
                  <TabsList className="bg-muted p-1.5 mb-6 rounded-2xl w-full max-md h-14"><TabsTrigger value="text" className="flex-1 rounded-xl gap-2 font-bold h-11"><BookOpen className="h-4 w-4" /> Bibliografía</TabsTrigger><TabsTrigger value="video" className="flex-1 rounded-xl gap-2 font-bold h-11"><Video className="h-4 w-4" /> Video</TabsTrigger></TabsList>
                  <TabsContent value="text" className="space-y-6">
                    <div className="p-12 border-2 border-dashed rounded-[3rem] flex flex-col items-center gap-4 relative bg-muted/5 hover:bg-muted/10 transition-all group">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">{currentModule.isProcessing ? <Loader2 className="animate-spin text-primary" /> : <Upload className="text-primary" />}</div>
                      <div className="text-center"><p className="font-bold text-lg">Cargar Materiales</p><p className="text-sm text-muted-foreground">PDF, Word o TXT.</p></div>
                    </div>
                    <div className="grid gap-3">
                      {currentModule.supportMaterials.map((mat) => {
                        const compatible = isCompatibleWithAI(mat.fileBlob);
                        return (
                          <div key={mat.id} className={cn("flex items-center justify-between p-5 rounded-2xl border-2", mat.isMaster ? "bg-primary/5 border-primary shadow-md" : "bg-white border-border/50")}>
                            <div className="flex items-center gap-4"><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", mat.isMaster ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{mat.isMaster ? <BrainCircuit className="h-5 w-5" /> : <FileCheck className="h-5 w-5" />}</div><div><p className="font-bold text-sm">{mat.name}</p>{mat.isMaster && <Badge className="bg-primary text-[8px] h-4 uppercase mt-1">Maestro para IA</Badge>}</div></div>
                            <div className="flex gap-2">{!mat.isMaster && compatible && <Button variant="ghost" size="sm" onClick={() => setAsMaster(mat.id)} className="text-[10px] font-bold h-9 rounded-xl"><Star className="h-3 w-3 mr-1" /> Marcar Maestro</Button>}<Button variant="ghost" size="icon" onClick={() => removeMaterial(mat.id)} className="text-destructive h-9 w-9 rounded-xl"><X className="h-4 w-4" /></Button></div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  <TabsContent value="video">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase ml-1">URL de Video (YouTube o Vimeo)</Label>
                      <Input
                        placeholder="https://..."
                        value={currentModule.videoUrl}
                        onChange={e => setCurrentModule({ ...currentModule, videoUrl: e.target.value })}
                        className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-medium"
                      />
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-2xl flex items-start gap-4 mt-2">
                        <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-blue-700 space-y-2">
                          <p className="font-bold uppercase tracking-tight">Seguridad Académica de Video:</p>
                          <ul className="list-disc list-inside opacity-90 space-y-1.5 leading-relaxed">
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
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Exigencia (%)</Label>
                      <Input
                        type="number"
                        value={currentModule.minPassingScore}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setCurrentModule({ ...currentModule, minPassingScore: isNaN(val) ? 0 : val });
                        }}
                        className="h-12 rounded-xl bg-white border-none font-bold"
                      />
                      <div className="flex items-start gap-2 mt-2 px-1">
                        <Info className="h-3 w-3 text-accent mt-0.5" />
                        <p className="text-[10px] text-accent/80 leading-tight">
                          <strong>Nota:</strong> Al definir 0%, se prioriza la retroalimentación cualitativa y el alumno podrá avanzar sin un umbral mínimo de aciertos.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white/50 p-4 rounded-xl border border-dashed h-12 self-end">
                      <Label className="text-sm font-bold">Permitir Reintentos</Label>
                      <Switch checked={currentModule.allowRetries} onCheckedChange={(val) => setCurrentModule({ ...currentModule, allowRetries: val })} />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t flex flex-col gap-6">
                  <div className="flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-primary" /> Evaluaciones</h3><div className="flex gap-3"><Button onClick={() => addManualQuestion(false)} variant="outline" className="rounded-2xl gap-2 font-bold h-12 border-2"><Plus className="h-4 w-4" /> Añadir Pregunta</Button><Button onClick={() => { setAiTargetType('main'); setAiFlowStep(1); setIsAiModalOpen(true); }} className="rounded-2xl gap-2 bg-accent h-12 text-white"><Sparkles className="h-4 w-4" /> Generar con IA</Button></div></div>
                  <div className="grid gap-4">{currentModule.questions.map((q, idx) => renderQuestionEditor(q, idx, false))}</div>
                </div>
                <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border-2 border-emerald-100 space-y-6">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center"><Zap className="h-6 w-6" /></div><div><h3 className="font-bold text-emerald-800">Refuerzo Automático</h3></div></div><Switch checked={currentModule.enableSupportQuestions} onCheckedChange={(val) => setCurrentModule({ ...currentModule, enableSupportQuestions: val })} /></div>
                  {currentModule.enableSupportQuestions && (
                    <div className="pt-6 space-y-6 border-t border-emerald-200">
                      <div className="flex justify-between items-center"><h4 className="font-bold text-emerald-800">Evaluación de Soporte</h4><div className="flex gap-2"><Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => addManualQuestion(true)}><Plus className="h-3 w-3 mr-1" /> Añadir Manual</Button><Button size="sm" className="bg-emerald-600 text-white rounded-xl font-bold" onClick={() => { setAiTargetType('support'); setAiFlowStep(1); setIsAiModalOpen(true); }}><Sparkles className="h-3 w-3 mr-1" /> Generar Soporte con IA</Button></div></div>
                      <div className="grid gap-4">{currentModule.supportQuestions.map((q, idx) => renderQuestionEditor(q, idx, true))}</div>
                    </div>
                  )}
                </div>
                <Button onClick={handleSaveModule} disabled={loading} className="w-full h-16 rounded-[1.5rem] text-lg font-bold bg-primary shadow-2xl mt-6">{loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} Guardar Clase #{moduleOrder}</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="bg-primary/5 p-10 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">3. Identidad del Programa</CardTitle>
                  <CardDescription>Personaliza la presentación institucional del curso.</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setStep(4)} className="rounded-xl font-bold">Saltar Paso</Button>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="perfil" className="w-full">
                  <TabsList className="bg-secondary/20 p-1 rounded-none border-b h-16 w-full justify-start gap-2 px-10">
                    <TabsTrigger value="perfil" className="rounded-xl gap-2 font-bold px-6 h-11"><User className="h-4 w-4" /> Perfil</TabsTrigger>
                    <TabsTrigger value="contacto" className="rounded-xl gap-2 font-bold px-6 h-11"><Globe className="h-4 w-4" /> Contacto</TabsTrigger>
                    <TabsTrigger value="marca" className="rounded-xl gap-2 font-bold px-6 h-11"><Palette className="h-4 w-4" /> Marca</TabsTrigger>
                  </TabsList>

                  <TabsContent value="perfil" className="p-10 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="create-bio" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Biografía del Mentor para este Curso</Label>
                      <Textarea
                        id="create-bio"
                        value={brandingData.bio}
                        onChange={e => setBrandingData({ ...brandingData, bio: e.target.value })}
                        placeholder="Describe tu trayectoria y enfoque para este programa..."
                        className="min-h-[200px] rounded-[2rem] bg-secondary/10 border-none p-8 text-base leading-relaxed"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="contacto" className="p-10 grid sm:grid-cols-2 gap-8">
                    {[
                      { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                      { id: 'twitter', label: 'X (Twitter)', icon: Twitter },
                      { id: 'instagram', label: 'Instagram', icon: Instagram },
                      { id: 'youtube', label: 'YouTube', icon: Youtube },
                      { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                      { id: 'phone', label: 'Teléfono', icon: Phone },
                      { id: 'website', label: 'Sitio Web', icon: Globe },
                      { id: 'calendly', label: 'Calendly', icon: Calendar },
                    ].map((social) => (
                      <div key={social.id} className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><social.icon className="h-3 w-3" /> {social.label}</Label>
                        <Input
                          value={brandingData.socials[social.id] || ''}
                          onChange={e => setBrandingData({ ...brandingData, socials: { ...brandingData.socials, [social.id]: e.target.value } })}
                          className="h-14 rounded-2xl bg-secondary/10 border-none font-medium"
                          placeholder={`Enlace a ${social.label}`}
                        />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="marca" className="p-10 space-y-12">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logo Institucional del Curso</Label>
                      <div className="flex items-center gap-8">
                        <div className="w-32 h-32 rounded-3xl bg-secondary/20 flex items-center justify-center relative overflow-hidden border-4 border-white shadow-xl">
                          {brandingData.logoUrl ? (
                            <Image src={brandingData.logoUrl} alt="Logo" fill className="object-contain p-4" unoptimized />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" className="rounded-2xl font-bold h-14 px-8 border-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                            {uploadingLogo ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-5 w-5" />} Subir Logo
                          </Button>
                          {brandingData.logoUrl && (
                            <Button variant="ghost" className="rounded-2xl font-bold h-12 px-8 text-destructive hover:bg-destructive/10" onClick={() => setBrandingData({ ...brandingData, logoUrl: '' })}>
                              <Trash2 className="mr-2 h-5 w-5" /> Eliminar Logo
                            </Button>
                          )}
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleUploadLogo} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color Primario Académico</Label>
                      <div className="flex flex-col sm:flex-row items-center gap-8 bg-secondary/10 p-6 rounded-3xl">
                        <div className="relative">
                          <input
                            type="color"
                            value={brandingData.primaryColor}
                            onChange={e => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                            className="w-24 h-24 rounded-3xl p-0 border-none cursor-pointer overflow-hidden shadow-xl ring-4 ring-white"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Maximize className="h-6 w-6 text-white mix-blend-difference opacity-50" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-4">
                          <Input
                            value={brandingData.primaryColor}
                            onChange={e => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                            className="h-14 text-2xl font-mono font-bold text-center rounded-2xl bg-white border-none shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="p-10 pt-0">
                  <Button onClick={handleSaveBranding} className="w-full h-16 rounded-[1.5rem] text-lg font-bold shadow-2xl bg-primary" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Aplicar Identidad y Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in fade-in">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white">
              <CardHeader className="bg-primary/5 p-10"><div className="flex justify-between items-center"><div><CardTitle className="text-2xl font-bold">4. Matrícula</CardTitle></div><Button variant="ghost" onClick={() => setStep(5)} className="rounded-xl">Saltar</Button></div></CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inscribir Alumno</Label>
                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border shadow-sm ring-1 ring-primary/5">
                      <div className="text-right">
                        <Badge className={cn(
                          "text-[9px] px-2 h-5 border-none shadow-none uppercase font-black tracking-widest mb-0.5",
                          isInvitation ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-primary text-white hover:bg-primary"
                        )}>
                          {isInvitation ? 'Cortesía' : 'Facturable'}
                        </Badge>
                        <p className="text-[8px] text-muted-foreground font-bold tracking-tight">
                          {isInvitation ? 'CONSUME LÍMITE PLAN' : 'VENTA DIRECTA / ILIMITADO'}
                        </p>
                      </div>
                      <Switch checked={isInvitation} onCheckedChange={setIsInvitation} className="scale-90" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Input placeholder="alumno@institucion.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="h-14 rounded-2xl border-2" />
                    <Button onClick={handleInviteStudent} disabled={!inviteEmail || addingStudent} className="h-14 px-8 rounded-2xl font-bold">
                      {addingStudent ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />} Inscribir
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {invitedStudents.map((stu, i) => (
                    <div key={i} className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                      stu.isInvited ? "bg-amber-50/30 border-amber-200/50" : "bg-secondary/10 border-border"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm",
                          stu.isInvited ? "bg-amber-100/50" : "bg-primary/10"
                        )}>
                          <Mail className={cn("h-4 w-4", stu.isInvited ? "text-amber-600" : "text-primary")} />
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2">
                            {stu.studentName}
                            <Badge className={cn(
                              "text-[8px] px-1.5 h-4 border-none shadow-none uppercase tracking-widest font-black",
                              stu.isInvited ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {stu.isInvited ? 'Cortesía' : 'Facturable'}
                            </Badge>
                          </p>
                          <p className="text-[10px] text-muted-foreground">{stu.inviteEmail}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-none">Activo</Badge>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setStep(5)} className="w-full h-16 rounded-[1.5rem] text-lg font-bold shadow-2xl">Continuar a Términos <ArrowRight className="h-5 w-5 ml-2" /></Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="bg-amber-50 p-10 border-b border-amber-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg"><Scale className="h-6 w-6" /></div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-amber-900">5. Marco Legal Académico</CardTitle>
                    <CardDescription className="text-amber-700">Protocolo de creación y autoría para mentores.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-8">
                  <ScrollArea className="h-[400px] pr-6">
                    <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {termsConfig?.content || "Cargando protocolo académico..."}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex items-center space-x-3 p-6 bg-secondary/10 rounded-2xl border-2 border-dashed border-primary/10">
                  <Checkbox id="terms-accept" checked={termsAccepted} onCheckedChange={(val) => setTermsAccepted(!!val)} className="h-6 w-6 rounded-lg" />
                  <Label htmlFor="terms-accept" className="text-sm font-bold cursor-pointer leading-none">Confirmo que el contenido de este curso cumple con el protocolo académico vigente.</Label>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(4)} className="h-16 px-8 rounded-[1.5rem] font-bold border-2">Atrás</Button>
                  <Button onClick={handleAcceptTerms} disabled={!termsAccepted || loading} className="flex-1 h-16 rounded-[1.5rem] text-lg font-bold shadow-2xl bg-primary">Confirmar Aceptación <ArrowRight className="h-5 w-5 ml-2" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8 animate-in fade-in">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-10"><Sparkles className="h-40 w-40" /></div>
              <CardHeader className="p-12 pb-6 relative z-10"><CardTitle className="text-4xl font-bold">6. Registro Final</CardTitle><CardDescription className="text-slate-400 text-lg">Tu programa ha cumplido todos los requisitos.</CardDescription></CardHeader>
              <CardContent className="p-12 pt-6 space-y-10 relative z-10">
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 flex items-start gap-4">
                  <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold">Estado: Borrador Protegido</h4>
                    <p className="text-sm text-slate-400 mt-1">Una vez finalizado, deberás solicitar la publicación en el panel de Gestión Académica. En ese momento se realizará la auditoría IA automática.</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10"><div className="flex items-center gap-3 mb-2"><BookOpen className="text-accent h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest text-slate-400">Estructura</span></div><p className="text-2xl font-bold">{moduleOrder} Clases</p></div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10"><div className="flex items-center gap-3 mb-2"><Users className="text-emerald-400 h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest text-slate-400">Legal</span></div><p className="text-2xl font-bold">Términos Aceptados</p></div>
                </div>
                <Button onClick={handleFinalFinish} disabled={loading} className="w-full h-20 rounded-[2rem] text-2xl font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-2xl transition-all">Finalizar Creación de Programa</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isAiModalOpen} onOpenChange={(open) => { setIsAiModalOpen(open); if (!open) { setAiFlowStep(1); setExtractedContent(''); clearUILocks(); } }}>
        <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl max-w-xl">
          <div className="bg-primary p-8 text-white relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4"><BrainCircuit className="text-white h-6 w-6" /></div>
            <DialogTitle className="text-2xl font-bold">Generación Inteligente</DialogTitle>
            <DialogDescription className="text-primary-foreground/70 text-sm mt-1">
              Gemini analizará tu documento maestro para proponer una estructura pedagógica y evaluaciones automáticas.
            </DialogDescription>

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
                  {currentModule.supportMaterials.find(m => m.isMaster) ? (
                    <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 mt-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold truncate max-w-[200px]">{currentModule.supportMaterials.find(m => m.isMaster)?.name}</span>
                    </div>
                  ) : (
                    <Badge variant="destructive" className="mt-2">Sin Maestro compatible (.pdf/.docx/.txt)</Badge>
                  )}
                </div>

                <Button onClick={handleExtractText} disabled={isExtracting || !currentModule.supportMaterials.find(m => m.isMaster)} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl">
                  {isExtracting ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Gemini está leyendo...</> : <><Zap className="mr-2 h-5 w-5" /> Iniciar Lectura Profunda</>}
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
                    <Input type="number" className="h-12 rounded-xl bg-secondary/30 border-none font-bold" value={aiPrefs.numQuestions} onChange={e => setAiPrefs({ ...aiPrefs, numQuestions: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Rol</Label>
                    <Input className="h-12 rounded-xl bg-secondary/30 border-none" value={aiPrefs.role} onChange={e => setAiPrefs({ ...aiPrefs, role: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Instrucciones / Énfasis</Label>
                  <Textarea
                    placeholder="Ej: Enfócate en los conceptos técnicos, haz preguntas de alta dificultad..."
                    className="min-h-[80px] rounded-xl bg-secondary/30 border-none text-xs"
                    value={aiPrefs.expectations}
                    onChange={e => setAiPrefs({ ...aiPrefs, expectations: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tipos Permitidos</Label>
                  <div className="flex flex-wrap gap-3 p-4 bg-secondary/20 rounded-2xl border border-dashed">
                    {['multiple_choice', 'true_false', 'free_response'].map(type => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox id={`create-ai-type-${type}`} checked={aiPrefs.types.includes(type)} onCheckedChange={(checked) => {
                          const newTypes = checked ? [...aiPrefs.types, type] : aiPrefs.types.filter(t => t !== type);
                          setAiPrefs({ ...aiPrefs, types: newTypes });
                        }} />
                        <Label htmlFor={`create-ai-type-${type}`} className="text-xs font-bold capitalize cursor-pointer">{type.replace('_', ' ')}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setAiFlowStep(1)} className="rounded-xl font-bold">Atrás</Button>
                  <Button onClick={handleGenerateQuestions} disabled={loading} className="flex-1 h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 bg-primary text-white">
                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="h-5 w-5 mr-2" />} Generar Sugerencias
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNextModuleDialog} onOpenChange={(open) => { setShowNextModuleDialog(open); if (!open) clearUILocks(); }}>
        <AlertDialogContent className="rounded-[2.5rem] p-10 max-sm border-none shadow-3xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold">¡Clase Guardada!</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              La clase se ha guardado correctamente. Puedes elegir añadir otra clase o proceder al siguiente paso de identidad visual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel onClick={() => { setStep(3); clearUILocks(); }} className="flex-1 h-12 rounded-xl font-bold border-2">Siguiente Paso: Identidad</AlertDialogCancel>
            <AlertDialogAction onClick={() => { 
              setCurrentModule(initialModule); 
              setModuleOrder(prev => prev + 1); 
              setShowNextModuleDialog(false); 
              clearUILocks();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => classNameInputRef.current?.focus(), 500);
            }} className="flex-1 h-12 rounded-xl font-bold bg-primary">Añadir Otra Clase</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
