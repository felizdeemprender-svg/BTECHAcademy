'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Megaphone,
  Loader2,
  Mail,
  CheckCircle2,
  Trash2,
  Settings2,
  Video,
  Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyTutor {
  tutorId: string;
  email: string;
  displayName: string;
  status: 'active' | 'invited' | 'suspended';
  roles?: ('mentor' | 'marketing')[];
  permissions: {
    canCreateCourses: boolean;
    canCreatePrograms: boolean;
    canManageStudents: boolean;
    canAccessMarketing: boolean;
    canCreateCampaigns?: boolean;
    canCreateVideos?: boolean;
  };
  assignedStudentsCount: number;
  joinedAt: string;
}

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: 'active' | 'suspended' | 'trial';
  limits: {
    maxTutors: number;
    maxStudents: number;
  };
  usage: {
    currentTutors: number;
    currentStudents: number;
  };
  tutors: CompanyTutor[];
}

export default function CompanyTutorsPage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<CompanyTutor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  // Formulario alta tutor
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoles, setInviteRoles] = useState<('mentor' | 'marketing')[]>(['mentor']);
  const [invitePermissions, setInvitePermissions] = useState({
    canCreateCourses: true,
    canCreatePrograms: true,
    canManageStudents: true,
    canAccessMarketing: false,
    canCreateCampaigns: false,
    canCreateVideos: false,
  });

  const isAdmin = profile?.roles?.includes('admin');
  const isEmpresa = profile?.roles?.includes('empresa') || profile?.companyRole === 'owner' || Boolean(profile?.isEnterprise);
  const hasAccess = isAdmin || isEmpresa;

  const fetchCompany = useCallback(async () => {
    if (!profile?.uid || !hasAccess || !user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      const companyPayload = data.company || data.data;
      if (res.ok && companyPayload) {
        setCompany(companyPayload);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de carga',
          description: data.error || 'No se pudo cargar la información de la empresa.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error de red',
        description: 'No se pudo conectar con el servidor corporativo.',
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.uid, hasAccess, user, toast]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleInviteTutor = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'Ingresa el nombre y correo del tutor.',
      });
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@gmail.com') && !normalizedEmail.endsWith('@googlemail.com')) {
      toast({
        variant: 'destructive',
        title: 'Dominio Google requerido',
        description: 'La plataforma opera exclusivamente sobre el ecosistema Google. Debes ingresar un correo @gmail.com.',
      });
      return;
    }

    if (inviteRoles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Rol requerido',
        description: 'Debes asignar al menos un rol institucional (Mentor o Marketing).',
      });
      return;
    }

    if (!company) return;

    if (company.usage.currentTutors >= company.limits.maxTutors) {
      toast({
        variant: 'destructive',
        title: 'Límite alcanzado',
        description: `Has alcanzado el cupo máximo de ${company.limits.maxTutors} tutores contratados.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const hasMentor = inviteRoles.includes('mentor');
      const hasMarketing = inviteRoles.includes('marketing');

      const res = await fetch('/api/company/tutors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tutorId: inviteEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: inviteEmail.trim().toLowerCase(),
          displayName: inviteName.trim(),
          roles: inviteRoles,
          permissions: {
            canCreateCourses: hasMentor ? Boolean(invitePermissions.canCreateCourses) : false,
            canCreatePrograms: hasMentor ? Boolean(invitePermissions.canCreatePrograms) : false,
            canManageStudents: hasMentor ? Boolean(invitePermissions.canManageStudents) : false,
            canAccessMarketing: hasMarketing ? Boolean(invitePermissions.canAccessMarketing) : false,
            canCreateCampaigns: hasMarketing ? Boolean(invitePermissions.canCreateCampaigns) : false,
            canCreateVideos: hasMarketing ? Boolean(invitePermissions.canCreateVideos) : false,
          },
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Tutor vinculado',
          description: `Se vinculó exitosamente a ${inviteName} en la empresa.`,
        });
        setIsInviteOpen(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRoles(['mentor']);
        setInvitePermissions({
          canCreateCourses: true,
          canCreatePrograms: true,
          canManageStudents: true,
          canAccessMarketing: false,
          canCreateCampaigns: false,
          canCreateVideos: false,
        });
        fetchCompany();
      } else {
        toast({
          variant: 'destructive',
          title: res.status === 409 ? 'Docente no disponible' : 'Error al vincular',
          description: data.error || 'No se pudo vincular al tutor.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error de red',
        description: 'Fallo al procesar la vinculación.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedTutor) return;
    const tutorRoles = selectedTutor.roles && selectedTutor.roles.length > 0 ? selectedTutor.roles : ['mentor'];
    if (tutorRoles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Rol requerido',
        description: 'El tutor debe tener al menos un rol asignado (Mentor o Marketing).',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const hasMentor = tutorRoles.includes('mentor');
      const hasMarketing = tutorRoles.includes('marketing');

      const res = await fetch(`/api/company/tutors/${selectedTutor.tutorId}/permissions`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          roles: tutorRoles,
          permissions: {
            canCreateCourses: hasMentor ? Boolean(selectedTutor.permissions.canCreateCourses) : false,
            canCreatePrograms: hasMentor ? Boolean(selectedTutor.permissions.canCreatePrograms) : false,
            canManageStudents: hasMentor ? Boolean(selectedTutor.permissions.canManageStudents) : false,
            canAccessMarketing: hasMarketing ? Boolean(selectedTutor.permissions.canAccessMarketing) : false,
            canCreateCampaigns: hasMarketing ? Boolean(selectedTutor.permissions.canCreateCampaigns) : false,
            canCreateVideos: hasMarketing ? Boolean(selectedTutor.permissions.canCreateVideos) : false,
          },
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Permisos actualizados',
          description: `Permisos de ${selectedTutor.displayName} actualizados correctamente.`,
        });
        setIsEditPermissionsOpen(false);
        setSelectedTutor(null);
        fetchCompany();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al actualizar',
          description: data.error || 'No se pudieron actualizar los permisos.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error de red',
        description: 'Fallo de conexión al actualizar permisos.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTutorStatus = async (tutor: CompanyTutor) => {
    const nextStatus: 'active' | 'suspended' = tutor.status === 'active' ? 'suspended' : 'active';
    const actionLabel = nextStatus === 'active' ? 'habilitar' : 'inhabilitar';

    setIsTogglingStatus(tutor.tutorId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/company/tutors/${tutor.tutorId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: nextStatus === 'active' ? 'Tutor habilitado' : 'Tutor inhabilitado',
          description: `El estado de ${tutor.displayName} fue actualizado a ${nextStatus === 'active' ? 'Activo' : 'Suspendido'}.`,
        });
        fetchCompany();
      } else {
        toast({
          variant: 'destructive',
          title: `Error al ${actionLabel}`,
          description: data.error || `No se pudo ${actionLabel} al tutor.`,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error de red',
        description: 'Fallo de conexión al actualizar el estado del tutor.',
      });
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleRemoveTutor = async (tutor: CompanyTutor) => {
    if (!confirm(`¿Estás seguro de desvincular al tutor ${tutor.displayName}?`)) return;

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/company/tutors/${tutor.tutorId}/permissions`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Tutor desvinculado',
          description: `${tutor.displayName} fue retirado de la empresa.`,
        });
        fetchCompany();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al desvincular',
          description: data.error || 'No se pudo retirar al tutor.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error de red',
        description: 'Fallo de conexión.',
      });
    }
  };

  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Acceso Corporativo Requerido</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            Esta sección está reservada para cuentas con rol Empresa titular o Administradores de la plataforma.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const tutorsList = company?.tutors || [];
  const filteredTutors = tutorsList.filter((t) =>
    t.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tutorsCount = company?.usage?.currentTutors ?? 0;
  const maxTutors = company?.limits?.maxTutors ?? 0;
  const studentsCount = company?.usage?.currentStudents ?? 0;
  const maxStudents = company?.limits?.maxStudents ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Tutores de la Empresa</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {company ? `Entidad: ${company.name}` : 'Gestión de docentes corporativos y asignación de potestades.'}
            </p>
          </div>
          <Button
            onClick={() => setIsInviteOpen(true)}
            disabled={company ? tutorsCount >= maxTutors : false}
            className="gap-2 font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Vincular Tutor
          </Button>
        </div>

        {/* Tarjetas de Capacidad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Tutores Vinculados</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-foreground">{tutorsCount}</span>
                  <span className="text-xs text-muted-foreground">de {maxTutors} contratados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Alumnos de la Empresa</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-foreground">{studentsCount}</span>
                  <span className="text-xs text-muted-foreground">de {maxStudents} contratados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Abono Corporativo</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <Badge variant="outline" className="font-bold border-success text-success bg-success/10">
                    {company?.status === 'active' ? 'Activo' : company?.status || 'Empresa'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buscador */}
        <div className="max-w-md">
          <Input
            placeholder="Buscar tutor por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        {/* Tabla de Tutores */}
        <Card className="border border-border overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border">
                  <TableHead className="py-3 px-6 text-xs uppercase tracking-wider font-bold">Docente</TableHead>
                  <TableHead className="py-3 text-xs uppercase tracking-wider font-bold text-center">Estado</TableHead>
                  <TableHead className="py-3 text-xs uppercase tracking-wider font-bold text-center">Alumnos</TableHead>
                  <TableHead className="py-3 text-xs uppercase tracking-wider font-bold">Potestades Habilitadas</TableHead>
                  <TableHead className="py-3 px-6 text-xs uppercase tracking-wider font-bold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Cargando tutores corporativos...
                    </TableCell>
                  </TableRow>
                ) : filteredTutors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground italic">
                      {searchTerm ? 'No se encontraron tutores coincidentes.' : 'Aún no tienes tutores vinculados. Haz clic en "Vincular Tutor" para comenzar.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTutors.map((tutor) => (
                    <TableRow key={tutor.tutorId} className="border-b border-border/50 hover:bg-muted/20">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src="" />
                            <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                              {tutor.displayName?.[0] || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-foreground">{tutor.displayName}</p>
                              {(tutor.roles && tutor.roles.length > 0 ? tutor.roles : ['mentor']).map((r) => (
                                <Badge
                                  key={r}
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0 h-4 uppercase",
                                    r === 'mentor' ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"
                                  )}
                                >
                                  {r === 'mentor' ? 'Mentor' : 'Marketing'}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {tutor.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold uppercase px-2 py-0.5',
                              tutor.status === 'active' && 'border-success/30 text-success bg-success/10',
                              tutor.status === 'invited' && 'border-warn/30 text-warn bg-warn/10',
                              tutor.status === 'suspended' && 'border-destructive/30 text-destructive bg-destructive/10'
                            )}
                          >
                            {tutor.status === 'active' ? 'Activo' : tutor.status === 'invited' ? 'Invitado' : 'Inhabilitado'}
                          </Badge>
                          <div className="flex items-center gap-1" title={tutor.status === 'active' ? 'Click para inhabilitar tutor' : 'Click para habilitar tutor'}>
                            {isTogglingStatus === tutor.tutorId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={tutor.status === 'active'}
                                onCheckedChange={() => handleToggleTutorStatus(tutor)}
                                className="scale-75 data-[state=checked]:bg-success"
                              />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-sm text-foreground">{tutor.assignedStudentsCount}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {tutor.permissions.canCreateCourses && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                              <BookOpen className="h-2.5 w-2.5" /> Cursos
                            </Badge>
                          )}
                          {tutor.permissions.canCreatePrograms && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                              <GraduationCap className="h-2.5 w-2.5" /> Programas
                            </Badge>
                          )}
                          {tutor.permissions.canManageStudents && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                              <Users className="h-2.5 w-2.5" /> Alumnos
                            </Badge>
                          )}
                          {tutor.permissions.canCreateCampaigns && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                              <Megaphone className="h-2.5 w-2.5" /> Campañas
                            </Badge>
                          )}
                          {tutor.permissions.canCreateVideos && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                              <Video className="h-2.5 w-2.5" /> Videos IA
                            </Badge>
                          )}
                          {tutor.permissions.canAccessMarketing && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                              <Mail className="h-2.5 w-2.5" /> Marketing
                            </Badge>
                          )}
                          {!tutor.permissions.canCreateCourses &&
                            !tutor.permissions.canCreatePrograms &&
                            !tutor.permissions.canManageStudents &&
                            !tutor.permissions.canAccessMarketing &&
                            !tutor.permissions.canCreateCampaigns &&
                            !tutor.permissions.canCreateVideos && (
                              <span className="text-xs text-muted-foreground italic">Sin permisos activos</span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleTutorStatus(tutor)}
                            disabled={isTogglingStatus === tutor.tutorId}
                            title={tutor.status === 'active' ? 'Inhabilitar tutor' : 'Habilitar tutor'}
                            className={cn(
                              "h-8 gap-1 text-xs font-semibold",
                              tutor.status === 'active' 
                                ? "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                                : "text-success hover:bg-success/10"
                            )}
                          >
                            {isTogglingStatus === tutor.tutorId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {tutor.status === 'active' ? 'Inhabilitar' : 'Habilitar'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTutor({
                                ...tutor,
                                roles: tutor.roles && tutor.roles.length > 0 ? tutor.roles : ['mentor']
                              });
                              setIsEditPermissionsOpen(true);
                            }}
                            className="h-8 gap-1 text-xs"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Permisos
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTutor(tutor)}
                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Desvincular tutor"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Vincular Tutor */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Vincular Tutor a la Empresa</DialogTitle>
            <DialogDescription>
              Asocia un docente a la cuenta corporativa. El docente podrá operar bajo tu abono y supervisión.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Requisitos de Vinculación Corporativa</span>
              </div>
              <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-0.5">
                <li>Solo se admiten cuentas con dominio Google (<strong>@gmail.com</strong>).</li>
                <li>Por exclusividad empresarial, no debe estar registrado previamente en la plataforma ni en otra empresa.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-name" className="text-xs font-bold">Nombre del Tutor</Label>
              <Input
                id="tutor-name"
                placeholder="Ej: Laura Méndez"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tutor-email" className="text-xs font-bold">Correo Electrónico (Google @gmail.com)</Label>
              <Input
                id="tutor-email"
                type="email"
                placeholder="docente@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            {/* Selección de Roles Principales */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roles a Asignar</Label>
                <span className="text-[10px] text-muted-foreground">Mínimo 1 rol</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const exists = inviteRoles.includes('mentor');
                    if (exists && inviteRoles.length === 1) return;
                    setInviteRoles(exists ? inviteRoles.filter(r => r !== 'mentor') : [...inviteRoles, 'mentor']);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                    inviteRoles.includes('mentor')
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <GraduationCap className="h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold leading-tight">Mentor</p>
                    <p className="text-[10px] text-muted-foreground">Académico & Cursos</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exists = inviteRoles.includes('marketing');
                    if (exists && inviteRoles.length === 1) return;
                    setInviteRoles(exists ? inviteRoles.filter(r => r !== 'marketing') : [...inviteRoles, 'marketing']);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                    inviteRoles.includes('marketing')
                      ? "bg-primary/10 border-primary/30 text-primary ring-1 ring-primary/20"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-bold leading-tight">Marketing</p>
                    <p className="text-[10px] text-muted-foreground">Crecimiento & Videos</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Capacidades Académicas (Mentor) */}
            {inviteRoles.includes('mentor') && (
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-bold text-primary uppercase tracking-wider">Capacidades Académicas (Mentor)</Label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Creación de Cursos</p>
                    <p className="text-xs text-muted-foreground">Permite armar módulos y lecciones en borrador.</p>
                  </div>
                  <Switch
                    checked={invitePermissions.canCreateCourses}
                    onCheckedChange={(v) => setInvitePermissions((p) => ({ ...p, canCreateCourses: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Creación de Programas</p>
                    <p className="text-xs text-muted-foreground">Permite estructurar rutas de aprendizaje.</p>
                  </div>
                  <Switch
                    checked={invitePermissions.canCreatePrograms}
                    onCheckedChange={(v) => setInvitePermissions((p) => ({ ...p, canCreatePrograms: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Gestión de Alumnos</p>
                    <p className="text-xs text-muted-foreground">Visualizar expedientes y responder a los alumnos.</p>
                  </div>
                  <Switch
                    checked={invitePermissions.canManageStudents}
                    onCheckedChange={(v) => setInvitePermissions((p) => ({ ...p, canManageStudents: v }))}
                  />
                </div>
              </div>
            )}

            {/* Capacidades de Crecimiento (Marketing) */}
            {inviteRoles.includes('marketing') && (
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-bold text-primary uppercase tracking-wider">Capacidades de Crecimiento (Marketing)</Label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Creación de Campañas</p>
                    <p className="text-xs text-muted-foreground">Diseñar y programar campañas publicitarias.</p>
                  </div>
                  <Switch
                    checked={invitePermissions.canCreateCampaigns}
                    onCheckedChange={(v) => setInvitePermissions((p) => ({ ...p, canCreateCampaigns: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Creación de Videos con IA</p>
                    <p className="text-xs text-muted-foreground">Generación de videos con avatares e inteligencia artificial.</p>
                  </div>
                  <Switch
                    checked={invitePermissions.canCreateVideos}
                    onCheckedChange={(v) => setInvitePermissions((p) => ({ ...p, canCreateVideos: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Motor de Emails & Landings</p>
                    <p className="text-xs text-muted-foreground">Acceso a landings, embajadores y motor de correo.</p>
                  </div>
                  <Switch
                    checked={invitePermissions.canAccessMarketing}
                    onCheckedChange={(v) => setInvitePermissions((p) => ({ ...p, canAccessMarketing: v }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsInviteOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleInviteTutor} disabled={isSubmitting} className="font-semibold gap-1.5">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar Vinculación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Permisos */}
      <Dialog open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Modificar Permisos del Tutor</DialogTitle>
            <DialogDescription>
              Ajusta las potestades y roles de {selectedTutor?.displayName} dentro de la empresa.
            </DialogDescription>
          </DialogHeader>

          {selectedTutor && (
            <div className="space-y-4 py-2">
              {/* Selección de Roles en Edición */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roles Asignados</Label>
                  <span className="text-[10px] text-muted-foreground">Mínimo 1 rol</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const curRoles = selectedTutor.roles || ['mentor'];
                      const exists = curRoles.includes('mentor');
                      if (exists && curRoles.length === 1) return;
                      const next = (exists ? curRoles.filter(r => r !== 'mentor') : [...curRoles, 'mentor']) as ('mentor' | 'marketing')[];
                      setSelectedTutor({ ...selectedTutor, roles: next });
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      (selectedTutor.roles || ['mentor']).includes('mentor')
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <GraduationCap className="h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold leading-tight">Mentor</p>
                      <p className="text-[10px] text-muted-foreground">Académico & Cursos</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const curRoles = selectedTutor.roles || ['mentor'];
                      const exists = curRoles.includes('marketing');
                      if (exists && curRoles.length === 1) return;
                      const next = (exists ? curRoles.filter(r => r !== 'marketing') : [...curRoles, 'marketing']) as ('mentor' | 'marketing')[];
                      setSelectedTutor({ ...selectedTutor, roles: next });
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      (selectedTutor.roles || ['mentor']).includes('marketing')
                        ? "bg-primary/10 border-primary/30 text-primary ring-1 ring-primary/20"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-bold leading-tight">Marketing</p>
                      <p className="text-[10px] text-muted-foreground">Crecimiento & Videos</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Capacidades Académicas (Mentor) */}
              {(selectedTutor.roles || ['mentor']).includes('mentor') && (
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-bold text-primary uppercase tracking-wider">Capacidades Académicas (Mentor)</Label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Creación de Cursos</p>
                      <p className="text-xs text-muted-foreground">Permite armar módulos y lecciones en borrador.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedTutor.permissions.canCreateCourses)}
                      onCheckedChange={(v) =>
                        setSelectedTutor((prev) =>
                          prev ? { ...prev, permissions: { ...prev.permissions, canCreateCourses: v } } : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Creación de Programas</p>
                      <p className="text-xs text-muted-foreground">Permite estructurar rutas de aprendizaje.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedTutor.permissions.canCreatePrograms)}
                      onCheckedChange={(v) =>
                        setSelectedTutor((prev) =>
                          prev ? { ...prev, permissions: { ...prev.permissions, canCreatePrograms: v } } : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Gestión de Alumnos</p>
                      <p className="text-xs text-muted-foreground">Visualizar expedientes y responder a los alumnos.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedTutor.permissions.canManageStudents)}
                      onCheckedChange={(v) =>
                        setSelectedTutor((prev) =>
                          prev ? { ...prev, permissions: { ...prev.permissions, canManageStudents: v } } : null
                        )
                      }
                    />
                  </div>
                </div>
              )}

              {/* Capacidades de Crecimiento (Marketing) */}
              {(selectedTutor.roles || ['mentor']).includes('marketing') && (
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-bold text-primary uppercase tracking-wider">Capacidades de Crecimiento (Marketing)</Label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Creación de Campañas</p>
                      <p className="text-xs text-muted-foreground">Diseñar y programar campañas publicitarias.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedTutor.permissions.canCreateCampaigns)}
                      onCheckedChange={(v) =>
                        setSelectedTutor((prev) =>
                          prev ? { ...prev, permissions: { ...prev.permissions, canCreateCampaigns: v } } : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Creación de Videos con IA</p>
                      <p className="text-xs text-muted-foreground">Generación de videos con avatares e inteligencia artificial.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedTutor.permissions.canCreateVideos)}
                      onCheckedChange={(v) =>
                        setSelectedTutor((prev) =>
                          prev ? { ...prev, permissions: { ...prev.permissions, canCreateVideos: v } } : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Motor de Emails & Landings</p>
                      <p className="text-xs text-muted-foreground">Acceso a landings, embajadores y motor de correo.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedTutor.permissions.canAccessMarketing)}
                      onCheckedChange={(v) =>
                        setSelectedTutor((prev) =>
                          prev ? { ...prev, permissions: { ...prev.permissions, canAccessMarketing: v } } : null
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsEditPermissionsOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSubmitting} className="font-semibold gap-1.5">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
