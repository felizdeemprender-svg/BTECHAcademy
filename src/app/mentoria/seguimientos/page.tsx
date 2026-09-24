
'use client';


import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  getDocs, 
  deleteDoc, 
  getCountFromServer, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SmartFilterBar } from '@/components/ui/smart-filter-bar';

// Hooks & Components
import { useFollowUps } from '@/hooks/useFollowUps';
import { useAllPrograms, useMentorPrograms } from '@/hooks/mentoring/use-mentor-programs';
import {
  createProgram,
  removeProgram,
  updateProgram,
} from '@/lib/api/mentoring-client';
import { FollowUpTable } from '@/components/followups/FollowUpTable';
import { FollowUpModals } from '@/components/followups/FollowUpModals';

export default function FollowUpsPage() {
  const { profile, user, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // Nueva arquitectura (flag): mentores vía /api por mentor, admins vía /api all.
  const isAdminProfile = profile?.roles?.includes('admin');
  const mentorProgramsApi = useMentorPrograms(isAdminProfile ? null : profile?.uid);
  const allProgramsApi = useAllPrograms(!!isAdminProfile);
  const programsApi = isAdminProfile ? allProgramsApi : mentorProgramsApi;

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Sin sesión');
    return user.getIdToken();
  }, [user]);

  // Hook centralizado para datos (legacy: solo cuando la nueva API está apagada)
  const {
    followUps: legacyFollowUps,
    isLoading: followUpsLoading,
    isAdmin,
    isMentor
  } = useFollowUps(!programsApi.enabled);

  const followUps: any[] = useMemo(() => {
    if (programsApi.enabled) {
      if (!programsApi.data) return [];
      return programsApi.data.map((s) => {
        const p: any = s.program;
        return {
          id: p.id,
          type: p.type,
          title: p.title,
          goal: p.goal,
          mentorId: p.mentorId,
          studentId: p.studentId,
          studentName: p.studentName,
          studentEmail: p.studentEmail,
          totalSessions: p.totalSessions,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          planGuideUrl: p.planGuideUrl,
          masterFileUrl: p.masterFileUrl,
        };
      });
    }
    return legacyFollowUps;
  }, [programsApi.enabled, programsApi.data, legacyFollowUps]);

  const listLoading = programsApi.enabled
    ? (programsApi.isLoading && !programsApi.data)
    : followUpsLoading;



  // Estados de UI
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [isManualInvite, setIsManualInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const [formData, setFormData] = useState<{
    type?: string;
    title: string;
    goal: string;
    studentId: string;
    totalSessions: number;
    startDate: string;
    endDate: string;
  }>({
    type: 'individual',
    title: '',
    goal: '',
    studentId: '',
    totalSessions: 4,
    startDate: '',
    endDate: ''
  });

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
  }, []);

  // Cargar estudiantes para mentores/admins
  useEffect(() => {
    if (!profile?.uid || (!isMentor && !isAdmin)) return;
    const fetchStudents = async () => {
      try {
        let enrollmentDocs: any[] = [];

        if (isAdmin) {
          const snap = await getDocs(collection(db, 'enrollments'));
          enrollmentDocs = snap.docs;
        } else {
          // 1. Obtener mis cursos
          const coursesQuery = query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
          const coursesSnap = await getDocs(coursesQuery);
          const myCourseIds = coursesSnap.docs.map(d => d.id);

          if (myCourseIds.length > 0) {
            // 2. Obtener inscripciones de esos cursos (en lotes de 10 para 'in' query si fuera necesario, pero simplificado aquí)
            // Nota: El operador 'in' soporta hasta 30 elementos.
            const enrollQuery = query(
              collection(db, 'enrollments'), 
              where('courseId', 'in', myCourseIds.slice(0, 30))
            );
            const enrollSnap = await getDocs(enrollQuery);
            enrollmentDocs = enrollSnap.docs;
          }
        }
        
        const studentMap = new Map();
        enrollmentDocs.forEach(d => {
          const data = d.data();
          if (data.studentEmail) {
            studentMap.set(data.studentEmail, {
              id: data.studentId || d.id,
              email: data.studentEmail,
              displayName: data.studentName || data.studentEmail
            });
          }
        });
        setStudents(Array.from(studentMap.values()));
      } catch (e) {
        console.error("Error fetching students:", e);
      }
    };
    fetchStudents();
  }, [db, profile?.uid, isMentor, isAdmin]);

  // Acciones
  // Subida de materiales a Storage (misma ruta y nombres que siempre).
  const uploadGuideFiles = async () => {
    let planGuideUrl: string | null = null;
    if (guideFile) {
      const guideRef = ref(storage, `followup_guides/${profile!.uid}/${Date.now()}_${guideFile.name}`);
      const uploadResult = await uploadBytes(guideRef, guideFile);
      planGuideUrl = await getDownloadURL(uploadResult.ref);
    }

    let masterFileUrl: string | null = null;
    if (masterFile && formData.type === 'group') {
      const masterRef = ref(storage, `followup_guides/${profile!.uid}/${Date.now()}_master_${masterFile.name}`);
      const uploadResult = await uploadBytes(masterRef, masterFile);
      masterFileUrl = await getDownloadURL(uploadResult.ref);
    }
    return { planGuideUrl, masterFileUrl };
  };

  const handleCreateFollowUp = async () => {
    setLoading(true);
    if (programsApi.enabled) {
      try {
        const { planGuideUrl, masterFileUrl } = await uploadGuideFiles();
        const student = isManualInvite
          ? undefined
          : students.find(s => s.id === formData.studentId);
        const { id } = await createProgram({
          mentorId: profile!.uid,
          type: formData.type === 'group' ? 'group' : 'individual',
          title: formData.title,
          goal: formData.goal,
          studentId: isManualInvite ? '' : (formData.studentId || ''),
          studentName: isManualInvite
            ? inviteEmail.toLowerCase().trim().split('@')[0]
            : (student?.displayName || 'Alumno'),
          studentEmail: isManualInvite
            ? inviteEmail.toLowerCase().trim()
            : (student?.email || ''),
          totalSessions: formData.totalSessions,
          startDate: formData.startDate,
          endDate: formData.endDate,
          planGuideUrl,
          masterFileUrl: formData.type === 'group' ? masterFileUrl : null,
        }, await getToken());
        toast({ title: 'Mentoría Creada' });
        setIsCreateOpen(false);
        router.push(`/seguimientos/${id}`);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error al crear mentoría', description: e instanceof Error ? e.message : undefined });
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      let finalStudentId = formData.studentId;
      let finalStudentName = '';
      let finalStudentEmail = '';

      if (isManualInvite) {
        finalStudentEmail = inviteEmail.toLowerCase().trim();
        finalStudentName = finalStudentEmail.split('@')[0];
        // Opcional: Crear registro de usuario fantasma si no existe
      } else {
        const student = students.find(s => s.id === formData.studentId);
        finalStudentId = student?.id;
        finalStudentName = student?.displayName || 'Alumno';
        finalStudentEmail = student?.email || '';
      }

      const { planGuideUrl, masterFileUrl } = await uploadGuideFiles();

      const followUpId = Math.random().toString(36).substring(2, 15);
      const followUpRef = doc(db, 'followups', followUpId);

      await setDoc(followUpRef, {
        id: followUpId,
        type: formData.type || 'individual',
        title: formData.title,
        goal: formData.goal,
        studentId: formData.type === 'group' ? '' : finalStudentId,
        studentName: formData.type === 'group' ? '' : finalStudentName,
        studentEmail: formData.type === 'group' ? '' : finalStudentEmail,
        totalSessions: formData.totalSessions,
        startDate: formData.startDate,
        endDate: formData.endDate,
        mentorId: profile?.uid,
        status: 'active',
        planGuideUrl,
        masterFileUrl: formData.type === 'group' ? masterFileUrl : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Crear sesiones iniciales
      for (let i = 0; i < formData.totalSessions; i++) {
        const sessionId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'followups', followUpId, 'sessions', sessionId), {
          id: sessionId,
          followUpId,
          orderIndex: i + 1,
          isCompleted: false,
          status: 'pending',
          topics: [],
          minutes: '',
          updatedAt: serverTimestamp()
        });
      }

      toast({ title: 'Mentoría Creada' });
      setIsCreateOpen(false);
      router.push(`/seguimientos/${followUpId}`);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al crear mentoría' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return;
    setLoading(true);
    if (programsApi.enabled) {
      try {
        const uploaded = await uploadGuideFiles();
        await updateProgram(selectedFollowUp.id, await getToken(), {
          title: formData.title,
          goal: formData.goal,
          startDate: formData.startDate,
          endDate: formData.endDate,
          planGuideUrl: guideFile ? uploaded.planGuideUrl : selectedFollowUp.planGuideUrl,
          ...(formData.type === 'group'
            ? { masterFileUrl: masterFile ? uploaded.masterFileUrl : selectedFollowUp.masterFileUrl }
            : {}),
        });
        toast({ title: 'Mentoría Actualizada' });
        setIsEditOpen(false);
        await programsApi.refetch();
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error al actualizar', description: e instanceof Error ? e.message : undefined });
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const uploaded = await uploadGuideFiles();
      const planGuideUrl = guideFile ? uploaded.planGuideUrl : selectedFollowUp.planGuideUrl;
      const masterFileUrl = (masterFile && formData.type === 'group')
        ? uploaded.masterFileUrl
        : selectedFollowUp.masterFileUrl;

      const updateData: any = {
        title: formData.title,
        goal: formData.goal,
        startDate: formData.startDate,
        endDate: formData.endDate,
        planGuideUrl,
        updatedAt: serverTimestamp()
      };

      if (formData.type === 'group') {
        updateData.masterFileUrl = masterFileUrl;
      }

      await updateDoc(doc(db, 'followups', selectedFollowUp.id), updateData);

      toast({ title: 'Mentoría Actualizada' });
      setIsEditOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (f: any) => {
    const newStatus = f.status === 'suspended' ? 'active' : 'suspended';
    if (programsApi.enabled) {
      try {
        await updateProgram(f.id, await getToken(), { status: newStatus });
        toast({ title: 'Estado actualizado' });
        await programsApi.refetch();
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error al cambiar estado', description: e instanceof Error ? e.message : undefined });
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'followups', f.id), { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: 'Estado actualizado' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar estado' });
    }
  };

  const handleDeleteFollowUp = async () => {
    if (!selectedFollowUp) return;
    setLoading(true);
    if (programsApi.enabled) {
      try {
        await removeProgram(selectedFollowUp.id, await getToken());
        toast({ title: 'Mentoría Eliminada' });
        setIsDeleteOpen(false);
        await programsApi.refetch();
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error al eliminar', description: e instanceof Error ? e.message : undefined });
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const snap = await getCountFromServer(collection(db, 'followups', selectedFollowUp.id, 'tasks'));
      if (snap.data().count > 0) {
        toast({ variant: 'destructive', title: 'Acción Bloqueada', description: 'Existen tareas registradas.' });
        return;
      }
      
      // Borrar sesiones (simplificado)
      const sessionsSnap = await getDocs(collection(db, 'followups', selectedFollowUp.id, 'sessions'));
      await Promise.all(sessionsSnap.docs.map(s => deleteDoc(s.ref)));
      await deleteDoc(doc(db, 'followups', selectedFollowUp.id));
      
      toast({ title: 'Mentoría Eliminada' });
      setIsDeleteOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowUps = followUps.filter(f => 
    f.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isAuthLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Sincronizando Accesos...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Programas de Mentoría</h1>
            <p className="text-muted-foreground text-lg font-medium">Gestión de sesiones personalizadas y objetivos estratégicos.</p>
          </div>
          {(isMentor || isAdmin) && (
            <Button onClick={() => {
              setFormData({ title: '', goal: '', studentId: '', totalSessions: 4, startDate: '', endDate: '' });
              setIsCreateOpen(true);
            }} className="h-12 px-8 rounded-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nueva Mentoría
            </Button>
          )}
        </header>

        <SmartFilterBar 
          placeholder="Buscar por programa o alumno..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        {programsApi.enabled && programsApi.error && (
          <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 text-sm font-medium text-danger flex items-center justify-between gap-4">
            <span>Error al cargar mentorías: {programsApi.error}</span>
            <Button variant="link" onClick={() => programsApi.refetch()} className="font-bold shrink-0">Reintentar</Button>
          </div>
        )}

        <Card className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <CardContent className="p-0">
            <FollowUpTable
              followUps={filteredFollowUps}
              isLoading={listLoading}
              isAdmin={isAdmin}
              isMentor={isMentor}
              onEdit={(f) => {
                setSelectedFollowUp(f);
                setFormData({ ...f });
                setIsEditOpen(true);
              }}
              onToggleStatus={handleToggleStatus}
              onDelete={(f) => {
                setSelectedFollowUp(f);
                setIsDeleteOpen(true);
              }}
            />
          </CardContent>
        </Card>

        <FollowUpModals 
          isCreateOpen={isCreateOpen} setIsCreateOpen={setIsCreateOpen}
          isEditOpen={isEditOpen} setIsEditOpen={setIsEditOpen}
          isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
          formData={formData} setFormData={setFormData}
          students={students}
          isManualInvite={isManualInvite} setIsManualInvite={setIsManualInvite}
          inviteEmail={inviteEmail} setInviteEmail={setInviteEmail}
          guideFile={guideFile} setGuideFile={setGuideFile}
          masterFile={masterFile} setMasterFile={setMasterFile}
          loading={loading}
          onCreate={handleCreateFollowUp}
          onUpdate={handleUpdateFollowUp}
          onDelete={handleDeleteFollowUp}
          selectedFollowUp={selectedFollowUp}
        />
      </div>
    </DashboardLayout>
  );
}
