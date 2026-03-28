'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { SubscriptionStatus, TutorSubscription } from '@/types/subscription';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { collection, doc, updateDoc, query, orderBy, setDoc, serverTimestamp, deleteDoc, where, getDocs, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Shield, User as UserIcon, GraduationCap, Search, Trash2, UserPlus, Loader2, Save, Globe, Info, KeyRound, Fingerprint, Target, Zap, Users as UsersIcon, ClipboardList, Check, Rocket } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
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

  // Debug para ver qué planes se cargan
  console.log('🔍 DEBUG - Planes cargados:', subscriptionPlans);
  const saSasPlan = subscriptionPlans?.find(p => p.name === 'saSas');
  console.log('🔍 DEBUG - Plan saSas:', saSasPlan);
  console.log('🔍 DEBUG - invitationsPerCourse en saSas:', saSasPlan?.invitationsPerCourse);

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
  }, [usersRaw]);

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

    const subscription: TutorSubscription = {
      status: SubscriptionStatus.ACTIVE,
      type: plan.type,
      name: plan.name,
      isEnterprise: plan.isEnterprise || false,
      startDate,
      endDate,
      hasCustomPage: plan.hasCustomPage || false,
      fixedAmount: plan.price || 0,
      percentageRate: plan.percentageRate || 0,
      requiresFreeCourses: plan.requiresFreeCourses || false,
      freeCoursesCount: plan.freeCoursesCount || 0,
      invitationsPerCourse: plan.invitationsPerCourse || 0,
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

    // Debug para ver qué se asigna
    console.log('🔍 DEBUG - Asignando subscription:', {
      planName: plan.name,
      planInvitationsPerCourse: plan.invitationsPerCourse,
      planInvitationsPerCourseType: typeof plan.invitationsPerCourse,
      finalValue: plan.invitationsPerCourse || 0,
      planObject: plan
    });

    setPendingUser({
      ...pendingUser,
      subscription: {
        ...subscription,
        name: plan.name // Guardamos el nombre para el Select
      }
    });
  };

  const handleSaveAllChanges = async () => {
    if (!pendingUser) return;
    setLoading(true);
    
    // Debug para ver qué se va a guardar
    console.log('🔍 DEBUG - Guardando usuario:', {
      userId: pendingUser.id,
      subscriptionAGuardar: pendingUser.subscription,
      subscriptionType: typeof pendingUser.subscription,
      subscriptionInvitationsPerCourse: pendingUser.subscription?.invitationsPerCourse
    });
    
    try {
      const userRef = doc(db, 'users', pendingUser.id);
      await updateDoc(userRef, {
        roles: pendingUser.roles,
        mentorPermissions: pendingUser.mentorPermissions || [],
        subscription: pendingUser.subscription || null,
        updatedAt: serverTimestamp()
      });
      
      // Refrescar el profile del tutor si se actualizó su suscripción
      if (pendingUser.subscription) {
        console.log('🔍 DEBUG - Refrescando profile del tutor:', pendingUser.id);
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

  const filteredUsers = consolidatedUsers.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
            <p className="text-slate-500 font-medium">Control institucional de accesos y permisos.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                id="user-search"
                name="search"
                placeholder="Buscar por nombre o email..." 
                className="pl-10 h-11 rounded-xl bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddUserOpen(true)} className="h-11 px-6 rounded-xl font-bold gap-2 bg-primary text-white shadow-sm">
              <UserPlus className="h-4 w-4" /> Alta Usuario
            </Button>
          </div>
        </header>

        <Card className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold py-4 px-6 text-slate-500 text-[10px] uppercase tracking-widest">Identidad</TableHead>
                  <TableHead className="font-bold py-4 text-slate-500 text-[10px] uppercase tracking-widest text-center">Permisos Asignados</TableHead>
                  <TableHead className="font-bold py-4 text-slate-500 text-[10px] uppercase tracking-widest text-center">Estado</TableHead>
                  <TableHead className="font-bold py-4 px-6 text-slate-500 text-[10px] uppercase tracking-widest text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 animate-pulse text-slate-400">Sincronizando identidades...</TableCell></TableRow>
                ) : filteredUsers?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 italic text-slate-400">No se encontraron registros.</TableCell></TableRow>
                ) : filteredUsers?.map((user) => {
                  const isGoogleUser = user.signInProvider === 'google.com';
                  const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
                  const isInvitation = user.id.includes('_');
                  
                  return (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold uppercase">{user.displayName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 leading-tight">{user.displayName}</p>
                              {isGoogleUser && (
                                <span title="Usuario Google Workspace">
                                  <Globe className="h-3 w-3 text-accent" />
                                </span>
                              )}
                              {isSuperAdminAccount && <Badge className="bg-slate-900 text-[7px] text-white h-4 px-1.5 border-none">SYSTEM</Badge>}
                              {isInvitation && <Badge className="bg-amber-100 text-amber-700 text-[7px] h-4 px-1.5 border-none font-black uppercase tracking-tighter">Invitación</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                              <div className="flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity" title={`Internal ID: ${user.id}`}>
                                <Fingerprint className="h-2.5 w-2.5" />
                                <span className="text-[8px] font-mono">{user.id.substring(0, 8)}...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {(user.roles || []).map((role: string) => (
                              <Badge key={role} variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-slate-200 text-slate-600 bg-slate-50">
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
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-3">
                          <Badge className={cn(
                            "text-[9px] uppercase tracking-widest px-2 h-5 border-none",
                            user.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
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
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10" 
                            onClick={() => { 
                              setUserForPermissions(user); 
                              setPendingUser(JSON.parse(JSON.stringify(user))); // Deep copy for pending changes
                              setIsPermissionsOpen(true); 
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50" 
                            disabled={isSuperAdminAccount}
                            onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog: Add User */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="max-w-xl p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
            <div className="bg-slate-900 p-8 text-white">
              <DialogTitle className="text-xl font-bold flex items-center gap-3"><UserPlus className="h-6 w-6 text-accent" /> Alta Institucional</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold">Pre-registro de identidad y capacidades</DialogDescription>
            </div>
            <ScrollArea className="max-h-[75vh]">
              <div className="p-8 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-user-email" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Correo Electrónico</Label>
                    <Input id="new-user-email" name="email" type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="ejemplo@correo.com" className="h-12 rounded-xl border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-name" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nombre (Opcional)</Label>
                    <Input id="new-user-name" name="displayName" value={newUserData.displayName} onChange={e => setNewUserData({...newUserData, displayName: e.target.value})} placeholder="Nombre del usuario" className="h-12 rounded-xl border-slate-200" />
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Roles Principales</Label>
                    <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
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
                          <Label htmlFor={`new-role-${role}`} className="text-[10px] font-bold uppercase text-slate-600 cursor-pointer">{role}</Label>
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
                            newUserData.mentorPermissions.includes(perm.id) ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                          )} onClick={() => {
                            const isIncluded = newUserData.mentorPermissions.includes(perm.id);
                            const perms = isIncluded ? newUserData.mentorPermissions.filter(p => p !== perm.id) : [...newUserData.mentorPermissions, perm.id];
                            setNewUserData({...newUserData, mentorPermissions: perms});
                          }}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center border",
                                newUserData.mentorPermissions.includes(perm.id) ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
                              )}>
                                <perm.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold leading-none">{perm.label}</p>
                                <p className="text-[8px] text-slate-400 mt-1">{perm.desc}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              newUserData.mentorPermissions.includes(perm.id) ? "bg-primary border-primary" : "border-slate-200"
                            )}>
                              {newUserData.mentorPermissions.includes(perm.id) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button onClick={handleCreateUser} disabled={loading || !newUserData.email || newUserData.roles.length === 0} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl bg-primary text-white">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 mr-3" />} Registrar Usuario
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Dialog: Permissions Editor */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="max-w-2xl p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-primary p-10 text-white relative overflow-hidden">
              <Shield className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10"><Shield className="h-7 w-7 text-accent" /> Gestionar Permisos</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-xs mt-2 uppercase tracking-widest font-black relative z-10">Ajuste de roles institucionales y sub-capacidades</DialogDescription>
            </div>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="p-10 space-y-10">
                <div className="flex items-center gap-6 p-6 bg-secondary/10 rounded-3xl border border-primary/5">
                  <Avatar className="h-16 w-16 border-4 border-white shadow-xl">
                    <AvatarImage src={pendingUser?.photoURL} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold uppercase text-xl">{pendingUser?.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xl leading-tight truncate">{pendingUser?.displayName}</p>
                    <p className="text-sm text-slate-500 font-medium truncate">{pendingUser?.email}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Roles Principales</Label>
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
                          isProtectedRole ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-md"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border shadow-inner transition-colors",
                              !isProtectedRole && "group-hover:text-primary group-hover:bg-primary/5"
                            )}>
                              <role.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{role.label}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold leading-tight">{role.desc}</p>
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
                    
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Seleccionar Plan para el Mentor</Label>
                        <Select 
                          value={pendingUser?.subscription?.name || ''} 
                          onValueChange={(planName) => {
                            const selectedPlan = (subscriptionPlans || []).find(p => p.name === planName);
                            if (selectedPlan) updateSubscriptionPlan(selectedPlan);
                          }}
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
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

                      {pendingUser?.subscription && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                          <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <Label htmlFor="limit-courses" className="text-[9px] font-black uppercase text-slate-400">Máx. Publicados</Label>
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
                              className="h-9 font-black text-primary border-none bg-slate-50/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Cursos Activos</p>
                          </div>
                          
                          <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <Label htmlFor="limit-students" className="text-[9px] font-black uppercase text-slate-400">Máx. Estudiantes</Label>
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
                              className="h-9 font-black text-primary border-none bg-slate-50/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Límite de alumnos</p>
                          </div>

                          <div className="space-y-1.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <Label htmlFor="limit-invitations" className="text-[9px] font-black uppercase text-slate-400">Invitaciones</Label>
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
                              className="h-9 font-black text-primary border-none bg-slate-50/50 focus-visible:ring-1"
                            />
                            <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Por cada curso</p>
                          </div>
                        </div>
                      )}
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
                        <div key={perm.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 group/perm hover:border-primary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-colors",
                              (pendingUser?.mentorPermissions || []).includes(perm.id) ? "bg-primary text-white" : "bg-white text-slate-400"
                            )}>
                              <perm.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{perm.label}</p>
                              <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">{perm.desc}</p>
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

            <DialogFooter className="p-10 bg-slate-50 border-t shrink-0">
              <Button 
                onClick={handleSaveAllChanges} 
                disabled={loading}
                className="w-full h-16 rounded-[1.5rem] font-bold shadow-2xl bg-primary text-white text-xl"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : <Save className="h-6 w-6 mr-3" />}
                Guardar y Finalizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog: Delete User */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-8 max-sm">
            <AlertDialogHeader className="items-center text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4"><Trash2 className="h-7 w-7" /></div>
              <AlertDialogTitle className="text-xl font-bold">¿Borrar Registro?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">Se eliminará permanentemente el perfil de <strong>{userToDelete?.displayName}</strong>. Esta acción es irreversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
              <AlertDialogCancel className="flex-1 h-11 rounded-xl font-bold border-slate-200">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { 
                if (userToDelete?.id === profile?.uid) return;
                const userRef = doc(db, 'users', userToDelete.id);
                deleteDoc(userRef)
                  .then(() => toast({ title: 'Perfil eliminado' }))
                  .catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'delete' })));
                setIsDeleteDialogOpen(false);
              }} className="flex-1 h-11 bg-rose-500 hover:bg-rose-600 rounded-xl font-bold text-white shadow-lg">Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
