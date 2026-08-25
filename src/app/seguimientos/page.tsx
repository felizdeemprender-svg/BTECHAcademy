
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
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
import { FollowUpTable } from '@/components/followups/FollowUpTable';
import { FollowUpModals } from '@/components/followups/FollowUpModals';

export default function FollowUpsPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // Hook centralizado para datos
  const { 
    followUps, 
    isLoading: followUpsLoading, 
    isAdmin, 
    isMentor 
  } = useFollowUps();

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

  // Estados de UI
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [isManualInvite, setIsManualInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const [formData, setFormData] = useState({
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
  const handleCreateFollowUp = async () => {
    setLoading(true);
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

      let planGuideUrl = null;
      if (guideFile) {
        const guideRef = ref(storage, `followup_guides/${profile!.uid}/${Date.now()}_${guideFile.name}`);
        const uploadResult = await uploadBytes(guideRef, guideFile);
        planGuideUrl = await getDownloadURL(uploadResult.ref);
      }

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
        masterFileUrl: formData.type === 'group' ? planGuideUrl : null, // Reusamos el uploader de planGuide
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

      toast({ title: 'Seguimiento Creado' });
      setIsCreateOpen(false);
      router.push(`/seguimientos/${followUpId}`);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al crear seguimiento' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return;
    setLoading(true);
    try {
      let planGuideUrl = selectedFollowUp.planGuideUrl;
      if (guideFile) {
        const guideRef = ref(storage, `followup_guides/${profile!.uid}/${Date.now()}_${guideFile.name}`);
        const uploadResult = await uploadBytes(guideRef, guideFile);
        planGuideUrl = await getDownloadURL(uploadResult.ref);
      }

      await updateDoc(doc(db, 'followups', selectedFollowUp.id), {
        title: formData.title,
        goal: formData.goal,
        startDate: formData.startDate,
        endDate: formData.endDate,
        planGuideUrl,
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Seguimiento Actualizado' });
      setIsEditOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (f: any) => {
    const newStatus = f.status === 'suspended' ? 'active' : 'suspended';
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
      
      toast({ title: 'Seguimiento Eliminado' });
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

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Seguimientos Académicos</h1>
            <p className="text-muted-foreground text-lg font-medium">Gestión de sesiones personalizadas y objetivos estratégicos.</p>
          </div>
          {(isMentor || isAdmin) && (
            <Button onClick={() => {
              setFormData({ title: '', goal: '', studentId: '', totalSessions: 4, startDate: '', endDate: '' });
              setIsCreateOpen(true);
            }} className="h-12 px-8 rounded-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nuevo Seguimiento
            </Button>
          )}
        </header>

        <SmartFilterBar 
          placeholder="Buscar por programa o alumno..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <Card className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <CardContent className="p-0">
            <FollowUpTable 
              followUps={filteredFollowUps}
              isLoading={followUpsLoading}
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
