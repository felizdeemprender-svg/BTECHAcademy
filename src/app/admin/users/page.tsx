'use client';


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
import { Shield, User as UserIcon, GraduationCap, Search, Trash2, UserPlus, Loader2, Save, Globe, Info, KeyRound, Fingerprint, Target, Zap, Users as UsersIcon, ClipboardList, Check, Rocket, ExternalLink, LayoutIcon, Sparkles, Building2, Video, Mail, Megaphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { generatePermissionsFromPlan } from '@/lib/subscription-permissions';
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

const MAIN_ROLES = [
  { id: 'alumno', label: 'Alumno', icon: UserIcon, desc: 'Acceso al catálogo y progreso educativo.' },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap, desc: 'Gestión académica y creación de contenidos.' },
  { id: 'empresa', label: 'Empresa', icon: Building2, desc: 'Organización con múltiples tutores y gestión de equipo.' },
  { id: 'marketing', label: 'Marketing', icon: Rocket, desc: 'Gestión de campañas y flujos de marketing.' },
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Control de infraestructura global (Solo Super Admin).' }
];

const MENTOR_ACADEMIC_SUB_PERMISSIONS = [
  { id: 'academic_management', label: 'Gestión Académica', icon: GraduationCap, desc: 'Cursos y temarios' },
  { id: 'mentor_challenges', label: 'Desafíos (Mentor)', icon: Target, desc: 'Tareas y evaluación IA' },
  { id: 'students_view', label: 'Alumnos', icon: UsersIcon, desc: 'Comunidad y expedientes' },
  { id: 'followups_management', label: 'Seguimientos', icon: ClipboardList, desc: 'Sesiones y tutorías' },
];

const MARKETING_SUB_PERMISSIONS = [
  { id: 'marketing_campaigns', label: 'Creación de Campañas', icon: Rocket, desc: 'Diseño y lanzamiento de campañas multicanal' },
  { id: 'video_creation', label: 'Creación de Videos IA', icon: Video, desc: 'Producción de videos, guiones y avatares' },
  { id: 'marketing_access', label: 'Motor de Emails', icon: Mail, desc: 'Secuencias automatizadas y correos' },
  { id: 'landing_access', label: 'Landings y Embajadores', icon: LayoutIcon, desc: 'Sitios y afiliados' },
  { id: 'automations_access', label: 'Evo Automations', icon: Sparkles, desc: 'Flujos automáticos' },
];

const MENTOR_SUB_PERMISSIONS = [
  ...MENTOR_ACADEMIC_SUB_PERMISSIONS,
  ...MARKETING_SUB_PERMISSIONS,
];

