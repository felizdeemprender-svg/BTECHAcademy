
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, Mail, Globe, BookOpen, ChevronRight, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SmartFilterBar } from '@/components/ui/smart-filter-bar';

export default function AlumnosPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.roles.includes('admin');
  const isMentor = profile?.roles.includes('mentor');

  useEffect(() => {
    if (!profile?.uid || (!isMentor && !isAdmin)) return;

    const fetchStudents = async () => {
      setLoading(true);
      try {
        let enrollments: any[] = [];
        
        if (isAdmin) {
          const snap = await getDocs(collection(db, 'enrollments'));
          enrollments = snap.docs.map(d => d.data());
        } else {
          const coursesSnap = await getDocs(query(collection(db, 'courses'), where('mentorId', '==', profile.uid)));
          const courseIds = coursesSnap.docs.map(d => d.id);
          
          if (courseIds.length > 0) {
            for (let i = 0; i < courseIds.length; i += 30) {
              const chunk = courseIds.slice(i, i + 30);
              const snap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', chunk)));
              enrollments = [...enrollments, ...snap.docs.map(d => d.data())];
            }
          }
        }

        // Consolidación por Email para evitar duplicados entre IDs de invitación y UIDs reales
        const studentMap = new Map();
        for (const enroll of enrollments) {
          const email = enroll.inviteEmail?.toLowerCase().trim();
          if (!email) continue;

          const studentId = enroll.studentId ?? '';

          if (!studentMap.has(email)) {
            studentMap.set(email, {
              id: studentId,
              name: enroll.studentName,
              email: email,
              courseIds: new Set([enroll.courseId]),
              status: enroll.status
            });
          } else {
            const existing = studentMap.get(email);
            existing.courseIds.add(enroll.courseId);
            if (enroll.status === 'active') existing.status = 'active';
            
            // Si el registro actual tiene un UID real (sin guiones bajos de invitación), actualizamos el ID de referencia
            const currentId = studentId;
            const existingId = existing.id ?? '';
            const isExistingTemp = existingId.includes('_') || existingId.includes('@');
            const isCurrentReal = currentId.length > 0 && !currentId.includes('_') && !currentId.includes('@');
            
            if (isExistingTemp && isCurrentReal) {
              existing.id = currentId;
            }
          }
        }

        const studentList = Array.from(studentMap.values()).map(s => ({
          ...s,
          coursesCount: s.courseIds.size
        }));
        
        const finalStudents = await Promise.all(studentList.map(async (s) => {
          // Solo consultamos Firestore si tenemos un ID real (no vacío, no temporal)
          if (s.id && !s.id.includes('_') && !s.id.includes('@')) {
            try {
              const profileSnap = await getDoc(doc(db, 'users', s.id));
              if (profileSnap.exists()) {
                const pData = profileSnap.data();
                return { 
                  ...s, 
                  photoURL: pData.photoURL, 
                  signInProvider: pData.signInProvider,
                  displayName: pData.displayName || s.name
                };
              }
            } catch (_) {
              // Ignorar errores de perfil individual
            }
          }
          return s;
        }));

        finalStudents.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setStudents(finalStudents);
      } catch (e) {
        console.error("Error fetching students:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [db, profile, isAdmin, isMentor]);

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Comunidad de Alumnos</h1>
            <p className="text-muted-foreground text-lg font-medium">Listado consolidado de estudiantes bajo tu tutela.</p>
          </div>
        </header>

        <SmartFilterBar 
          placeholder="Buscar por nombre o email de alumno..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Estudiante</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Inscripciones</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Estado General</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center animate-pulse font-bold text-muted-foreground">Sincronizando comunidad académica...</TableCell></TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center italic text-muted-foreground">No se encontraron alumnos en tus registros.</TableCell></TableRow>
                ) : filteredStudents.map((student) => (
                  <TableRow key={student.email} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={student.photoURL || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.displayName?.[0] || student.email?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-lg">{student.displayName || 'Alumno Institucional'}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> {student.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="rounded-lg h-7 gap-1.5 font-bold border-primary/20 text-primary">
                        <BookOpen className="h-3 w-3" /> {student.coursesCount} {student.coursesCount === 1 ? 'Curso' : 'Cursos'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "px-3 py-1 border-none font-bold text-[10px] uppercase tracking-wider",
                        student.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {student.status === 'active' ? 'Acceso OK' : 'Pendiente / Bloqueado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <Button 
                        onClick={() => router.push(`/alumnos/${student.id}`)}
                        variant="ghost" 
                        className="rounded-xl font-bold text-primary gap-2 hover:bg-primary/10"
                      >
                        <UserCircle className="h-4 w-4" /> Expediente <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
