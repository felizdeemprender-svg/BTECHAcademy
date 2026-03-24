
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
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
  Maximize 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, query, where, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateQuizQuestions } from '@/ai/flows/generate-quiz-questions';
import { extractDocumentText } from '@/ai/flows/extract-document-text-flow';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

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
  title: string;
  contentType: 'video' | 'text';
  contentBody: string;
  videoUrl: string;
  supportMaterials: SupportMaterial[];
  questions: Question[];
  supportQuestions: Question[];
  minPassingScore: number;
  allowRetries: boolean;
  enableSupportQuestions: boolean;
  isProcessing: boolean;
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

export default function CreateCoursePage() {
  const { profile } = useAuth();
  const { storage } = useFirebase();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [moduleOrder, setModuleOrder] = useState(1);
  const [showNextModuleDialog, setShowNextModuleDialog] = useState(false);
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetType, setAiTargetType] = useState<'main' | 'support'>('main');
  const [aiFlowStep, setAiFlowStep] = useState<1 | 2>(1); 
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [termsAccepted, setTermsAccepted] = useState(false);

  const mentorCoursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: mentorCourses } = useCollection(mentorCoursesQuery);

  const termsRef = useMemoFirebase(() => doc(db, 'config', 'terms_courses'), [db]);
  const { data: termsConfig } = useDoc(termsRef);

  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    level: 'basico' as const,
    skipAllowed: true,
  });

  const [aiPrefs, setAiPrefs] = useState({
    numQuestions: 5,
    role: 'Tutor experto empático',
    expectations: '',
    types: ['multiple_choice', 'true_false', 'free_response'] as string[],
  });

  const [brandingData, setBrandingData] = useState({
    bio: '',
    primaryColor: '#3B2D86',
    logoUrl: '',
    socials: {} as Record<string, string>,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedStudents, setInvitedStudents] = useState<any[]>([]);
  const [addingStudent, setAddingStudent] = useState(false);

  const initialModule: ModuleData = { 
    title: '', 
    contentType: 'text', 
    contentBody: '', 
    videoUrl: '', 
    supportMaterials: [],
    questions: [], 
    supportQuestions: [],
    minPassingScore: 70,
    allowRetries: true,
    enableSupportQuestions: false,
    isProcessing: false
  };
  const [currentModule, setCurrentModule] = useState<ModuleData>(initialModule);

  // Carga automática de datos del perfil del usuario al iniciar el asistente
  const hasPopulatedBranding = useRef(false);
  useEffect(() => {
    if (profile && !hasPopulatedBranding.current) {
      setBrandingData({
        bio: profile.profile?.bio || '',
        primaryColor: profile.profile?.branding?.primaryColor || '#3B2D86',
        logoUrl: profile.profile?.branding?.logoUrl || '',
        socials: { ...(profile.profile?.socials || {}) },
      });
      hasPopulatedBranding.current = true;
    }
  }, [profile]);

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.removeAttribute('inert');
  }, []);

  const handleStartCourse = () => {
    if (!profile || !courseData.title) return;

    if (!profile.roles.includes('admin')) {
      const sub = profile.subscription;
      if (!sub) return toast({ variant: 'destructive', title: 'Abono Requerido', description: 'No tienes un abono institucional activo.' });
      if (new Date(sub.endDate) < new Date()) return toast({ variant: 'destructive', title: 'Abono Expirado' });
      const activeCoursesCount = mentorCourses?.filter(c => c.isActive).length || 0;
      if (activeCoursesCount >= sub.maxSimultaneousCourses) return toast({ variant: 'destructive', title: 'Límite alcanzado' });
    }

    setLoading(true);
    const newCourseRef = doc(collection(db, 'courses'));
    const payload = {
      ...courseData,
      id: newCourseRef.id,
      mentorId: profile.uid,
      mentorName: profile.displayName || 'Mentor',
      isActive: false,
      status: 'pending_terms',
      termsAccepted: false,
      settings: { skipAllowed: courseData.skipAllowed },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    setDoc(newCourseRef, payload)
      .then(() => {
        setCourseId(newCourseRef.id);
        setStep(2);
        toast({ title: 'Programa Académico Iniciado' });
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: newCourseRef.path, 
          operation: 'create', 
          requestResourceData: payload 
        }));
        toast({ variant: 'destructive', title: 'Error de Creación', description: 'No tienes permisos para crear programas academicos o tu suscripción ha expirado.' });
      })
      .finally(() => setLoading(false));
  };

  const isCompatibleWithAI = (file: File | undefined) => {
    if (!file) return false;
    return file.type === 'text/plain' || file.name.endsWith('.txt') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCurrentModule(prev => ({ ...prev, isProcessing: true }));
    const compatible = isCompatibleWithAI(file);
    const hasMasterAlready = currentModule.supportMaterials.some(m => m.isMaster);
    const newMaterial: SupportMaterial = { id: generateId(), name: file.name, content: '', type: file.type || 'application/octet-stream', isMaster: compatible && !hasMasterAlready, fileBlob: file };
    setCurrentModule(prev => ({ ...prev, supportMaterials: [...prev.supportMaterials, newMaterial], isProcessing: false }));
    toast({ title: 'Archivo adjuntado' });
  };

  const setAsMaster = (id: string) => {
    const material = currentModule.supportMaterials.find(m => m.id === id);
    if (material && !isCompatibleWithAI(material.fileBlob)) return toast({ variant: 'destructive', title: 'Formato incompatible' });
    setCurrentModule(prev => ({ ...prev, supportMaterials: prev.supportMaterials.map(m => ({ ...m, isMaster: m.id === id })) }));
  };

  const removeMaterial = (id: string) => {
    setCurrentModule(prev => ({ ...prev, supportMaterials: prev.supportMaterials.filter(m => m.id !== id) }));
  };

  const handleExtractText = async () => {
    const masterDoc = currentModule.supportMaterials.find(m => m.isMaster);
    if (!masterDoc?.fileBlob) return toast({ variant: 'destructive', title: 'Falta Documento Maestro' });
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      const dataUri = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(masterDoc.fileBlob!);
      });
      const extraction = await extractDocumentText({ documentDataUri: dataUri, documentName: masterDoc.name });
      if (extraction?.error) throw new Error(extraction.error);
      if (extraction?.extractedText) {
        setExtractedContent(extraction.extractedText);
        setAiFlowStep(2);
        toast({ title: 'Lectura Finalizada' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error de Lectura', description: e.message });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (aiPrefs.types.length === 0) return toast({ variant: 'destructive', title: 'Selecciona tipos' });
    setLoading(true);
    try {
      const contentToUse = extractedContent || currentModule.title;
      const result = await generateQuizQuestions({ content: contentToUse, numQuestions: aiPrefs.numQuestions, questionTypes: aiPrefs.types as any[], role: aiPrefs.role, expectations: aiPrefs.expectations });
      if (result && 'error' in result) throw new Error(result.error);
      const questionsWithIds = result.map((q: any) => ({ ...q, id: generateId(), options: q.options || (q.type === 'multiple_choice' ? ['', '', '', ''] : undefined) })) as Question[];
      if (aiTargetType === 'main') setCurrentModule(prev => ({ ...prev, questions: [...prev.questions, ...questionsWithIds] }));
      else setCurrentModule(prev => ({ ...prev, supportQuestions: [...prev.supportQuestions, ...questionsWithIds] }));
      setIsAiModalOpen(false);
      setExtractedContent('');
      setAiFlowStep(1);
      toast({ title: `Añadidas ${questionsWithIds.length} sugerencias` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Fallo en Generación', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const addManualQuestion = (isSupport: boolean = false) => {
    const newQ: Question = { id: generateId(), type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: '', allowFileUpload: false };
    if (!isSupport) setCurrentModule(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    else setCurrentModule(prev => ({ ...prev, supportQuestions: [...prev.supportQuestions, newQ] }));
  };

  const updateQuestion = (id: string, fields: Partial<Question>, isSupport: boolean = false) => {
    const key = isSupport ? 'supportQuestions' : 'questions';
    setCurrentModule(prev => ({ ...prev, [key]: prev[key].map(q => q.id === id ? { ...q, ...fields } : q) }));
  };

  const renderQuestionEditor = (q: Question, idx: number, isSupport: boolean) => (
    <Card key={q.id} className={`p-6 ${isSupport ? 'bg-emerald-50/30' : 'bg-muted/10'} rounded-3xl border-none relative group/q shadow-sm`}>
       <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-destructive opacity-0 group-hover/q:opacity-100" onClick={() => setCurrentModule(prev => ({ ...prev, [isSupport ? 'supportQuestions' : 'questions']: prev[isSupport ? 'supportQuestions' : 'questions'].filter(item => item.id !== q.id) }))}><X className="h-5 w-5" /></Button>
       <div className="space-y-4">
         <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${isSupport ? 'bg-emerald-500' : 'bg-primary'} text-white w-8 h-8 rounded-xl flex items-center justify-center`}>{isSupport ? 'S' : ''}{idx + 1}</span>
            <div className="flex gap-2">
               {(['multiple_choice', 'true_false', 'free_response'] as const).map(type => (
                 <Badge key={type} variant={q.type === type ? 'default' : 'outline'} className="cursor-pointer capitalize text-[10px]" onClick={() => updateQuestion(q.id, { type, options: type === 'multiple_choice' ? ['','','',''] : undefined, correctAnswer: type === 'true_false' ? true : '' }, isSupport)}>{type.replace('_', ' ')}</Badge>
               ))}
            </div>
         </div>
         <Textarea value={q.question} onChange={e => updateQuestion(q.id, { question: e.target.value }, isSupport)} placeholder="Enunciado..." className="min-h-[100px] text-sm font-bold border-none bg-white/50 rounded-2xl p-4" />
         <div className="pl-4 border-l-4 border-primary/20 space-y-4">
            {q.type === 'multiple_choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {q.options?.map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-3 items-center bg-white p-2 rounded-xl border">
                    <button className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 ${q.correctAnswer === opt ? 'bg-primary text-white shadow-lg' : 'bg-secondary text-muted-foreground'}`} type="button" onClick={() => updateQuestion(q.id, { correctAnswer: opt }, isSupport)}>{String.fromCharCode(65 + optIdx)}</button>
                    <Input value={opt} onChange={e => { const newOpts = [...(q.options || [])]; newOpts[optIdx] = e.target.value; updateQuestion(q.id, { options: newOpts }, isSupport); }} placeholder={`Opción ${optIdx + 1}`} className="h-9 text-sm border-none bg-transparent" />
                  </div>
                ))}
              </div>
            )}
            {q.type === 'true_false' && (
              <div className="flex gap-4"><Button variant={q.correctAnswer === true ? 'default' : 'outline'} className="flex-1 h-12 rounded-2xl font-bold border-2" onClick={() => updateQuestion(q.id, { correctAnswer: true }, isSupport)}>Verdadero</Button><Button variant={q.correctAnswer === false ? 'default' : 'outline'} className="flex-1 h-12 rounded-2xl font-bold border-2" onClick={() => updateQuestion(q.id, { correctAnswer: false }, isSupport)}>Falso</Button></div>
            )}
            {q.type === 'free_response' && (
              <div className="space-y-4">
                <Textarea value={q.correctAnswer as string} onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value }, isSupport)} placeholder="Respuesta ideal..." className="min-h-[100px] text-xs rounded-2xl p-4 bg-white/80 border-none" />
                <div className="flex items-center justify-between bg-white/40 p-4 rounded-2xl border-2 border-dashed border-primary/10">
                   <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-primary" /><div><Label className="text-xs font-bold block">Habilitar Adjunto PDF</Label><p className="text-[10px] text-muted-foreground">Permite al alumno subir documentación.</p></div></div>
                   <Switch checked={q.allowFileUpload} onCheckedChange={(val) => updateQuestion(q.id, { allowFileUpload: val }, isSupport)} />
                </div>
              </div>
            )}
         </div>
       </div>
    </Card>
  );

  const handleSaveModule = async () => {
    if (!courseId || !currentModule.title) return;
    setLoading(true);
    try {
      const updatedMaterials = await Promise.all(currentModule.supportMaterials.map(async (mat) => {
        if (mat.fileBlob) {
          const storagePath = `courses/${courseId}/modules/${moduleOrder}/${Date.now()}_${mat.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadResult = await uploadBytes(storageRef, mat.fileBlob, { contentType: mat.type });
          const downloadUrl = await getDownloadURL(uploadResult.ref);
          return { id: mat.id, name: mat.name, content: downloadUrl, type: mat.type, isMaster: mat.isMaster };
        }
        return mat;
      }));
      
      const modRef = doc(collection(db, 'courses', courseId, 'modules'));
      
      // Aseguramos que si hay una URL de video, se guarde correctamente
      const data = prepareForFirestore({ 
        ...currentModule, 
        supportMaterials: updatedMaterials, 
        id: modRef.id, 
        courseId, 
        order: moduleOrder, 
        createdAt: serverTimestamp() 
      });
      
      setDoc(modRef, data).then(() => setShowNextModuleDialog(true)).catch(async (e) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: modRef.path, operation: 'create', requestResourceData: data })));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al guardar clase', description: err.message || 'Ocurrió un fallo inesperado al procesar los materiales o la base de datos.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `courses/${courseId}/branding/logo_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setBrandingData(prev => ({ ...prev, logoUrl: url }));
      toast({ title: 'Logo actualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al subir logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!courseId) return;
    setLoading(true);
    const courseRef = doc(db, 'courses', courseId);
    const data = { brandingOverride: brandingData, updatedAt: serverTimestamp() };
    updateDoc(courseRef, data).then(() => { setStep(4); toast({ title: 'Identidad Visual Aplicada' }); })
      .catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: courseRef.path, operation: 'update', requestResourceData: data })))
      .finally(() => setLoading(false));
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail || !courseId || !profile?.uid) return;
    setAddingStudent(true);
    try {
      // Usamos setDoc directo para enrollments heredando contexto de auth
      const enrollmentId = Math.random().toString(36).substring(2, 15);
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      
      const enrollmentData = {
        id: enrollmentId,
        courseId,
        mentorId: profile.uid,
        inviteEmail: inviteEmail.toLowerCase().trim(),
        studentName: inviteEmail.split('@')[0],
        status: 'active',
        isInvited: isInvitation,
        isDirect: !isInvitation,
        enrolledAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      await setDoc(enrollmentRef, enrollmentData);
      
      setInvitedStudents(prev => [enrollmentData, ...prev]);
      setInviteEmail('');
      toast({ title: isInvitation ? 'Invitación de cortesía enviada' : 'Alumno facturable inscrito' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error de Inscripción', description: 'No se pudo inscribir al alumno. Verifica tus permisos o límites.' });
    } finally { 
      setAddingStudent(false); 
    }
  };

  const handleAcceptTerms = () => {
    if (!courseId || !termsAccepted) return;
    setLoading(true);
    const courseRef = doc(db, 'courses', courseId);
    updateDoc(courseRef, { 
      termsAccepted: true, 
      termsAcceptedAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    })
      .then(() => { setStep(6); toast({ title: 'Términos Aceptados' }); })
      .finally(() => setLoading(false));
  };

  const handleFinalFinish = async () => {
    if (!courseId) return;
    setLoading(true);
    const courseRef = doc(db, 'courses', courseId);
    updateDoc(courseRef, { 
      status: 'draft', 
      isActive: false, 
      updatedAt: serverTimestamp() 
    }).then(() => {
      toast({ title: 'Programa Académico Registrado' });
      router.push('/courses/manage');
    }).finally(() => setLoading(false));
  };

  return (
    <DashboardLayout>
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 p-8"><CardTitle className="text-xl">1. Fundamentos del Curso</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Título</Label><Input value={courseData.title} onChange={e => setCourseData({...courseData, title: e.target.value})} placeholder="Ej: Especialización en IA..." className="h-14 font-bold rounded-2xl bg-secondary/10 border-none" /></div>
                  
                  <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 space-y-6">
                    <h3 className="text-xs font-bold uppercase text-primary flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Reglas de Negocio</h3>
                    <div className="flex items-center justify-between"><div className="space-y-0.5"><Label className="text-sm font-bold">Exigir Correlatividad</Label></div><Switch checked={!courseData.skipAllowed} onCheckedChange={(val) => setCourseData({...courseData, skipAllowed: !val})} /></div>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Descripción Académica</Label><Textarea value={courseData.description} onChange={e => setCourseData({...courseData, description: e.target.value})} placeholder="Describe las competencias..." className="min-h-[140px] rounded-2xl bg-secondary/10 border-none p-6" /></div>
                </div>
                <Button onClick={handleStartCourse} disabled={!courseData.title || loading} className="w-full h-16 rounded-[1.5rem] text-lg font-bold shadow-xl">Siguiente: Crear Clases <ArrowRight className="ml-2 h-5 w-5" /></Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardHeader className="bg-accent/10 p-8 flex flex-row justify-between items-center"><div><Badge className="bg-accent text-white h-6 mb-2">Clase #{moduleOrder}</Badge><CardTitle className="text-2xl font-bold">Contenido Académico</CardTitle></div></CardHeader>
              <CardContent className="p-8 space-y-8">
                <Input placeholder="Nombre de la Clase" value={currentModule.title} onChange={e => setCurrentModule({...currentModule, title: e.target.value})} className="h-14 font-bold text-xl border-none bg-muted/40 rounded-2xl" />
                <Tabs value={currentModule.contentType} onValueChange={v => setCurrentModule({...currentModule, contentType: v as any})}>
                  <TabsList className="bg-muted p-1.5 mb-6 rounded-2xl w-full max-w-md h-14"><TabsTrigger value="text" className="flex-1 rounded-xl gap-2 font-bold h-11"><BookOpen className="h-4 w-4" /> Bibliografía</TabsTrigger><TabsTrigger value="video" className="flex-1 rounded-xl gap-2 font-bold h-11"><Video className="h-4 w-4" /> Video</TabsTrigger></TabsList>
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
                        onChange={e => setCurrentModule({...currentModule, videoUrl: e.target.value})} 
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
                          setCurrentModule({...currentModule, minPassingScore: isNaN(val) ? 0 : val});
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
                      <Switch checked={currentModule.allowRetries} onCheckedChange={(val) => setCurrentModule({...currentModule, allowRetries: val})} />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t flex flex-col gap-6">
                  <div className="flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-primary" /> Evaluaciones</h3><div className="flex gap-3"><Button onClick={() => addManualQuestion(false)} variant="outline" className="rounded-2xl gap-2 font-bold h-12 border-2"><Plus className="h-4 w-4" /> Añadir Pregunta</Button><Button onClick={() => { setAiTargetType('main'); setAiFlowStep(1); setIsAiModalOpen(true); }} className="rounded-2xl gap-2 bg-accent h-12 text-white"><Sparkles className="h-4 w-4" /> Generar con IA</Button></div></div>
                  <div className="grid gap-4">{currentModule.questions.map((q, idx) => renderQuestionEditor(q, idx, false))}</div>
                </div>
                <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border-2 border-emerald-100 space-y-6">
                   <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center"><Zap className="h-6 w-6" /></div><div><h3 className="font-bold text-emerald-800">Refuerzo Automático</h3></div></div><Switch checked={currentModule.enableSupportQuestions} onCheckedChange={(val) => setCurrentModule({...currentModule, enableSupportQuestions: val})} /></div>
                   {currentModule.enableSupportQuestions && (
                     <div className="pt-6 space-y-6 border-t border-emerald-200">
                        <div className="flex justify-between items-center"><h4 className="font-bold text-emerald-800">Evaluación de Soporte</h4><div className="flex gap-2"><Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => addManualQuestion(true)}><Plus className="h-3 w-3 mr-1" /> Añadir Manual</Button><Button size="sm" className="bg-emerald-600 text-white rounded-xl font-bold" onClick={() => { setAiTargetType('support'); setAiFlowStep(1); setIsAiModalOpen(true); }}><Sparkles className="h-3 w-3 mr-1" /> Generar Soporte con IA</Button></div></div>
                        <div className="grid gap-4">{currentModule.supportQuestions.map((q, idx) => renderQuestionEditor(q, idx, true))}</div>
                     </div>
                   )}
                </div>
                <Button onClick={handleSaveModule} disabled={!currentModule.title || loading} className="w-full h-16 rounded-[1.5rem] text-lg font-bold bg-primary shadow-2xl mt-6">{loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} Guardar Clase #{moduleOrder}</Button>
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
                        onChange={e => setBrandingData({...brandingData, bio: e.target.value})} 
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
                          onChange={e => setBrandingData({...brandingData, socials: {...brandingData.socials, [social.id]: e.target.value}})} 
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
                            <Button variant="ghost" className="rounded-2xl font-bold h-12 px-8 text-destructive hover:bg-destructive/10" onClick={() => setBrandingData({...brandingData, logoUrl: ''})}>
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
                            onChange={e => setBrandingData({...brandingData, primaryColor: e.target.value})}
                            className="w-24 h-24 rounded-3xl p-0 border-none cursor-pointer overflow-hidden shadow-xl ring-4 ring-white"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Maximize className="h-6 w-6 text-white mix-blend-difference opacity-50" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-4">
                          <Input 
                            value={brandingData.primaryColor} 
                            onChange={e => setBrandingData({...brandingData, primaryColor: e.target.value})}
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
                    <div className="flex items-center gap-3 bg-secondary/5 px-4 py-2 rounded-xl border border-dashed">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-tighter">{isInvitation ? 'Cortesía' : 'Facturable'}</p>
                        <p className="text-[8px] text-muted-foreground leading-tight">{isInvitation ? 'Sin costo / Límite plan' : 'Venta directa / Ilimitado'}</p>
                      </div>
                      <Switch checked={isInvitation} onCheckedChange={setIsInvitation} className="scale-75" />
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

        <Dialog open={isAiModalOpen} onOpenChange={(open) => { setIsAiModalOpen(open); if(!open) { setAiFlowStep(1); setExtractedContent(''); clearUILocks(); } }}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl max-w-xl">
            <div className="bg-primary p-8 text-white relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4"><BrainCircuit className="text-white h-6 w-6" /></div>
              <DialogTitle className="text-2xl font-bold">Generación Inteligente</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-sm mt-1">Entrena a la IA con el Documento Maestro de esta clase.</DialogDescription>
              
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
                      <Badge variant="destructive" className="mt-2">Sin Maestro compatible (.docx/.txt)</Badge>
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
                      placeholder="Ej: Enfócate en los conceptos técnicos, haz preguntas de alta dificultad..."
                      className="min-h-[80px] rounded-xl bg-secondary/30 border-none text-xs"
                      value={aiPrefs.expectations}
                      onChange={e => setAiPrefs({...aiPrefs, expectations: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tipos Permitidos</Label>
                    <div className="flex flex-wrap gap-3 p-4 bg-secondary/20 rounded-2xl border border-dashed">
                      {['multiple_choice', 'true_false', 'free_response'].map(type => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox id={`create-ai-type-${type}`} checked={aiPrefs.types.includes(type)} onCheckedChange={(checked) => {
                            const newTypes = checked ? [...aiPrefs.types, type] : aiPrefs.types.filter(t => t !== type);
                            setAiPrefs({...aiPrefs, types: newTypes});
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

        <AlertDialog open={showNextModuleDialog} onOpenChange={(open) => { setShowNextModuleDialog(open); if(!open) clearUILocks(); }}>
          <AlertDialogContent className="rounded-[2.5rem] p-10 max-sm border-none shadow-3xl">
            <AlertDialogHeader className="items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold">¡Clase Guardada!</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
              <AlertDialogCancel onClick={() => { setStep(3); clearUILocks(); }} className="flex-1 h-12 rounded-xl font-bold border-2">Siguiente Paso: Identidad</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setCurrentModule(initialModule); setModuleOrder(prev => prev + 1); setShowNextModuleDialog(false); clearUILocks(); }} className="flex-1 h-12 rounded-xl font-bold bg-primary">Añadir Otra Clase</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