export default function AdminUsersPage() {
  const db = useFirestore();
  const { user: authUser, profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const isSuperAdminCaller = profile?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isEmpresaCaller = profile?.roles?.includes('empresa') || profile?.companyRole === 'owner';
  
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
  const [apiCompanies, setApiCompanies] = useState<Array<{ id: string; name: string; ownerId?: string }>>([]);
  
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    roles: ['alumno'] as string[],
    mentorPermissions: [] as string[]
  });

  const usersQuery = useMemoFirebase(() => {
    if (isAuthLoading) return null;
    if (profile?.roles?.includes('admin')) {
      return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    }
    if (isEmpresaCaller) {
      const callerCompanyId = profile?.companyId || profile?.uid;
      return query(collection(db, 'users'), where('companyId', '==', callerCompanyId));
    }
    return null;
  }, [db, profile, isAuthLoading, isEmpresaCaller]);

  const { data: usersRaw, isLoading } = useCollection(usersQuery);

  // Cargar planes de suscripción en tiempo real
  const plansQuery = useMemoFirebase(() => {
    return query(collection(db, 'subscriptionPlans'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: subscriptionPlans = [] } = useCollection(plansQuery);

  // Cargar empresas vía Firestore directo si estuviera habilitado en reglas
  const companiesQuery = useMemoFirebase(() => {
    return query(collection(db, 'companies'));
  }, [db]);
  const { data: companiesRaw = [] } = useCollection(companiesQuery);

  // Cargar empresas vía API administrativa (Admin SDK) para garantizar resolución incluso si falla lectura directa
  useEffect(() => {
    let isMounted = true;
    async function loadCompaniesFromApi() {
      try {
        const token = await authUser?.getIdToken();
        if (!token) return;
        const res = await fetch('/api/company?all=true', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && isMounted) {
            setApiCompanies(json.data);
          }
        }
      } catch {
        // Fallback transparente a usersRaw
      }
    }
    if (profile?.roles?.includes('admin')) {
      loadCompaniesFromApi();
    }
    return () => { isMounted = false; };
  }, [authUser, profile]);

  const companiesMap = useMemo(() => {
    const map = new Map<string, string>();
    // 1. Desde API administrativa (Admin SDK)
    for (const c of apiCompanies) {
      if (c?.id && c?.name) {
        map.set(c.id, c.name);
        if (c.ownerId) map.set(c.ownerId, c.name);
      }
    }
    // 2. Desde collection directa (si está disponible en reglas)
    for (const c of companiesRaw || []) {
      if (c?.id && c?.name) {
        map.set(c.id, c.name);
        if ((c as any).ownerId) map.set((c as any).ownerId, c.name);
      }
    }
    // 3. Desde usersRaw: cualquier usuario con rol empresa u owner
    for (const u of usersRaw || []) {
      if (u.roles?.includes('empresa') || u.isEnterprise || u.companyRole === 'owner') {
        const compName = u.companyName || u.displayName || u.email?.split('@')[0];
        if (compName) {
          if (u.id) map.set(u.id, compName);
          if (u.uid) map.set(u.uid, compName);
          if (u.companyId) map.set(u.companyId, compName);
        }
      }
    }
    // 4. Desde el perfil del usuario llamante si es empresa
    if (profile) {
      const callerCompName = profile.companyName || profile.displayName || profile.email?.split('@')[0];
      if (callerCompName) {
        if (profile.id) map.set(profile.id, callerCompName);
        if (profile.uid) map.set(profile.uid, callerCompName);
        if (profile.companyId) map.set(profile.companyId, callerCompName);
      }
    }
    return map;
  }, [apiCompanies, companiesRaw, usersRaw, profile]);

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

    // Regla estricta: un admin NO puede otorgar o remover el rol de admin. Solo el super admin (felizdeemprender@gmail.com).
    if (roleToToggle === 'admin' && !isSuperAdminCaller) {
      toast({
        variant: 'destructive',
        title: 'Acción No Permitida',
        description: 'Solo el Super Admin (felizdeemprender@gmail.com) puede otorgar o revocar el rol de Administrador.'
      });
      return;
    }

    // Regla de potestad corporativa: una empresa solo puede gestionar roles mentor y marketing
    if (isEmpresaCaller && !isSuperAdminCaller && (roleToToggle === 'admin' || roleToToggle === 'empresa' || roleToToggle === 'alumno')) {
      toast({
        variant: 'destructive',
        title: 'Acción No Permitida',
        description: 'La empresa solo tiene potestad para gestionar los roles de Mentor y Marketing.',
      });
      return;
    }
    
    const currentRoles = pendingUser.roles || [];
    const isRemoving = currentRoles.includes(roleToToggle);
    
    if (pendingUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && isRemoving && (roleToToggle === 'admin' || roleToToggle === 'mentor')) {
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

    if (roleToToggle === 'mentor' && !isRemoving) {
      const academicIds = MENTOR_ACADEMIC_SUB_PERMISSIONS.map(p => p.id);
      newPermissions.mentorPermissions = Array.from(new Set([...(newPermissions.mentorPermissions || []), ...academicIds]));
    }

    if (roleToToggle === 'marketing' && !isRemoving) {
      const marketingIds = MARKETING_SUB_PERMISSIONS.map(p => p.id);
      newPermissions.mentorPermissions = Array.from(new Set([...(newPermissions.mentorPermissions || []), ...marketingIds]));
    }

    if (roleToToggle === 'empresa') {
      const willHaveEmpresa = !isRemoving;
      newPermissions.isEnterprise = willHaveEmpresa;
      if (willHaveEmpresa && !newPermissions.companyRole) {
        newPermissions.companyRole = 'owner';
      }
      if (newPermissions.subscription) {
        newPermissions.subscription.isEnterprise = willHaveEmpresa;
        if (willHaveEmpresa && !newPermissions.subscription.limits?.maxTutors) {
          newPermissions.subscription.limits.maxTutors = 5;
        }
      }
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

  const getPlanDisplayPrice = (plan: any) => {
    if (!plan) return '';
    if (plan.type === 'free') return 'Gratis';
    const rawAmount = plan.pricing?.amount ?? plan.price ?? plan.fixedAmount;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '' && !isNaN(Number(rawAmount))) {
      return `$${Number(rawAmount)}`;
    }
    if (plan.percentageRate !== undefined && plan.percentageRate !== null && !isNaN(Number(plan.percentageRate))) {
      return `${plan.percentageRate}%`;
    }
    return 'Fijo';
  };

  const openPermissionsModal = (user: any) => {
    setUserForPermissions(user);
    const cloned = JSON.parse(JSON.stringify(user));
    const isEnt = cloned.roles?.includes('empresa') || cloned.isEnterprise === true;
    
    if (!cloned.subscription) {
      cloned.subscription = {
        status: SubscriptionStatus.ACTIVE,
        type: isEnt ? 'fixed' : 'free',
        isEnterprise: isEnt,
        hasPremiumAI: false,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        limits: {
          maxCourses: 0,
          maxStudents: 0,
          maxTutors: isEnt ? 10 : undefined,
          hasCustomBranding: false,
          hasAnalytics: false,
          hasPrioritySupport: false
        },
        aiQuotas: {
          totalCredits: 0,
          usedCredits: 0
        },
        invitationsPerCourse: 0,
        publicProfile: { enabled: false, showStats: false, showContact: false, allowPublicCourses: false }
      };
    } else {
      if (!cloned.subscription.limits) {
        cloned.subscription.limits = { maxCourses: 0, maxStudents: 0 };
      }
      if (!cloned.subscription.aiQuotas) {
        cloned.subscription.aiQuotas = { totalCredits: 0, usedCredits: 0 };
      }
      if (isEnt && cloned.subscription.limits.maxTutors === undefined) {
        cloned.subscription.limits.maxTutors = 10;
      }
    }
    
    setPendingUser(cloned);
    setIsPermissionsOpen(true);
  };

  const updateSubscriptionPlan = (plan: any) => {
    if (!pendingUser || !plan) return;
    
    const startDate = new Date().toISOString();
    const durationMonths = plan.durationMonths || 12;
    const endDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    const isPlanEnterprise = plan.targetAudience === 'enterprise' || plan.isEnterprise === true;
    const parsedPrice = Number(plan.pricing?.amount ?? plan.price ?? plan.fixedAmount ?? 0);

    const subscription = {
      status: SubscriptionStatus.ACTIVE,
      type: plan.type,
      planId: plan.id, // CRITICAL: Para identificar el plan en upgrades
      planName: plan.name, // Sincronizado con el sistema de facturación
      name: plan.name, // Mantener por compatibilidad con el Select local
      isEnterprise: isPlanEnterprise,
      hasPremiumAI: plan.entitlements?.aiQuotas?.hasPremiumAI === true || plan.hasPremiumAI === true,
      startDate,
      endDate,
      hasCustomPage: plan.hasCustomPage || false,
      fixedAmount: parsedPrice,
      percentageRate: plan.percentageRate || 0,
      requiresFreeCourses: plan.requiresFreeCourses || false,
      freeCoursesCount: plan.freeCoursesCount || 0,
      invitationsPerCourse: plan.entitlements?.invitationsPerCourse ?? plan.invitationsPerCourse ?? 0,
      aiQuotas: {
        totalCredits: plan.entitlements?.aiQuotas?.totalCredits ?? plan.aiQuotas?.totalCredits ?? 0,
        usedCredits: 0 // Reset de uso al asignar nuevo plan manual si es necesario, o mantener previo
      },
      rechargeOptions: plan.entitlements?.aiQuotas?.rechargeOptions ?? plan.rechargeOptions ?? [],
      observations: `Plan ${plan.name} asignado manualmente por admin`,
      autoRenew: true,
      limits: {
        maxCourses: plan.entitlements?.limits?.maxCourses ?? plan.limits?.maxCourses ?? 0,
        maxStudents: plan.entitlements?.limits?.maxStudents ?? plan.limits?.maxStudents ?? 0,
        maxTutors: plan.entitlements?.limits?.maxTutors ?? plan.limits?.maxTutors ?? (isPlanEnterprise ? 10 : undefined),
        hasCustomBranding: plan.entitlements?.limits?.hasCustomBranding ?? plan.limits?.hasCustomBranding ?? false,
        hasAnalytics: plan.entitlements?.limits?.hasAnalytics ?? plan.limits?.hasAnalytics ?? false,
        hasPrioritySupport: plan.entitlements?.limits?.hasPrioritySupport ?? plan.limits?.hasPrioritySupport ?? false
      },
      publicProfile: {
        enabled: plan.hasCustomPage || false,
        showStats: false,
        showContact: false,
        allowPublicCourses: false
      }
    };
    
    // Auto-populate mentor permissions based on the new plan
    const generatedPerms = generatePermissionsFromPlan(plan);
    const planPermissions = generatedPerms.length > 0 
      ? generatedPerms 
      : (plan.type === 'free' ? ['academic_management'] : MENTOR_SUB_PERMISSIONS.map(p => p.id));

    // Roles propuestos según el plan
    let updatedRoles = Array.from(new Set([...(pendingUser.roles || []), 'alumno', 'mentor']));
    if (isPlanEnterprise) {
      if (!updatedRoles.includes('empresa')) {
        updatedRoles.push('empresa');
      }
    } else {
      updatedRoles = updatedRoles.filter((r: string) => r !== 'empresa');
    }

    setPendingUser({
      ...pendingUser,
      roles: updatedRoles,
      isEnterprise: isPlanEnterprise,
      companyRole: isPlanEnterprise ? (pendingUser.companyRole || 'owner') : undefined,
      subscription,
      mentorPermissions: planPermissions
    });
  };

  const handleSaveAllChanges = async () => {
    if (!pendingUser) return;
    setLoading(true);
    
    try {
      // Regla estricta: un admin no puede otorgar o remover el rol de admin. Solo el super admin.
      const originalRoles = userForPermissions?.roles || [];
      const hadAdminOriginally = originalRoles.includes('admin');
      const hasAdminNow = pendingUser.roles.includes('admin');
      
      if (hadAdminOriginally !== hasAdminNow && !isSuperAdminCaller) {
        toast({
          variant: 'destructive',
          title: 'Acción Bloqueada',
          description: 'Solo el Super Admin (felizdeemprender@gmail.com) puede otorgar o revocar el rol de Administrador.'
        });
        setLoading(false);
        return;
      }

      // Regla estricta: potestad institucional de la empresa restringida a mentor y marketing
      if (isEmpresaCaller && !isSuperAdminCaller) {
        const invalidRoles = pendingUser.roles.filter((r: string) => r !== 'mentor' && r !== 'marketing');
        if (invalidRoles.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Acción Bloqueada',
            description: 'La empresa solo puede asignar o modificar los roles Mentor y Marketing.'
          });
          setLoading(false);
          return;
        }
      }

      // Proteger la cuenta del Super Admin
      if (pendingUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        if (!pendingUser.roles.includes('admin')) {
          pendingUser.roles.push('admin');
        }
      }

      const userRef = doc(db, 'users', pendingUser.id);
      const isMentor = pendingUser.roles.includes('mentor');
      const isEnterprise = pendingUser.roles.includes('empresa') || pendingUser.subscription?.isEnterprise === true;

      const updateData: Record<string, any> = {
        roles: pendingUser.roles,
        isMentor: isMentor, // Sincronizar flag isMentor en la raíz
        isEnterprise: isEnterprise, // Sincronizar flag isEnterprise en la raíz
        mentorPermissions: pendingUser.mentorPermissions || [],
        subscription: pendingUser.subscription ? {
          ...pendingUser.subscription,
          isEnterprise: isEnterprise
        } : null,
        updatedAt: serverTimestamp()
      };

      if (isEnterprise && !pendingUser.companyRole) {
        updateData.companyRole = 'owner';
      }

      await updateDoc(userRef, updateData);

      // Sincronizar cursos existentes del mentor para asegurar vinculación con la empresa
      if (isEnterprise) {
        try {
          const userCoursesSnap = await getDocs(query(collection(db, 'courses'), where('mentorId', '==', pendingUser.id)));
          const batchPromises = userCoursesSnap.docs
            .filter(d => !d.data().companyId)
            .map(d => updateDoc(d.ref, { companyId: pendingUser.id }));
          if (batchPromises.length > 0) {
            await Promise.all(batchPromises);
          }
        } catch (syncErr) {
          console.warn('[AdminUsers] No se pudieron sincronizar companyId en cursos:', syncErr);
        }
      }
      
      // Refrescar el profile del usuario si se actualizó su suscripción
      if (pendingUser.subscription) {
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

  const toggleActiveStatus = (userId: string, currentEmail: string, currentState: boolean, userRoles: string[] = []) => {
    if (currentEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && currentState) {
      toast({ 
        variant: 'destructive', 
        title: 'Acción Bloqueada', 
        description: 'La cuenta del Super Admin (felizdeemprender@gmail.com) no puede ser suspendida.' 
      });
      return;
    }

    if (userRoles.includes('admin') && !isSuperAdminCaller) {
      toast({
        variant: 'destructive',
        title: 'Acción Bloqueada',
        description: 'Solo el Super Admin puede suspender o reactivar cuentas Administradoras.'
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

    if (newUserData.roles.includes('admin') && !isSuperAdminCaller) {
      toast({
        variant: 'destructive',
        title: 'Acción Bloqueada',
        description: 'Solo el Super Admin (felizdeemprender@gmail.com) puede crear usuarios Administradores.'
      });
      return;
    }

    // Regla de potestad corporativa
    if (isEmpresaCaller && !isSuperAdminCaller) {
      const invalidRoles = newUserData.roles.filter((r) => r !== 'mentor' && r !== 'marketing');
      if (invalidRoles.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Acción Bloqueada',
          description: 'La empresa solo tiene potestad para dar de alta usuarios con los roles Mentor y Marketing.'
        });
        return;
      }
    }

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
      
      const callerCompanyId = profile?.companyId || profile?.uid;
      const callerCompanyName = profile?.companyName || profile?.displayName || 'Empresa';
      const isEnterprise = newUserData.roles.includes('empresa');
      const isMentor = newUserData.roles.includes('mentor');
      const isMarketing = newUserData.roles.includes('marketing');

      const writeData: Record<string, any> = {
        uid: tempId, 
        email: normalizedEmail,
        displayName: newUserData.displayName || normalizedEmail.split('@')[0],
        roles: newUserData.roles,
        isMentor: isMentor,
        isEnterprise: isEnterprise,
        ...(isEnterprise ? { companyRole: 'owner', companyName: newUserData.displayName || normalizedEmail.split('@')[0] } : {}),
        ...(isEmpresaCaller && !isEnterprise ? { companyId: callerCompanyId, companyRole: 'tutor', companyName: callerCompanyName } : {}),
        mentorPermissions: (isMentor || isMarketing) ? newUserData.mentorPermissions : [],
        isActive: true,
        createdAt: serverTimestamp(),
        isPreRegistered: true 
      };

      await setDoc(userRef, writeData);

      // Si quien crea es una empresa, vincular simultáneamente en la subcolección de tutores de la empresa
      if (isEmpresaCaller && callerCompanyId) {
        try {
          const tutorBindingRef = doc(db, 'companies', callerCompanyId, 'tutors', tempId);
          await setDoc(tutorBindingRef, {
            companyId: callerCompanyId,
            tutorId: tempId,
            email: normalizedEmail,
            displayName: newUserData.displayName || normalizedEmail.split('@')[0],
            roles: newUserData.roles.filter((r: string) => r === 'mentor' || r === 'marketing'),
            status: 'active',
            permissions: {
              canCreateCourses: isMentor ? newUserData.mentorPermissions.includes('academic_management') : false,
              canCreatePrograms: isMentor ? newUserData.mentorPermissions.includes('mentor_challenges') : false,
              canManageStudents: isMentor ? newUserData.mentorPermissions.includes('students_view') : false,
              canAccessMarketing: isMarketing ? newUserData.mentorPermissions.includes('marketing_access') : false,
              canCreateCampaigns: isMarketing ? newUserData.mentorPermissions.includes('marketing_campaigns') : false,
              canCreateVideos: isMarketing ? newUserData.mentorPermissions.includes('video_creation') : false,
            },
            assignedStudentsCount: 0,
            joinedAt: serverTimestamp(),
          }, { merge: true });
        } catch (bindingErr) {
          console.warn('[AdminUsers] Error vinculando tutor a empresa:', bindingErr);
        }
      }

      setIsAddUserOpen(false);
      setNewUserData({ email: '', displayName: '', roles: ['alumno'], mentorPermissions: [] });
      toast({ 
        title: 'Perfil pre-registrado', 
        description: isEmpresaCaller ? 'Tutor registrado y vinculado a la empresa con éxito.' : 'El usuario ya puede ser activado por el alumno.' 
      });
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${newUserData.email}`,
        operation: 'create'
      }));
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
                  {['alumno', 'mentor', 'empresa', 'marketing', 'admin'].map(role => (
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
                            {isSuperAdminAccount ? (
                              <Badge className="bg-primary text-[7px] text-white h-4 px-1.5 border-none font-bold uppercase tracking-wider">SUPER ADMIN</Badge>
                            ) : user.roles?.includes('admin') ? (
                              <Badge className="bg-foreground text-[7px] text-white h-4 px-1.5 border-none uppercase tracking-wider">ADMIN</Badge>
                            ) : null}
                            {isInvitation && <Badge className="bg-warn/15 text-warn text-[7px] h-4 px-1.5 border-none font-black uppercase tracking-tighter">Invitación</Badge>}
                          </div>
                            <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                            <div className="flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity" title={`Internal ID: ${user.id}`}>
                              <Fingerprint className="h-2.5 w-2.5" />
                              <span className="text-[8px] font-mono">{user.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                          {user.companyId && !user.roles?.includes('empresa') && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/5 flex items-center gap-1 px-2 py-0.5 w-fit">
                                <Building2 className="h-3 w-3 text-primary shrink-0" />
                                <span>Empresa: {companiesMap.get(user.companyId) || user.companyName || 'Empresa Adscrita'}</span>
                              </Badge>
                            </div>
                          )}
                          {user.roles?.includes('empresa') && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 flex items-center gap-1 px-2 py-0.5 w-fit">
                                <Building2 className="h-3 w-3 text-indigo-600 shrink-0" />
                                <span>Titular Empresa: {user.companyName || companiesMap.get(user.id) || companiesMap.get(user.companyId) || user.displayName}</span>
                              </Badge>
                            </div>
                          )}
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
                          <Badge 
                            key={role} 
                            variant="outline" 
                            className={cn(
                              "text-[9px] uppercase font-bold px-2 py-0 h-5 border-border",
                              role === 'admin' ? "bg-red-50 text-red-700 border-red-200" :
                              role === 'empresa' ? "bg-primary/10 text-primary border-primary/20" :
                              role === 'mentor' ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "text-muted-foreground bg-muted"
                            )}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                      {user.roles?.includes('mentor') && (
                        <p className="text-[8px] font-bold text-primary uppercase mt-1">
                          Mentor: {(user.mentorPermissions || []).length}/{MENTOR_SUB_PERMISSIONS.length}
                          {user.subscription?.limits?.maxStudents && ` | Alum: ${user.subscription.limits.maxStudents === -1 ? '∞' : user.subscription.limits.maxStudents}`}
                        </p>
                      )}
                      {user.roles?.includes('empresa') && (
                        <p className="text-[8px] font-bold text-primary uppercase mt-1">
                          Empresa {user.subscription?.limits?.maxTutors ? `| Tutores: ${user.subscription.limits.maxTutors === -1 ? '∞' : user.subscription.limits.maxTutors}` : ''}
                          {user.subscription?.limits?.maxStudents ? ` | Alum: ${user.subscription.limits.maxStudents === -1 ? '∞' : user.subscription.limits.maxStudents}` : ''}
                        </p>
                      )}
                      {user.companyId && !user.roles?.includes('empresa') && (
                        <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5 flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5" />
                          Docente de {companiesMap.get(user.companyId) || user.companyName || 'Empresa'}
                        </p>
                      )}
                    </div>
                  ),
                },
                ...(roleFilter.length === 0 || roleFilter.includes('mentor') || roleFilter.includes('empresa')
                  ? [{
                      key: 'plan',
                      header: 'Plan',
                      align: 'center' as const,
                      hideOnMobile: true,
                      cell: (user: any) => (
                        (user.roles?.includes('mentor') || user.roles?.includes('empresa') || user.isEnterprise) && user.subscription ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge className={cn(
                              "text-[8px] uppercase font-bold px-2 h-4 border-none",
                              user.subscription.type === 'free' ? "bg-muted text-muted-foreground" :
                              user.subscription.type === 'fixed' ? "bg-success/15 text-success" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {user.subscription.name || (
                                user.subscription.type === 'free' ? 'Gratis' :
                                user.subscription.type === 'fixed' ? `$${user.subscription.fixedAmount}` :
                                `${user.subscription.percentageRate}%`
                              )}
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
                        user.roles?.includes('alumno') && !user.roles?.includes('mentor') && !user.roles?.includes('empresa') ? (
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
                    const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                    const isTargetAdmin = (user.roles || []).includes('admin');
                    const canToggle = !isSuperAdminAccount && (isSuperAdminCaller || !isTargetAdmin);

                    return (
                      <div className="flex items-center justify-center gap-3">
                        <Badge className={cn(
                          "text-[9px] uppercase tracking-widest px-2 h-5 border-none",
                          user.isActive !== false ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {user.isActive !== false ? 'Activo' : 'Suspendido'}
                        </Badge>
                        <Switch
                          disabled={!canToggle}
                          checked={user.isActive !== false}
                          onCheckedChange={() => toggleActiveStatus(user.id, user.email, user.isActive !== false, user.roles || [])}
                          className="scale-75"
                          title={!canToggle ? (isSuperAdminAccount ? "La cuenta del Super Admin no puede ser suspendida" : "Solo el Super Admin puede suspender administradores") : undefined}
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
                    const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                    const isTargetAdmin = (user.roles || []).includes('admin');
                    const canDelete = !isSuperAdminAccount && user.id !== profile?.uid && (isSuperAdminCaller || !isTargetAdmin);

                    return (
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openPermissionsModal(user)}
                          title="Gestionar permisos"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-danger hover:bg-danger/10"
                          disabled={!canDelete}
                          onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                          title={!canDelete ? (isSuperAdminAccount ? "No se puede eliminar la cuenta del Super Admin" : "Solo el Super Admin puede eliminar administradores") : "Eliminar usuario"}
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
                const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
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
                        {user.companyId && !user.roles?.includes('empresa') && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/5 flex items-center gap-1 px-1.5 py-0.5 w-fit">
                              <Building2 className="h-2.5 w-2.5 text-primary shrink-0" />
                              <span>Empresa: {companiesMap.get(user.companyId) || user.companyName || 'Empresa Adscrita'}</span>
                            </Badge>
                          </div>
                        )}
                        {user.roles?.includes('empresa') && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 flex items-center gap-1 px-1.5 py-0.5 w-fit">
                              <Building2 className="h-2.5 w-2.5 text-indigo-600 shrink-0" />
                              <span>Titular: {user.companyName || companiesMap.get(user.id) || companiesMap.get(user.companyId) || user.displayName}</span>
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={cn(
                        "text-[8px] uppercase tracking-widest px-2 h-5 border-none",
                        user.isActive !== false ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      )}>
                        {user.isActive !== false ? 'Activo' : 'Suspendido'}
                      </Badge>
                      {isSuperAdminAccount ? (
                        <Badge className="bg-primary text-[7px] text-white h-4 px-1.5 border-none font-bold uppercase tracking-wider">SUPER ADMIN</Badge>
                      ) : user.roles?.includes('admin') ? (
                        <Badge className="bg-foreground text-[7px] text-white h-4 px-1.5 border-none uppercase tracking-wider">ADMIN</Badge>
                      ) : null}
                      {isInvitation && <Badge className="bg-warn/15 text-warn text-[7px] h-4 px-1.5 border-none font-black uppercase tracking-tighter">Invitación</Badge>}
                    </div>
                  </div>
                );
              }}
              mobileCardFooter={(user) => {
                const isSuperAdminAccount = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                const isTargetAdmin = (user.roles || []).includes('admin');
                const canDelete = !isSuperAdminAccount && user.id !== profile?.uid && (isSuperAdminCaller || !isTargetAdmin);

                return (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openPermissionsModal(user)}
                      className="flex-1 h-11 rounded-xl font-bold text-xs gap-2"
                    >
                      <Shield className="h-4 w-4" /> Permisos
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!canDelete}
                      onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                      className="flex-1 h-11 rounded-xl font-bold text-xs gap-2 text-destructive hover:text-destructive"
                      title={!canDelete ? (isSuperAdminAccount ? "No se puede eliminar al Super Admin" : "Solo el Super Admin puede eliminar administradores") : undefined}
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
          <DialogContent className="max-w-xl">
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
                      {(isEmpresaCaller && !isSuperAdminCaller ? ['mentor', 'marketing'] : ['alumno', 'mentor', 'empresa', 'marketing', 'admin']).map(role => {
                        const isAdminRole = role === 'admin';
                        const isDisabled = isAdminRole && !isSuperAdminCaller;

                        return (
                          <div key={role} className="flex items-center gap-2">
                            <Checkbox 
                              id={`new-role-${role}`} 
                              disabled={isDisabled}
                              checked={newUserData.roles.includes(role)} 
                              onCheckedChange={(checked) => {
                                if (isAdminRole && !isSuperAdminCaller) return;
                                let roles = checked ? [...newUserData.roles, role] : newUserData.roles.filter(r => r !== role);
                                let perms = newUserData.mentorPermissions;
                                
                                if (role === 'mentor' && checked) {
                                  const academicIds = MENTOR_ACADEMIC_SUB_PERMISSIONS.map(p => p.id);
                                  perms = Array.from(new Set([...perms, ...academicIds]));
                                }
                                if (role === 'marketing' && checked) {
                                  const marketingIds = MARKETING_SUB_PERMISSIONS.map(p => p.id);
                                  perms = Array.from(new Set([...perms, ...marketingIds]));
                                }
                                
                                setNewUserData({...newUserData, roles, mentorPermissions: perms});
                              }} 
                            />
                            <Label 
                              htmlFor={`new-role-${role}`} 
                              className={cn(
                                "text-[10px] font-bold uppercase cursor-pointer",
                                isDisabled ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground"
                              )}
                              title={isDisabled ? "Solo el Super Admin puede otorgar el rol de Administrador" : undefined}
                            >
                              {role}
                              {isDisabled && <span className="text-[8px] text-warn ml-1 lowercase font-normal">(solo super admin)</span>}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Capacidades Académicas (Mentor) */}
                  {newUserData.roles.includes('mentor') && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capacidades Académicas (Mentor)</Label>
                        <button 
                          onClick={() => {
                            const academicIds = MENTOR_ACADEMIC_SUB_PERMISSIONS.map(p => p.id);
                            const perms = Array.from(new Set([...newUserData.mentorPermissions, ...academicIds]));
                            setNewUserData({...newUserData, mentorPermissions: perms});
                          }}
                          className="text-[8px] font-bold text-accent uppercase hover:underline"
                        >
                          Marcar Todas
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {MENTOR_ACADEMIC_SUB_PERMISSIONS.map((perm) => (
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

                  {/* Capacidades de Crecimiento (Marketing) */}
                  {newUserData.roles.includes('marketing') && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capacidades de Crecimiento (Marketing)</Label>
                        <button 
                          onClick={() => {
                            const marketingIds = MARKETING_SUB_PERMISSIONS.map(p => p.id);
                            const perms = Array.from(new Set([...newUserData.mentorPermissions, ...marketingIds]));
                            setNewUserData({...newUserData, mentorPermissions: perms});
                          }}
                          className="text-[8px] font-bold text-accent uppercase hover:underline"
                        >
                          Marcar Todas
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {MARKETING_SUB_PERMISSIONS.map((perm) => (
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
          <DialogContent className="max-w-3xl">
            <div className="px-10 pt-10 relative overflow-hidden">
              <Shield className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10"><Shield className="h-7 w-7 text-accent" /> Gestionar Permisos</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-2 uppercase tracking-widest font-black relative z-10">Ajuste de roles institucionales y sub-capacidades</DialogDescription>
            </div>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="px-10 pb-10 space-y-8">
                {/* IDENTIDAD DEL USUARIO */}
                <div className="flex items-center gap-6 p-6 bg-secondary/10 rounded-3xl border border-primary/5">
                  <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                    <AvatarImage src={pendingUser?.photoURL || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground font-bold uppercase text-xl">
                      {pendingUser?.displayName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-xl leading-tight truncate">{pendingUser?.displayName}</p>
                    <p className="text-sm text-muted-foreground font-medium truncate">{pendingUser?.email}</p>
                  </div>
                </div>

                {/* 1. PLAN DE SUSCRIPCIÓN Y LÍMITES INSTITUCIONALES (PRIMERO) */}
                {(() => {
                  const isUserEnterprise = (pendingUser?.roles || []).includes('empresa') || 
                    pendingUser?.subscription?.isEnterprise === true || 
                    pendingUser?.isEnterprise === true;

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                          {isUserEnterprise ? 'Plan de Suscripción (Empresa)' : 'Plan de Suscripción (Abono)'}
                        </Label>
                        <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase px-2 h-4">
                          {isUserEnterprise ? 'Control B2B Multi-Tenant' : 'Control de Límites'}
                        </Badge>
                      </div>
                      
                      <div className="p-6 bg-muted/40 rounded-3xl border border-border space-y-5">
                        {/* Selector de Plan */}
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                            {isUserEnterprise ? 'Seleccionar Plan Corporativo / Empresa' : 'Seleccionar Plan para el Mentor'}
                          </Label>
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
                              {(subscriptionPlans || []).map((plan) => {
                                const isEnterprisePlan = plan.targetAudience === 'enterprise' || plan.isEnterprise;
                                return (
                                  <SelectItem key={plan.id} value={plan.name}>
                                    <div className="flex items-center justify-between w-full gap-4">
                                      <span className="font-bold">{plan.name}</span>
                                      <div className="flex items-center gap-1.5">
                                        {isEnterprisePlan && (
                                          <Badge className="bg-primary/10 text-primary border-none text-[8px] h-4 font-bold">Empresa</Badge>
                                        )}
                                        <Badge variant="outline" className="text-[9px] h-4 font-bold">
                                          {getPlanDisplayPrice(plan)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Tipo de Perfil Institucional - SOLO INFORMATIVO */}
                        <div className="space-y-2.5 p-4 bg-white rounded-2xl border border-border">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo de Perfil Institucional</Label>
                            <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              Informativo (Definido por el Plan)
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <div className={cn(
                              "p-3 rounded-xl border flex items-center justify-between transition-all",
                              !isUserEnterprise 
                                ? "bg-primary/5 border-primary/30 shadow-sm" 
                                : "bg-muted/40 border-muted text-muted-foreground opacity-60"
                            )}>
                              <div className="flex items-center gap-2.5">
                                <GraduationCap className={cn("h-4 w-4", !isUserEnterprise ? "text-primary" : "text-muted-foreground")} />
                                <span className={cn("text-xs font-bold uppercase", !isUserEnterprise ? "text-foreground" : "text-muted-foreground")}>
                                  Tutor/Mentor
                                </span>
                              </div>
                              {!isUserEnterprise && (
                                <Badge className="bg-primary text-[8px] text-white h-4 px-1.5 border-none font-bold">Activo</Badge>
                              )}
                            </div>

                            <div className={cn(
                              "p-3 rounded-xl border flex items-center justify-between transition-all",
                              isUserEnterprise 
                                ? "bg-primary/5 border-primary/30 shadow-sm" 
                                : "bg-muted/40 border-muted text-muted-foreground opacity-60"
                            )}>
                              <div className="flex items-center gap-2.5">
                                <Building2 className={cn("h-4 w-4", isUserEnterprise ? "text-primary" : "text-muted-foreground")} />
                                <span className={cn("text-xs font-bold uppercase", isUserEnterprise ? "text-primary font-black" : "text-muted-foreground")}>
                                  Empresa
                                </span>
                              </div>
                              {isUserEnterprise && (
                                <Badge className="bg-primary text-[8px] text-white h-4 px-1.5 border-none font-bold">Activo</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground italic mt-1">
                            * Los perfiles de Empresa no se muestran en el catálogo público general y pueden vincular y gestionar múltiples tutores asociados.
                          </p>
                        </div>

                        {/* Límites de forma ordenada */}
                        <div className={cn(
                          "grid gap-3.5 mt-4",
                          isUserEnterprise ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                        )}>
                          {/* 1. IA Premium */}
                          <div className="space-y-1.5 p-3.5 bg-warn/10 rounded-2xl border border-warn/20 shadow-sm flex flex-col justify-between items-center text-center">
                            <Label htmlFor="limit-ai" className="text-[9px] font-black uppercase text-warn">IA Premium</Label>
                            <Switch 
                              id="limit-ai"
                              checked={pendingUser?.subscription?.hasPremiumAI === true}
                              onCheckedChange={(c) => {
                                const currentSub = pendingUser?.subscription || { 
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
                            <p className="text-[7px] text-warn/80 font-bold uppercase leading-tight">Motor Imagen 3</p>
                          </div>

                          {/* 2. Máx. Tutores (Si es Empresa) */}
                          {isUserEnterprise && (
                            <div className="space-y-1.5 p-3.5 bg-primary/5 rounded-2xl border border-primary/20 shadow-sm flex flex-col justify-between">
                              <Label htmlFor="limit-tutors" className="text-[9px] font-black uppercase text-primary text-center">Máx. Tutores</Label>
                              <Input 
                                id="limit-tutors"
                                name="limit-tutors"
                                type="number" 
                                value={pendingUser?.subscription?.limits?.maxTutors ?? 10}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setPendingUser({
                                    ...pendingUser,
                                    subscription: {
                                      ...pendingUser.subscription,
                                      limits: { ...(pendingUser.subscription?.limits || {}), maxTutors: isNaN(val) ? 0 : val }
                                    }
                                  });
                                }}
                                className="h-8 font-black text-primary border-none bg-white focus-visible:ring-1 text-center"
                              />
                              <p className="text-[7px] text-muted-foreground font-bold uppercase text-center">Límite de tutores</p>
                            </div>
                          )}

                          {/* 3. Máx. Publicados */}
                          <div className="space-y-1.5 p-3.5 bg-white rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                            <Label htmlFor="limit-courses" className="text-[9px] font-black uppercase text-muted-foreground text-center">Máx. Publicados</Label>
                            <Input 
                              id="limit-courses"
                              name="limit-courses"
                              type="number" 
                              value={pendingUser?.subscription?.limits?.maxCourses ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    limits: { ...(pendingUser.subscription?.limits || {}), maxCourses: isNaN(val) ? 0 : val }
                                  }
                                });
                              }}
                              className="h-8 font-black text-primary border-none bg-muted/50 focus-visible:ring-1 text-center"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase text-center">Cursos Activos</p>
                          </div>

                          {/* 4. Máx. Estudiantes */}
                          <div className="space-y-1.5 p-3.5 bg-white rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                            <Label htmlFor="limit-students" className="text-[9px] font-black uppercase text-muted-foreground text-center">Máx. Estudiantes</Label>
                            <Input 
                              id="limit-students"
                              name="limit-students"
                              type="number" 
                              value={pendingUser?.subscription?.limits?.maxStudents ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    limits: { ...(pendingUser.subscription?.limits || {}), maxStudents: isNaN(val) ? 0 : val }
                                  }
                                });
                              }}
                              className="h-8 font-black text-primary border-none bg-muted/50 focus-visible:ring-1 text-center"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase text-center">Límite de alumnos</p>
                          </div>

                          {/* 5. Créditos IA */}
                          <div className="space-y-1.5 p-3.5 bg-white rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                            <Label htmlFor="limit-credits" className="text-[9px] font-black uppercase text-muted-foreground text-center">Créditos IA</Label>
                            <Input 
                              id="limit-credits"
                              name="limit-credits"
                              type="number" 
                              value={pendingUser?.subscription?.aiQuotas?.totalCredits ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingUser({
                                  ...pendingUser,
                                  subscription: {
                                    ...pendingUser.subscription,
                                    aiQuotas: { 
                                      ...(pendingUser.subscription?.aiQuotas || {}), 
                                      totalCredits: isNaN(val) ? 0 : val 
                                    }
                                  }
                                });
                              }}
                              className="h-8 font-black text-primary border-none bg-muted/50 focus-visible:ring-1 text-center"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase text-center">Saldo del abono</p>
                          </div>

                          {/* 6. Invitaciones */}
                          <div className="space-y-1.5 p-3.5 bg-white rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                            <Label htmlFor="limit-invitations" className="text-[9px] font-black uppercase text-muted-foreground text-center">Invitaciones</Label>
                            <Input 
                              id="limit-invitations"
                              name="limit-invitations"
                              type="number" 
                              value={pendingUser?.subscription?.invitationsPerCourse ?? 0}
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
                              className="h-8 font-black text-primary border-none bg-muted/50 focus-visible:ring-1 text-center"
                            />
                            <p className="text-[7px] text-muted-foreground font-bold uppercase text-center">Por cada curso</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. ROLES PRINCIPALES (SEGUNDO) */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Roles Principales</Label>
                      <Badge variant="outline" className="text-[8px] font-bold h-4">Propuestos por el Plan</Badge>
                    </div>
                    {isEmpresaCaller && !isSuperAdminCaller ? (
                      <span className="text-[9px] font-bold text-muted-foreground italic">
                        * La potestad institucional de la empresa está restringida a los roles Mentor y Marketing.
                      </span>
                    ) : !isSuperAdminCaller ? (
                      <span className="text-[9px] font-bold text-muted-foreground italic">
                        * Solo el Super Admin ({SUPER_ADMIN_EMAIL}) puede otorgar el rol de Administrador.
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-3">
                    {MAIN_ROLES
                      .filter((role) => {
                        if (isEmpresaCaller && !isSuperAdminCaller) {
                          return role.id === 'mentor' || role.id === 'marketing';
                        }
                        return true;
                      })
                      .map((role) => {
                      const isSuperAdminAccount = pendingUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      const isAdminRole = role.id === 'admin';
                      const isProtectedRole = 
                        (isSuperAdminAccount && (isAdminRole || role.id === 'mentor')) ||
                        (isAdminRole && !isSuperAdminCaller);
                      
                      return (
                        <div key={role.id} className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                          isProtectedRole ? "bg-muted border-muted opacity-75" : "bg-white border-border hover:border-primary/20 hover:shadow-sm"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground border transition-colors",
                              !isProtectedRole && "group-hover:text-primary group-hover:bg-primary/5",
                              role.id === 'empresa' && "text-primary bg-primary/5",
                              (pendingUser?.roles || []).includes(role.id) && "text-primary bg-primary/10 border-primary/20"
                            )}>
                              <role.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground">{role.label}</p>
                                {isAdminRole && isSuperAdminAccount && (
                                  <Badge className="bg-primary text-[8px] text-white h-4 px-1.5 border-none font-bold">SUPER ADMIN</Badge>
                                )}
                                {isAdminRole && !isSuperAdminCaller && (
                                  <Badge variant="outline" className="text-[8px] text-warn border-warn/30 h-4 px-1.5 font-bold">Bloqueado</Badge>
                                )}
                                {role.id === 'empresa' && (
                                  <Badge className="bg-primary/10 text-primary text-[8px] h-4 px-1.5 border-none font-bold">Multi-Tenant</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5">{role.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isAdminRole && !isSuperAdminCaller && (
                              <span className="text-[8px] text-muted-foreground italic hidden sm:inline">Requiere Super Admin</span>
                            )}
                            <Switch 
                              disabled={isProtectedRole}
                              checked={(pendingUser?.roles || []).includes(role.id)} 
                              onCheckedChange={() => toggleRole(role.id)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3A. CAPACIDADES ACADÉMICAS (MENTOR) */}
                {((pendingUser?.roles || []).includes('mentor') || (pendingUser?.roles || []).includes('empresa')) && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capacidades Académicas (Mentor)</Label>
                        <Badge variant="outline" className="text-[8px] font-bold h-4">Gestión Formativa</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentPerms = pendingUser?.mentorPermissions || [];
                          const academicIds = MENTOR_ACADEMIC_SUB_PERMISSIONS.map(p => p.id);
                          const allSelected = academicIds.every(id => currentPerms.includes(id));
                          const newPerms = allSelected
                            ? currentPerms.filter((id: string) => !academicIds.includes(id))
                            : Array.from(new Set([...currentPerms, ...academicIds]));
                          setPendingUser({ ...pendingUser, mentorPermissions: newPerms });
                        }}
                        className="text-[9px] font-bold h-6 text-primary hover:text-primary/80"
                      >
                        {MENTOR_ACADEMIC_SUB_PERMISSIONS.every(p => (pendingUser?.mentorPermissions || []).includes(p.id)) ? 'Desmarcar Todas' : 'Marcar Todas'}
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {MENTOR_ACADEMIC_SUB_PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white group/perm hover:border-primary/20 transition-all shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-colors",
                              (pendingUser?.mentorPermissions || []).includes(perm.id) ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
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

                {/* 3B. CAPACIDADES DE CRECIMIENTO (MARKETING) */}
                {((pendingUser?.roles || []).includes('marketing') || (pendingUser?.roles || []).includes('empresa')) && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 pt-2 border-t border-border">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capacidades de Crecimiento (Marketing)</Label>
                        <Badge variant="outline" className="text-[8px] font-bold h-4">Campañas & Contenidos</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentPerms = pendingUser?.mentorPermissions || [];
                          const marketingIds = MARKETING_SUB_PERMISSIONS.map(p => p.id);
                          const allSelected = marketingIds.every(id => currentPerms.includes(id));
                          const newPerms = allSelected
                            ? currentPerms.filter((id: string) => !marketingIds.includes(id))
                            : Array.from(new Set([...currentPerms, ...marketingIds]));
                          setPendingUser({ ...pendingUser, mentorPermissions: newPerms });
                        }}
                        className="text-[9px] font-bold h-6 text-primary hover:text-primary/80"
                      >
                        {MARKETING_SUB_PERMISSIONS.every(p => (pendingUser?.mentorPermissions || []).includes(p.id)) ? 'Desmarcar Todas' : 'Marcar Todas'}
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {MARKETING_SUB_PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white group/perm hover:border-primary/20 transition-all shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-colors",
                              (pendingUser?.mentorPermissions || []).includes(perm.id) ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
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
