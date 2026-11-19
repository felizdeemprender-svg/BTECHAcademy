
'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, or } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, Mail, Globe, BookOpen, ChevronRight, UserCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SmartFilterBar } from '@/components/ui/smart-filter-bar';
import { isCompanyTutorProfile } from '@/domain/company';
import { CorporateRestrictionNotice } from '@/components/company/corporate-restriction-notice';

export default function AlumnosPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');
  const [coursesList, setCoursesList] = useState<{ id: string; title: string; mentorId?: string }[]>([]);
  const [tutorsMap, setTutorsMap] = useState<Record<string, { id: string; name: string; email?: string }>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = Boolean(profile?.roles?.includes('admin'));
  const isMentor = Boolean(profile?.roles?.includes('mentor') || profile?.isMentor);
  const isEmpresa = Boolean(profile?.roles?.includes('empresa') || profile?.companyRole === 'owner');
  const hasAccess = isAdmin || isMentor || isEmpresa;

  useEffect(() => {
    if (!profile?.uid || !hasAccess) return;

    const fetchStudents = async () => {
      setLoading(true);
      try {
        let coursesDocs: any[] = [];
        let enrollments: any[] = [];
        
        if (isAdmin) {
          const [coursesSnap, enrollSnap] = await Promise.all([
            getDocs(collection(db, 'courses')),
            getDocs(collection(db, 'enrollments'))
          ]);
          coursesDocs = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          enrollments = enrollSnap.docs.map(d => d.data());
        } else if (isEmpresa) {
          const companyId = profile.companyId || profile.uid;
          const coursesSnap = await getDocs(
            query(
              collection(db, 'courses'),
              or(
                where('mentorId', '==', profile.uid),
                where('companyId', '==', companyId)
              )
            )
          );
          coursesDocs = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const courseIds = coursesDocs.map(c => c.id);
          
          if (courseIds.length > 0) {
            for (let i = 0; i < courseIds.length; i += 30) {
              const chunk = courseIds.slice(i, i + 30);
              const snap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', chunk)));
              enrollments = [...enrollments, ...snap.docs.map(d => d.data())];
            }
          }
        } else {
          const coursesSnap = await getDocs(query(collection(db, 'courses'), where('mentorId', '==', profile.uid)));
          coursesDocs = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const courseIds = coursesDocs.map(c => c.id);
          
          if (courseIds.length > 0) {
            for (let i = 0; i < courseIds.length; i += 30) {
              const chunk = courseIds.slice(i, i + 30);
              const snap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', chunk)));
              enrollments = [...enrollments, ...snap.docs.map(d => d.data())];
            }
          }
        }

        // Mapeo de cursos y extracción de tutores
        const courseMap = new Map<string, { id: string; title: string; mentorId?: string }>();
        coursesDocs.forEach(c => {
          courseMap.set(c.id, {
            id: c.id,
            title: c.title || 'Curso sin título',
            mentorId: c.mentorId
          });
        });
        setCoursesList(Array.from(courseMap.values()).sort((a, b) => a.title.localeCompare(b.title)));

        if (isAdmin) {
          const uniqueMentorIds = Array.from(new Set(coursesDocs.map(c => c.mentorId).filter(Boolean))) as string[];
          const tutors: Record<string, { id: string; name: string; email?: string }> = {};
          await Promise.all(
            uniqueMentorIds.map(async (id) => {
              try {
                const uSnap = await getDoc(doc(db, 'users', id));
                if (uSnap.exists()) {
                  const uData = uSnap.data();
                  tutors[id] = {
                    id,
                    name: uData.displayName || uData.profile?.displayName || uData.name || uData.email || id,
                    email: uData.email || ''
                  };
                  return;
                }
              } catch (err) {
                console.error('Error al cargar tutor:', err);
              }
              tutors[id] = { id, name: `Tutor (${id.slice(0, 6)})`, email: '' };
            })
          );
          setTutorsMap(tutors);
        }

        // Consolidación por Email para evitar duplicados entre IDs de invitación y UIDs reales
        const studentMap = new Map();
        for (const enroll of enrollments) {
          const email = enroll.inviteEmail?.toLowerCase().trim();
          if (!email) continue;

          const studentId = enroll.studentId ?? '';
          const courseId = enroll.courseId;
          const courseInfo = courseId ? courseMap.get(courseId) : null;
          const mentorId = enroll.mentorId || courseInfo?.mentorId;

          if (!studentMap.has(email)) {
            studentMap.set(email, {
              id: studentId,
              name: enroll.studentName,
              email: email,
              courseIds: new Set(courseId ? [courseId] : []),
              mentorIds: new Set(mentorId ? [mentorId] : []),
              status: enroll.status
            });
          } else {
            const existing = studentMap.get(email);
            if (courseId) existing.courseIds.add(courseId);
            if (mentorId) existing.mentorIds.add(mentorId);
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
          courseIds: s.courseIds,
          mentorIds: s.mentorIds,
          coursesCount: s.courseIds.size
        }));
        
        const finalStudents = (await Promise.all(studentList.map(async (s) => {
          // Solo listamos alumnos reales (con UID de Firebase válido)
          if (s.id && !s.id.includes('_') && !s.id.includes('@')) {
            try {
              const profileSnap = await getDoc(doc(db, 'users', s.id));
              if (profileSnap.exists()) {
                const pData = profileSnap.data();
                return { 
                  ...s,
                  displayName: pData.displayName,
                  photoURL: pData.photoURL
                };
              }
            } catch (e) {
              console.warn(`Error al cargar perfil de ${s.id}:`, e);
            }
          }
          return null; // Ocultamos invitaciones sin loguear de la vista del tutor
        }))).filter(Boolean);

        finalStudents.sort((a, b) => (a?.displayName || '').localeCompare(b?.displayName || ''));
        setStudents(finalStudents as any[]);
      } catch (e) {
        console.error("Error fetching students:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [db, profile, isAdmin, isMentor, hasAccess]);

  // Cursos disponibles para el dropdown (si admin seleccionó un mentor, acotar cursos a ese mentor)
  const availableCourses = useMemo(() => {
    if (isAdmin && mentorFilter !== 'all') {
      return coursesList.filter(c => c.mentorId === mentorFilter);
    }
    return coursesList;
  }, [coursesList, isAdmin, mentorFilter]);

  // Lista de tutores ordenada alfabéticamente
  const tutorOptions = useMemo(() => {
    return Object.values(tutorsMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [tutorsMap]);

  const handleMentorChange = (newMentorId: string) => {
    setMentorFilter(newMentorId);
    if (newMentorId !== 'all' && courseFilter !== 'all') {
      const selectedCourse = coursesList.find(c => c.id === courseFilter);
      if (selectedCourse && selectedCourse.mentorId !== newMentorId) {
        setCourseFilter('all');
      }
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || 
        s.displayName?.toLowerCase().includes(term) || 
        s.email?.toLowerCase().includes(term);

      const matchesCourse = courseFilter === 'all' || (s.courseIds && s.courseIds.has(courseFilter));

      const matchesMentor = !isAdmin || mentorFilter === 'all' || (s.mentorIds && s.mentorIds.has(mentorFilter));

      return matchesSearch && matchesCourse && matchesMentor;
    });
  }, [students, searchTerm, courseFilter, mentorFilter, isAdmin]);

  if (isCompanyTutorProfile(profile) && !profile?.mentorPermissions?.includes('students_view')) {
    return (
      <DashboardLayout>
        <CorporateRestrictionNotice
          feature="Gestión de Alumnos"
          description="Tu empresa no ha activado la potestad de gestión o visualización de expedientes de alumnos para tu cuenta."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Comunidad de Alumnos</h1>
            <p className="text-muted-foreground text-lg font-medium">Listado consolidado de estudiantes bajo tu tutela.</p>
          </div>
        </header>

        <div className="flex flex-row items-center gap-2.5 bg-secondary/10 p-2.5 rounded-xl border border-border overflow-x-auto">
          {/* Búsqueda por texto */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o email de alumno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-border shadow-xs h-10 font-medium"
            />
          </div>

          {/* Filtro por curso (visible para todos) */}
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-10 w-[200px] shrink-0 bg-white border-border text-xs font-bold shadow-xs">
              <SelectValue placeholder="Todos los cursos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cursos</SelectItem>
              {availableCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por mentor (SOLO si es administrador) */}
          {isAdmin && (
            <Select value={mentorFilter} onValueChange={handleMentorChange}>
              <SelectTrigger className="h-10 w-[200px] shrink-0 bg-white border-border text-xs font-bold shadow-xs">
                <SelectValue placeholder="Filtrar por mentor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los mentores</SelectItem>
                {tutorOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botón limpiar filtros */}
          {(searchTerm !== '' || courseFilter !== 'all' || (isAdmin && mentorFilter !== 'all')) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setCourseFilter('all');
                if (isAdmin) setMentorFilter('all');
              }}
              className="h-10 shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground gap-1 px-3"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>

        <Card className="rounded-lg overflow-hidden bg-white/50 backdrop-blur-xl">
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
                        student.status === 'active' ? "bg-success/15 text-success" : "bg-warn/15 text-warn"
                      )}>
                        {student.status === 'active' ? 'Acceso OK' : 'Pendiente / Bloqueado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-10 text-right">
                      <Button 
                        onClick={() => router.push(`/mentoria/alumnos/${student.id}`)}
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
