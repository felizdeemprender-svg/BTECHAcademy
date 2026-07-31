
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  FileText, 
  Save, 
  Loader2, 
  ShieldCheck,
  AlertTriangle,
  Scale,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminTermsPage() {
  const db = useFirestore();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'usage' | 'courses'>('usage');
  
  const [usageContent, setUsageContent] = useState('');
  const [coursesContent, setCoursesContent] = useState('');

  const usageRef = useMemoFirebase(() => doc(db, 'config', 'terms_usage'), [db]);
  const { data: usageConfig, isLoading: usageLoading } = useDoc(usageRef);

  const coursesRef = useMemoFirebase(() => doc(db, 'config', 'terms_courses'), [db]);
  const { data: coursesConfig, isLoading: coursesLoading } = useDoc(coursesRef);

  useEffect(() => {
    if (usageConfig?.content) setUsageContent(usageConfig.content);
  }, [usageConfig]);

  useEffect(() => {
    if (coursesConfig?.content) setCoursesContent(coursesConfig.content);
  }, [coursesConfig]);

  const handleSave = (type: 'usage' | 'courses') => {
    if (!profile?.roles.includes('admin')) return;
    setLoading(true);

    const ref = type === 'usage' ? usageRef : coursesRef;
    const currentConfig = type === 'usage' ? usageConfig : coursesConfig;
    const content = type === 'usage' ? usageContent : coursesContent;

    const saveData = {
      content: content,
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid,
      version: (currentConfig?.version || 0) + 1
    };

    setDoc(ref, saveData, { merge: true })
      .then(() => {
        toast({ 
          title: 'Contrato Actualizado', 
          description: `La nueva versión de ${type === 'usage' ? 'Uso del Sistema' : 'Creación de Cursos'} ha sido publicada.` 
        });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: saveData
        }));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const isDataLoading = usageLoading || coursesLoading;

  if (isDataLoading) return <DashboardLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Gestión Legal</h1>
            <p className="text-muted-foreground text-lg font-medium">Administra los marcos regulatorios de la institución.</p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-8">
          <TabsList className="bg-secondary/20 p-1 rounded-2xl h-14">
            <TabsTrigger value="usage" className="rounded-xl px-8 font-bold gap-2">
              <Users className="h-4 w-4" /> Uso del Sistema
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl px-8 font-bold gap-2">
              <Scale className="h-4 w-4" /> Creación de Cursos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage">
            <div className="grid gap-8">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-blue-500 shrink-0" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-bold">Contrato de Acceso General</p>
                  <p>Este texto será presentado a **todos los usuarios** (alumnos, mentores y admins) al ingresar por primera vez. Nadie puede usar la plataforma sin aceptar estos términos.</p>
                </div>
              </div>

              <Card className="card-prof p-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Editor de Términos de Uso
                    </Label>
                    {usageConfig?.version && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Versión: v{usageConfig.version}</span>
                    )}
                  </div>
                  <Textarea 
                    value={usageContent}
                    onChange={(e) => setUsageContent(e.target.value)}
                    placeholder="Normas de convivencia, privacidad de datos..."
                    className="min-h-[400px] rounded-2xl bg-secondary/10 border-none font-medium p-8 leading-relaxed focus:bg-white transition-all"
                  />
                  <Button 
                    onClick={() => handleSave('usage')} 
                    disabled={loading || !usageContent.trim()} 
                    className="w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Publicar Términos de Uso
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses">
            <div className="grid gap-8">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
                <Scale className="h-6 w-6 text-amber-500 shrink-0" />
                <div className="text-sm text-amber-800 space-y-1">
                  <p className="font-bold">Protocolo de Autoría Docente</p>
                  <p>Este texto será presentado específicamente a los **mentores** en el paso final de creación de cursos. Define la propiedad intelectual y responsabilidades académicas.</p>
                </div>
              </div>

              <Card className="card-prof p-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Editor de Términos de Creación
                    </Label>
                    {coursesConfig?.version && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Versión: v{coursesConfig.version}</span>
                    )}
                  </div>
                  <Textarea 
                    value={coursesContent}
                    onChange={(e) => setCoursesContent(e.target.value)}
                    placeholder="Propiedad intelectual, calidad de video, veracidad de contenidos..."
                    className="min-h-[400px] rounded-2xl bg-secondary/10 border-none font-medium p-8 leading-relaxed focus:bg-white transition-all"
                  />
                  <Button 
                    onClick={() => handleSave('courses')} 
                    disabled={loading || !coursesContent.trim()} 
                    className="w-full h-14 rounded-2xl font-bold bg-slate-900 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Publicar Términos Académicos
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl text-slate-600">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-medium">Al publicar una nueva versión, los usuarios verán la actualización de forma inmediata en sus respectivos flujos.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
