'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { SubscriptionStatus, TutorSubscription } from '@/types/subscription';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { collection, doc, updateDoc, query, orderBy, setDoc, serverTimestamp, deleteDoc, where, getDocs, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Shield, User as UserIcon, GraduationCap, Search, Trash2, UserPlus, Loader2, Save, Globe, Info, KeyRound, Fingerprint, Target, Zap, Users as UsersIcon, ClipboardList, Check, Rocket, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
const SUPER_ADMIN_EMAIL = 'felizdeemprender@gmail.com';

const MENTOR_SUB_PERMISSIONS = [
  { id: 'academic_management', label: 'Gestión Académica', icon: GraduationCap, desc: 'Cursos y temarios' },
  { id: 'mentor_challenges', label: 'Desafíos (Mentor)', icon: Target, desc: 'Tareas y evaluación IA' },
  { id: 'students_view', label: 'Alumnos', icon: UsersIcon, desc: 'Comunidad y expedientes' },
  { id: 'followups_management', label: 'Seguimientos', icon: ClipboardList, desc: 'Sesiones y tutorías' },
];

export default function AdminUsersPage() {
  const db = useFirestore();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  console.log('🔄 AdminUsersPage loaded - forcing refresh v2');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userForPermissions, setUserForPermissions] = useState<any>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    roles: ['alumno'] as string[],
    mentorPermissions: [] as string[]
  });

  const usersQuery = useMemoFirebase(() => {
    if (!profile?.roles.includes('admin') || isAuthLoading) return null;
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db, profile, isAuthLoading]);

  const { data: usersRaw, isLoading } = useCollection(usersQuery);

  // Cargar planes de suscripción en tiempo real
  const plansQuery = useMemoFirebase(() => {
    return query(collection(db, 'subscriptionPlans'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: subscriptionPlans = [] } = useCollection(plansQuery);

  const consolidatedUsers = useMemo(() => {
    // Esperar a que carguen los planes y usuarios
    if (!usersRaw || !subscriptionPlans || subscriptionPlans.length === 0) return [];
    const userMap = new Map();
    
    for (const user of usersRaw) {
      const email = user.email?.toLowerCase().trim();
      if (!email) continue;

      if (!userMap.has(email)) {
        userMap.set(email, user);
      } else {
        const existing = userMap.get(email);
        const currentId = user.id || '';
        const existingId = existing.id || '';
        
        const isCurrentTemp = currentId.includes('_') || currentId.includes('@');
        const isExistingTemp = existingId.includes('_') || existingId.includes('@');
        
        if (!isCurrentTemp && isExistingTemp) {
          userMap.set(email, {
            ...user,
            roles: Array.from(new Set([...(user.roles || []), ...(existing.roles || [])])),
            mentorPermissions: Array.from(new Set([...(user.mentorPermissions || []), ...(existing.mentorPermissions || [])]))
          });
        } else if (isCurrentTemp && !isExistingTemp) {
          userMap.set(email, {
            ...existing,
            roles: Array.from(new Set([...(existing.roles || []), ...(user.roles || [])])),
            mentorPermissions: Array.from(new Set([...(existing.mentorPermissions || []), ...(user.mentorPermissions || [])]))
          });
        }
      }
    }
    return Array.from(userMap.values()).sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });
  }, [usersRaw, subscriptionPlans]);

  const currentUserForPerms = consolidatedUsers.find(u => u.id === userForPermissions?.id);

  const toggleRole = (roleToToggle: string) => {
    if (!pendingUser) return;
    
    const currentRoles = pendingUser.roles || [];
    const isRemoving = currentRoles.includes(roleToToggle);
    
    if (pendingUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL && isRemoving && (roleToToggle === 'admin' || roleToToggle === 'mentor')) {
      toast({ 
        variant: 'destructive', 
        title: 'Acción Protegida', 
        description: 'No se pueden remover los roles críticos de la cuenta de administración principal.' 
      });
      return;
    }

    if (isRemoving && currentRoles.length === 1) {
      toast({ variant: 'destructive', title: 'Error', description: 'El usuario debe tener al menos un rol.' });
      return;
    }

    const updatedRoles = isRemoving 
      ? currentRoles.filter((r: string) => r !== roleToToggle) 
      : [...currentRoles, roleToToggle];

    const newPermissions = {...pendingUser};
    newPermissions.roles = updatedRoles;

    if (roleToToggle === 'mentor' && !isRemoving && (!pendingUser.mentorPermissions || pendingUser.mentorPermissions.length === 0)) {
      newPermissions.mentorPermissions = MENTOR_SUB_PERMISSIONS.map(p => p.id);
    }

    setPendingUser(newPermissions);
  };

  const toggleMentorSubPermission = (permissionId: string) => {
    if (!pendingUser) return;
    const currentPerms = pendingUser.mentorPermissions || [];
    const isRemoving = currentPerms.includes(permissionId);

    setPendingUser({
      ...pendingUser,
      mentorPermissions: isRemoving 
        ? currentPerms.filter((p: string) => p !== permissionId) 
        : [...currentPerms, permissionId]
    });
  };

  const updateSubscriptionPlan = (plan: any) => {
    if (!pendingUser || !plan) return;
    
    const startDate = new Date().toISOString();
    const durationMonths = plan.durationMonths || 12;
    const endDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    const subscription = {
      status: SubscriptionStatus.ACTIVE,
      type: plan.type,
      planId: plan.id, // CRITICAL: Para identificar el plan en upgrades
      planName: plan.name, // Sincronizado con el sistema de facturación
      name: plan.name, // Mantener por compatibilidad con el Select local
      isEnterprise: plan.isEnterprise || false,
      hasPremiumAI: plan.hasPremiumAI === true,
      startDate,
      endDate,
      hasCustomPage: plan.hasCustomPage || false,
      fixedAmount: plan.price || 0,
      percentageRate: plan.percentageRate || 0,
      requiresFreeCourses: plan.requiresFreeCourses || false,
      freeCoursesCount: plan.freeCoursesCount || 0,
      invitationsPerCourse: plan.invitationsPerCourse || 0,
      aiQuotas: {
        totalCredits: plan.aiQuotas?.totalCredits || 0,
        usedCredits: 0 // Reset de uso al asignar nuevo plan manual si es necesario, o mantener previo
      },
      rechargeOptions: plan.rechargeOptions || [],
      observations: `Plan ${plan.name} asignado manualmente por admin`,
      autoRenew: true,
      limits: {
        maxCourses: plan.limits?.maxCourses || 0,
        maxStudents: plan.limits?.maxStudents || 0,
        hasCustomBranding: plan.limits?.hasCustomBranding || false,
        hasAnalytics: plan.limits?.hasAnalytics || false,
        hasPrioritySupport: plan.limits?.hasPrioritySupport || false
      },
      publicProfile: {
        enabled: plan.hasCustomPage || false,
        showStats: true,
        showContact: true,
        allowPublicCourses: true
      }
    };

    setPendingUser({
      ...pendingUser,
      subscription
    });
  };

  const handleSaveAllChanges = async () => {
    if (!pendingUser) return;
    setLoading(true);
    
    try {
      const userRef = doc(db, 'users', pendingUser.id);
      const isMentor = pendingUser.roles.includes('mentor');
      const isEnterprise = pendingUser.subscription?.isEnterprise === true;

      await updateDoc(userRef, {
        roles: pendingUser.roles,
        isMentor: isMentor, // Sincronizar flag isMentor en la raíz
        isEnterprise: isEnterprise, // Sincronizar flag isEnterprise en la raíz
        mentorPermissions: pendingUser.mentorPermissions || [],
        subscription: pendingUser.subscription || null,
        updatedAt: serverTimestamp()
      });
      
      // Refrescar el profile del tutor si se actualizó su suscripción
      if (pendingUser.subscription) {
        // Forzar recarga del profile en el auth context
        window.dispatchEvent(new CustomEvent('subscription-updated', { 
          detail: { userId: pendingUser.id, subscription: pendingUser.subscription } 
        }));
      }
      
      toast({ title: 'Cambios guardados', description: 'El perfil institucional ha sido actualizado con éxito.' });
      setIsPermissionsOpen(false);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
        path: `users/${pendingUser.id}`, 
        operation: 'update'
      }));
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = (userId: string, currentEmail: string, currentState: boolean) => {
    if (currentEmail?.toLowerCase() === SUPER_ADMIN_EMAIL && currentState) {
      toast({ 
        variant: 'destructive', 
        title: 'Acción Bloqueada', 
        description: 'La cuenta de administración principal no puede ser suspendida.' 
      });
      return;
    }

    const userRef = doc(db, 'users', userId);
    updateDoc(userRef, { isActive: !currentState })
      .then(() => {
        toast({ title: currentState ? 'Usuario suspendido' : 'Usuario reactivado' });
      })
      .catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: userRef.path, 
          operation: 'update', 
          requestResourceData: { isActive: !currentState } 
        }));
      });
  };

  const handleCreateUser = async () => {
    if (!newUserData.email) return;
    setLoading(true);
    try {
      const normalizedEmail = newUserData.email.toLowerCase().trim();
      const tempId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      
      const userRef = doc(db, 'users', tempId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'El usuario ya existe en el sistema.' });
        setLoading(false);
        return;
      }
      
      const writeData = {
        uid: tempId, 
        email: normalizedEmail,
        displayName: newUserData.displayName || normalizedEmail.split('@')[0],
        roles: newUserData.roles,
        isMentor: newUserData.roles.includes('mentor'), // Sincronizar flag isMentor al crear
        mentorPermissions: newUserData.roles.includes('mentor') ? newUserData.mentorPermissions : [],
        isActive: true,
        createdAt: serverTimestamp(),
        isPreRegistered: true 
      };

      setDoc(userRef, writeData)
        .then(() => {
          setIsAddUserOpen(false);
          setNewUserData({ email: '', displayName: '', roles: ['alumno'], mentorPermissions: [] });
          toast({ title: 'Perfil pre-registrado', description: 'El usuario ya puede ser activado por el alumno.' });
        })
        .catch(async (e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: writeData
          }));
        })
        .finally(() => setLoading(false));
    } catch (e) {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return consolidatedUsers.filter(u => {
      const matchesSearch = !searchTerm ||
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter.length === 0 ||
        roleFilter.some(r => (u.roles || []).includes(r));

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive !== false) ||
        (statusFilter === 'suspended' && u.isActive === false);

      let matchesPlan = true;
      if (planFilter !== 'all' && (u.roles || []).includes('mentor')) {
        const planType = u.subscription?.type || 'free';
        matchesPlan = planType === planFilter;
      }

      return matchesSearch && matchesRole && matchesStatus && matchesPlan;
    });
  }, [consolidatedUsers, searchTerm, roleFilter, statusFilter, planFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground font-medium">Control institucional de accesos y permisos.</p>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)} className="h-12 px-8 rounded-xl font-bold gap-2 bg-primary text-white">
            <UserPlus className="h-5 w-5" /> Alta Usuario
          </Button>
        </header>

        <Card className="border border-border rounded-2xl bg-white shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-border"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl border border-border">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Rol</span>
                  {['alumno', 'mentor', 'marketing', 'admin'].map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        setRoleFilter(prev =>
                          prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                        );
                      }}
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border transition-all",
                        roleFilter.includes(role)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-border hover:border-border"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                  {roleFilter.length > 0 && (
                    <button
                      onClick={() => setRoleFilter([])}
                      className="text-[9px] text-danger font-bold hover:underline ml-1"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[130px] border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="suspended">Suspendidos</SelectItem>
                  </SelectContent>
                </Select>

                {(roleFilter.length === 0 || roleFilter.includes('mentor')) && (
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="h-9 w-[150px] border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      <SelectItem value="free">Gratis</SelectItem>
                      <SelectItem value="fixed">Monto Fijo</SelectItem>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
          <CardContent className="p-0">
            <ResponsiveTable
              data={filteredUsers}
              keyExtractor={(user) => user.id}
              isLoading={isLoading}
              loadingState={
                <div className="text-center py-20 animate-pulse text-muted-foreground">Sincronizando identidades...</div>
              }
              emptyState={
                <div className="text-center py-20 italic text-muted-foreground">No se encontraron registros.</div>
              }
              columns={[
                {
                  key: 'identity',
                  header: 'Identidad',
                  hideOnMobile: true,
                  cell: (user) => {
                    const isGoogleUser = user.signInProvider === 'google.com';
                    const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                    const isInvitation = user.id.includes('_');
                    return (
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border shadow-sm">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-bold uppercase">{user.displayName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground leading-tight">{user.displayName}</p>
                            {user.roles?.includes('mentor') && (
                              <button
                                onClick={() => window.location.href = `/admin/users/tutores/${user.id}`}
                                className="text-primary/50 hover:text-primary transition-colors"
                                title="Ver detalle del tutor"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                            {isGoogleUser && (
                              <span title="Usuario Google Workspace">
                                <Globe className="h-3 w-3 text-accent" />
                              </span>
                            )}
                            {isSuperAdminAccount && <Badge className="bg-foreground text-[7px] text-white h-4 px-1.5 border-none">SYSTEM</Badge>}
                            {isInvitation && <Badge className="bg-warn/15 text-warn text-[7px] h-4 px-1.5 border-none font-black uppercase tracking-tighter">Invitación</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                            <div className="flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity" title={`Internal ID: ${user.id}`}>
                              <Fingerprint className="h-2.5 w-2.5" />
                              <span className="text-[8px] font-mono">{user.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'permissions',
                  header: 'Permisos Asignados',
                  cardLabel: 'Permisos',
                  align: 'center' as const,
                  cell: (user: any) => (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {(user.roles || []).map((role: string) => (
                          <Badge key={role} variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-border text-muted-foreground bg-muted">
                            {role}
                          </Badge>
                        ))}
                      </div>
                      {user.roles?.includes('mentor') && (
                        <p className="text-[8px] font-bold text-primary uppercase mt-1">
                          Permisos: {(user.mentorPermissions || []).length}/{MENTOR_SUB_PERMISSIONS.length}
                          {user.subscription?.limits?.maxStudents && ` | Alum: ${user.subscription.limits.maxStudents === -1 ? '∞' : user.subscription.limits.maxStudents}`}
                        </p>
                      )}
                    </div>
                  ),
                },
                ...(roleFilter.length === 0 || roleFilter.includes('mentor')
                  ? [{
                      key: 'plan',
                      header: 'Plan',
                      align: 'center' as const,
                      hideOnMobile: true,
                      cell: (user: any) => (
                        user.roles?.includes('mentor') && user.subscription ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className={cn(
                              "text-[8px] uppercase font-bold px-2 h-4 border-none",
                              user.subscription.type === 'free' ? "bg-muted text-muted-foreground" :
                              user.subscription.type === 'fixed' ? "bg-success/15 text-success" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {user.subscription.type === 'free' ? 'Gratis' :
                               user.subscription.type === 'fixed' ? `$${user.subscription.fixedAmount}` :
                               `${user.subscription.percentageRate}%`}
                            </Badge>
                            <span className={cn(
                              "text-[7px] font-bold uppercase",
                              user.subscription.status === 'active' ? "text-success" :
                              user.subscription.status === 'trial' ? "text-blue-500" : "text-muted-foreground"
                            )}>
                              {user.subscription.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-border">—</span>
                        )
                      ),
                    }]
                  : []),
                ...(roleFilter.length === 0 || roleFilter.includes('alumno')
                  ? [{
                      key: 'enrollments',
                      header: 'Inscripciones',
                      align: 'center' as const,
                      hideOnMobile: true,
                      cell: (user: any) => (
                        user.roles?.includes('alumno') && !user.roles?.includes('mentor') ? (
                          <span className="text-[10px] text-muted-foreground italic">—</span>
                        ) : (
                          <span className="text-[10px] text-border">—</span>
                        )
                      ),
                    }]
                  : []),
                {
                  key: 'status',
                  header: 'Estado',
                  align: 'center' as const,
                  hideOnMobile: true,
                  cell: (user: any) => {
                    const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                    return (
                      <div className="flex items-center justify-center gap-3">
                        <Badge className={cn(
                          "text-[9px] uppercase tracking-widest px-2 h-5 border-none",
                          user.isActive !== false ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {user.isActive !== false ? 'Activo' : 'Suspendido'}
                        </Badge>
                        <Switch
                          disabled={isSuperAdminAccount}
                          checked={user.isActive !== false}
                          onCheckedChange={() => toggleActiveStatus(user.id, user.email, user.isActive !== false)}
                          className="scale-75"
                        />
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Acciones',
                  align: 'right' as const,
                  hideOnMobile: true,
                  cell: (user: any) => {
                    const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                    return (
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setUserForPermissions(user);
                            setPendingUser(JSON.parse(JSON.stringify(user)));
                            setIsPermissionsOpen(true);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-danger hover:bg-danger/10"
                          disabled={isSuperAdminAccount}
                          onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              mobileCardHeader={(user) => {
                const isGoogleUser = user.signInProvider === 'google.com';
                const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                const isInvitation = user.id.includes('_');
                return (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold uppercase">{user.displayName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground leading-tight">{user.displayName}</p>
                          {user.roles?.includes('mentor') && (
                            <button
                              onClick={() => window.location.href = `/admin/users/tutores/${user.id}`}
                              className="text-primary/50 hover:text-primary transition-colors"
                              title="Ver detalle del tutor"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                          {isGoogleUser && (
                            <span title="Usuario Google Workspace">
                              <Globe className="h-3 w-3 text-accent" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={cn(
                        "text-[8px] uppercase tracking-widest px-2 h-5 border-none",
                        user.isActive !== false ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      )}>
                        {user.isActive !== false ? 'Activo' : 'Suspendido'}
                      </Badge>
                      {isSuperAdminAccount && <Badge className="bg-foreground text-[7px] text-white h-4 px-1.5 border-none">SYSTEM</Badge>}
                      {isInvitation && <Badge className="bg-warn/15 text-warn text-[7px] h-4 px-1.5 border-none font-black uppercase tracking-tighter">Invitación</Badge>}
                    </div>
                  </div>
                );
              }}
              mobileCardFooter={(user) => {
                const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                return (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUserForPermissions(user);
                        setPendingUser(JSON.parse(JSON.stringify(user)));
                        setIsPermissionsOpen(true);
                      }}
                      className="flex-1 h-11 rounded-xl font-bold text-xs gap-2"
                    >
                      <Shield className="h-4 w-4" /> Permisos
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isSuperAdminAccount}
                      onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                      className="flex-1 h-11 rounded-xl font-bold text-xs gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Dialog: Add User */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="mw-xl">
            <div className="px-8 pt-8">
              <DialogTitle className="text-xl font-bold flex items-center gap-3"><UserPlus className="h-6 w-6 text-accent" /> Alta Institucional</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-2 uppercase tracking-widest font-bold">Pre-registro de identidad y capacidades</DialogDescription>
            </div>
            <ScrollArea className="max-h-[75vh]">
              <div className="px-8 pb-8 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-user-email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Correo Electrónico</Label>
                    <Input id="new-user-email" name="email" type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="ejemplo@correo.com" className="border-border"  size="lg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre (Opcional)</Label>
                    <Input id="new-user-name" name="displayName" value={newUserData.displayName} onChange={e => setNewUserData({...newUserData, displayName: e.target.value})} placeholder="Nombre del usuario" className="border-border"  size="lg" />
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Roles Principales</Label>
                    <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-xl border border-muted">
                      {['alumno', 'mentor', 'marketing', 'admin'].map(role => (
                        <div key={role} className="flex items-center gap-2">
                          <Checkbox 
                            id={`new-role-${role}`} 
                            checked={newUserData.roles.includes(role)} 
                            onCheckedChange={(checked) => {
                              let roles = checked ? [...newUserData.roles, role] : newUserData.roles.filter(r => r !== role);
                              let perms = newUserData.mentorPermissions;
                              
                              if (role === 'mentor' && checked && perms.length === 0) {
                                perms = MENTOR_SUB_PERMISSIONS.map(p => p.id);
                              }
                              
                              setNewUserData({...newUserData, roles, mentorPermissions: perms});
                            }} 
                          />
                          <Label htmlFor={`new-role-${role}`} className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer">{role}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {newUserData.roles.includes('mentor') && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Configuración de Capacidades (Mentor)</Label>
                        <button 
                          onClick={() => setNewUserData({...newUserData, mentorPermissions: MENTOR_SUB_PERMISSIONS.map(p => p.id)})}
                          className="text-[8px] font-bold text-accent uppercase hover:underline"
                        >
                          Marcar Todas
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {MENTOR_SUB_PERMISSIONS.map((perm) => (
                          <div key={perm.id} className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            newUserData.mentorPermissions.includes(perm.id) ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-white border-muted hover:border-border"
                          )} onClick={() => {
                            const isIncluded = newUserData.mentorPermissions.includes(perm.id);
                            const perms = isIncluded ? newUserData.mentorPermissions.filter(p => p !== perm.id) : [...newUserData.mentorPermissions, perm.id];
                            setNewUserData({...newUserData, mentorPermissions: perms});
                          }}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center border",
                                newUserData.mentorPermissions.includes(perm.id) ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                              )}>
                                <perm.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold leading-none">{perm.label}</p>
                                <p className="text-[8px] text-muted-foreground mt-1">{perm.desc}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              newUserData.mentorPermissions.includes(perm.id) ? "bg-primary border-primary" : "border-border"
                            )}>
                              {newUserData.mentorPermissions.includes(perm.id) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button onClick={handleCreateUser} disabled={loading || !newUserData.email || newUserData.roles.length === 0} className="w-full h-14 rounded-2xl font-bold text-lg bg-primary text-white">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 mr-3" />} Registrar Usuario
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Dialog: Permissions Editor */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="mw-2xl">
            <div className="px-10 pt-10 relative overflow-hidden">
              <Shield className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10"><Shield className="h-7 w-7 text-accent" /> Gestionar Permisos</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-2 uppercase tracking-widest font-black relative z-10">Ajuste de roles institucionales y sub-capacidades</DialogDescription>
            </div>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="px-10 pb-10 space-y-10">
                <div className="flex items-center gap-6 p-6 bg-secondary/10 rounded-3xl border border-primary/5">
                  <Avatar className="h-16 w-16 border-4 border-white">
                    <AvatarImage src={pendingUser?.photoURL || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground font-bold uppercase text-xl">{pendingUser?.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-xl leading-tight truncate">{pendingUser?.displayName}</p>
                    <p className="text-sm text-muted-foreground font-medium truncate">{pendingUser?.email}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Roles Principales</Label>
                  <div className="grid gap-4">
                    {[
                      { id: 'alumno', label: 'Alumno', icon: UserIcon, desc: 'Acceso al catálogo y progreso educativo.' },
                      { id: 'mentor', label: 'Mentor', icon: GraduationCap, desc: 'Gestión académica y creación de contenidos.' },
                      { id: 'marketing', label: 'Marketing', icon: Rocket, desc: 'Gestión de ventas y páginas de aterrizaje.' },
                      { id: 'admin', label: 'Admin', icon: Shield, desc: 'Control total de la infraestructura global.' }
                    ].map((role) => {
                      const isSuperAdminAccount = pendingUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                      const isProtectedRole = isSuperAdminAccount && (role.id === 'admin' || role.id === 'mentor');
                      
                      return (
                        <div key={role.id} className={cn(
                          "flex items-center justify-between p-5 rounded-2xl border transition-all group",
                          isProtectedRole ? "bg-muted border-muted opacity-60" : "bg-white border-muted hover:border-primary/20 hover:shadow-md"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border transition-colors",
                              !isProtectedRole && "group-hover:text-primary group-hover:bg-primary/5"
                            )}>
                              <role.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{role.label}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold leading-tight">{role.desc}</p>
                            </div>
                          </div>
                          <Switch 
                            disabled={isProtectedRole}
                            checked={(pendingUser?.roles || []).includes(role.id)} 
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {pendingUser?.roles?.includes('mentor') && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Plan de Suscripción (Abono)</Label>
                      <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase px-2 h-4">Control de Límites</Badge>
                    </div>
                    
                    <div className="p-6 bg-muted rounded-3xl border border-muted space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Seleccionar Plan para el Mentor</Label>
                        <Select 
                          value={pendingUser?.subscription?.name || ''} 
                          onValueChange={(planName) => {
                            const selectedPlan = (subscriptionPlans || []).find(p => p.name === planName);
                            if (selectedPlan) updateSubscriptionPlan(selectedPlan);
                          }}
                        >
                          <SelectTrigger size="lg" className="bg-white border-border">
                            <SelectValue placeholder="Elegir un plan de suscripción..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(subscriptionPlans || []).map((plan) => (
                              <SelectItem key={plan.id} value={plan.name}>
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span className="font-bold">{plan.name}</span>
                                  <Badge variant="outline" className="text-[9px] h-4">
                                    {plan.type === 'free' ? 'Gratis' : plan.type === 'fixed' ? `$${plan.price}` : `${plan.percentageRate}%`}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Selector de Tipo de Perfil (Tutor vs Empresa) */}
                      <div className="space-y-2 p-4 bg-white rounded-2xl border border-border">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo de Perfil Institucional</Label>
                        <RadioGroup 
                          value={pendingUser?.subscription?.isEnterprise ? 'enterprise' : 'tutor'} 
                          onValueChange={(v) => {
                            const isEnt = v === 'enterprise';
                            const currentSub = pendingUser.subscription || { 
                              status: 'active', 
                              type: 'free', 
                              limits: { maxCourses: 0, maxStudents: 0, hasCustomBranding: false, hasAnalytics: false, hasPrioritySupport: false },
                              publicProfile: { enabled: false, showStats: false, showContact: false, allowPublicCourses: false }
                            };
                            setPendingUser({
                              ...pendingUser,
                              subscription: { ...currentSub, isEnterprise: isEnt }
                            });
                          }}
                          className="flex gap-6 mt-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="tutor" id="user-type-tutor" />
                            <Label htmlFor="user-type-tutor" className="font-bold text-xs uppercase cursor-pointer">Tutor/Mentor</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="enterprise" id="user-type-enterprise" />
                            <Label htmlFor="user-type-enterprise" className="font-bold text-xs uppercase cursor-pointer text-primary">Empresa</Label>
                          </div>
                        </RadioGroup>
                        <p className="text-[9px] text-muted-foreground italic mt-1">
                          * Los perfiles de Empresa no se muestran en el catálogo público general.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                        <div className="space-y-1.5 p-4 bg-warn/10 rounded-2xl border border-warn/15 shadow-sm flex flex-col justify-center items-center">
                           <Label htmlFor="limit-ai" className="text-[9px] font-black uppercase text-warn">IA Premium</Label>
                           <Switch 
                             id="limit-ai"
                             checked={pendingUser?.subscription?.hasPremiumAI === true}
                             onCheckedChange={(c) => {
                               const currentSub = pendingUser.subscription || { 
                                 status: 'active', 
                                 type: 'free', 
                                 limits: { maxCourses: 0, maxStudents: 0, hasCustomBranding: false, hasAnalytics: false, hasPrioritySupport: false },
                                 publicProfile: { enabled: false, showStats: false, showContact: false, allowPublicCourses: false }
                               };
                               setPendingUser({
                                 ...pendingUser,
                                 subscription: { ...currentSub, hasPremiumAI: c }
                               });
                             }}
                             className="data-[state=checked]:bg-warn scale-90 my-1"
                           />
                           <p className="text-[7px] text-warn/70 font-bold uppercase mt-1 text-center leading-tight">Motor Imagen 3</p>
                        </div>
                        
                        {pendingUser?.subscription && (
                          <>
                            <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-muted shadow-sm">
                            <Label htmlFor="limit-courses" className="text-[9px] font-black uppercase text-muted-foreground">Máx. Publicados</Label>
                            <Input 
                              id="limit-courses"
                              name="limit-courses"
                              type="number" 
                              value={pendingUser.subscription.limits?.maxCourses ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    limits: { ...pendingUser.subscription.limits, maxCourses: isNaN(val) ? 0 : val }
                                  }
                                });
                              }}
                              className="h-9 font-black text-primary border-none bg-muted/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase mt-1">Cursos Activos</p>
                          </div>
                          
                            <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-muted shadow-sm">
                            <Label htmlFor="limit-students" className="text-[9px] font-black uppercase text-muted-foreground">Máx. Estudiantes</Label>
                            <Input 
                              id="limit-students"
                              name="limit-students"
                              type="number" 
                              value={pendingUser.subscription.limits?.maxStudents ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    limits: { ...pendingUser.subscription.limits, maxStudents: isNaN(val) ? 0 : val }
                                  }
                                });
                              }}
                              className="h-9 font-black text-primary border-none bg-muted/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase mt-1">Límite de alumnos</p>
                          </div>

                          <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-muted shadow-sm">
                            <Label htmlFor="limit-credits" className="text-[9px] font-black uppercase text-muted-foreground">Créditos IA</Label>
                            <Input 
                              id="limit-credits"
                              name="limit-credits"
                              type="number" 
                              value={pendingUser.subscription.aiQuotas?.totalCredits ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    aiQuotas: { 
                                      ...pendingUser.subscription.aiQuotas, 
                                      totalCredits: isNaN(val) ? 0 : val 
                                    }
                                  }
                                });
                              }}
                              className="h-9 font-black text-primary border-none bg-muted/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase mt-1">Saldo del abono</p>
                          </div>

                          <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-muted shadow-sm">
                            <Label htmlFor="limit-invitations" className="text-[9px] font-black uppercase text-muted-foreground">Invitaciones</Label>
                            <Input 
                              id="limit-invitations"
                              name="limit-invitations"
                              type="number" 
                              value={pendingUser.subscription.invitationsPerCourse ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    invitationsPerCourse: isNaN(val) ? 0 : val
                                  }
                                });
                              }}
                              className="h-9 font-black text-primary border-none bg-muted/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase mt-1">Por cada curso</p>
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {pendingUser?.roles?.includes('mentor') && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capacidades de Gestión (Mentor)</Label>
                      <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase px-2 h-4">Sub-permisos Activos</Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {MENTOR_SUB_PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between p-4 rounded-2xl border border-muted bg-muted/50 group/perm hover:border-primary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-colors",
                              (pendingUser?.mentorPermissions || []).includes(perm.id) ? "bg-primary text-white" : "bg-white text-muted-foreground"
                            )}>
                              <perm.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{perm.label}</p>
                              <p className="text-[9px] text-muted-foreground font-medium leading-none mt-0.5">{perm.desc}</p>
                            </div>
                          </div>
                          <Switch 
                            checked={(pendingUser?.mentorPermissions || []).includes(perm.id)} 
                            onCheckedChange={() => toggleMentorSubPermission(perm.id)}
                            className="scale-90"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="px-10 py-6 bg-muted border-t shrink-0">
              <Button 
                onClick={handleSaveAllChanges} 
                disabled={loading}
                className="w-full h-16 font-bold bg-primary text-white text-xl"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : <Save className="h-6 w-6 mr-3" />}
                Guardar y Finalizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog: Delete User */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="">
            <AlertDialogHeader className="items-center text-center">
              <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center text-danger mb-4"><Trash2 className="h-7 w-7" /></div>
              <AlertDialogTitle className="text-xl font-bold">¿Borrar Registro?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">Se eliminará permanentemente el perfil de <strong>{userToDelete?.displayName}</strong>. Esta acción es irreversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
              <AlertDialogCancel className="flex-1 h-11 rounded-xl font-bold border-border">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { 
                if (userToDelete?.id === profile?.uid) return;
                const userRef = doc(db, 'users', userToDelete.id);
                deleteDoc(userRef)
                  .then(() => toast({ title: 'Perfil eliminado' }))
                  .catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'delete' })));
                setIsDeleteDialogOpen(false);
              }} className="flex-1 h-11 bg-danger hover:bg-danger rounded-xl font-bold text-white shadow-lg">Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
