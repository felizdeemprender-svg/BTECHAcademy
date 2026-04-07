'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  DollarSign,
  GraduationCap,
  Mail,
  FileText,
  Plus,
  Edit,
  Trash2,
  Layers,
  ShieldCheck,
  Target,
  ClipboardList,
  Rocket,
  Cpu,
  Activity,
  FileBox,
  Layout as LayoutIcon,
  Palette,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  where,
  getDocs
} from 'firebase/firestore';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'free' | 'fixed' | 'percentage';
  price?: number;
  percentageRate?: number;
  durationMonths: number;
  maxSimultaneousCourses: number;
  isActive: boolean;
  features: string[];
  permissions: {
    academic_management: boolean;
    mentor_challenges: boolean;
    students_view: boolean;
    followups_management: boolean;
    marketing_access: boolean;
  };
  limits: {
    maxCourses: number;
    maxStudents: number;
    hasCustomBranding: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
  isEnterprise?: boolean;
  hasCustomPage?: boolean;
  hasPremiumAI?: boolean;
  requiresFreeCourses?: boolean;
  freeCoursesCount?: number;
  invitationsPerCourse?: number;
  createdAt: any;
  updatedAt: any;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    type: 'free',
    price: 0,
    durationMonths: 12,
    maxSimultaneousCourses: 3,
    isActive: true,
    features: [
      'Perfil básico',
      'Hasta 3 cursos',
      'Hasta 50 estudiantes',
      'Marketplace básico'
    ],
    permissions: {
      academic_management: false,
      mentor_challenges: false,
      students_view: false,
      followups_management: false,
      marketing_access: false
    },
    limits: {
      maxCourses: 3,
      maxStudents: 50,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'basic',
    name: 'Plan Básico',
    type: 'fixed',
    price: 29.99,
    durationMonths: 12,
    maxSimultaneousCourses: 5,
    isActive: true,
    features: [
      'Perfil personalizado',
      'Hasta 10 cursos',
      'Hasta 200 estudiantes',
      'Marketplace completo',
      'Estadísticas básicas',
      'Soporte email'
    ],
    permissions: {
      academic_management: true,
      mentor_challenges: false,
      students_view: true,
      followups_management: false,
      marketing_access: false
    },
    hasPremiumAI: false,
    limits: {
      maxCourses: 10,
      maxStudents: 200,
      hasCustomBranding: false,
      hasAnalytics: true,
      hasPrioritySupport: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'professional',
    name: 'Plan Profesional',
    type: 'fixed',
    price: 59.99,
    durationMonths: 12,
    maxSimultaneousCourses: 10,
    isActive: true,
    features: [
      'Todo lo básico +',
      'Branding personalizado',
      'Hasta 25 cursos',
      'Hasta 500 estudiantes',
      'Estadísticas avanzadas',
      'Soporte prioritario'
    ],
    permissions: {
      academic_management: true,
      mentor_challenges: true,
      students_view: true,
      followups_management: true,
      marketing_access: true
    },
    limits: {
      maxCourses: 25,
      maxStudents: 500,
      hasCustomBranding: true,
      hasAnalytics: true,
      hasPrioritySupport: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    type: 'percentage',
    percentageRate: 15,
    durationMonths: 12,
    maxSimultaneousCourses: -1,
    isActive: true,
    features: [
      'Todo lo profesional +',
      'API personalizada',
      'Cursos ilimitados',
      'Estudiantes ilimitados',
      'Integraciones avanzadas',
      'Soporte dedicado'
    ],
    permissions: {
      academic_management: true,
      mentor_challenges: true,
      students_view: true,
      followups_management: true,
      marketing_access: true
    },
    limits: {
      maxCourses: -1, // Ilimitado
      maxStudents: -1, // Ilimitado
      hasCustomBranding: true,
      hasAnalytics: true,
      hasPrioritySupport: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  
  // Real-time Query
  const plansQuery = useMemoFirebase(() => {
    return query(collection(db, 'subscriptionPlans'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: plans = [], isLoading: loading } = useCollection(plansQuery);

  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    type: 'fixed',
    price: 29.99,
    percentageRate: 15,
    durationMonths: 12,
    maxSimultaneousCourses: 5,
    isActive: true,
    hasPremiumAI: false,
    features: [],
    permissions: {
      academic_management: false,
      mentor_challenges: false,
      students_view: false,
      followups_management: false,
      marketing_access: false
    },
    limits: {
      maxCourses: 10,
      maxStudents: 200,
      hasCustomBranding: false,
      hasAnalytics: true,
      hasPrioritySupport: false
    },
    invitationsPerCourse: 5,
    isEnterprise: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del plan es requerido' });
      return;
    }
    
    // Validate Duplicate Name (Local Check for speed)
    const isDuplicate = (plans || []).some(d => d.name === formData.name && d.id !== editingPlan?.id);
    
    if (isDuplicate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un plan con ese nombre' });
      return;
    }

    if (!formData.features || formData.features.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las características del plan son requeridas' });
      return;
    }
    
    // Validate at least one permission is active
    if (!formData.permissions || Object.values(formData.permissions).every(p => p === false)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Al menos un permiso debe estar activo' });
      return;
    }
    
    try {
      const planToSave = {
        ...formData,
        // Si es Empresa, el tipo debe ser fixed independientemente de lo demás
        type: formData.isEnterprise ? 'fixed' : formData.type,
        // Limpiar datos según el tipo final
        price: (formData.isEnterprise || formData.type === 'fixed') ? formData.price : 0,
        percentageRate: (!formData.isEnterprise && formData.type === 'percentage') ? formData.percentageRate : 0,
        hasPremiumAI: formData.hasPremiumAI === true,
        // Asegurar que invitationsPerCourse se guarde
        invitationsPerCourse: formData.invitationsPerCourse || 5,
        updatedAt: serverTimestamp(),
      };

      if (editingPlan) {
        await updateDoc(doc(db, 'subscriptionPlans', editingPlan.id), planToSave);
      } else {
        await addDoc(collection(db, 'subscriptionPlans'), {
          ...planToSave,
          createdAt: serverTimestamp(),
        });
      }
      
      setShowCreateForm(false);
      setEditingPlan(null);
      
      // Show success message
      const successMessage = editingPlan ? 'Plan actualizado exitosamente' : 'Plan creado exitosamente';
      toast({ title: 'Éxito', description: successMessage });
      
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al conectar con la base de datos' });
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
      try {
        await deleteDoc(doc(db, 'subscriptionPlans', id));
        toast({ title: 'Plan eliminado', description: 'El plan ha sido eliminado correctamente.' });
      } catch (error) {
        console.error('Error deleting plan:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Error de conexión' });
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planes de Suscripción</h1>
            <p className="text-sm text-muted-foreground">Administración central de planes y reglas para tutores.</p>
          </div>
          <div className="flex gap-3 items-center">
            <Button onClick={() => {
              setEditingPlan(null);
              setFormData({
                name: '', type: 'fixed', price: 29.99, percentageRate: 15, durationMonths: 12, maxSimultaneousCourses: 5, isActive: true, features: [], hasPremiumAI: false,
                permissions: {
                  academic_management: false,
                  mentor_challenges: false,
                  students_view: false,
                  followups_management: false,
                  marketing_access: false
                },
                limits: { maxCourses: 10, maxStudents: 200, hasCustomBranding: false, hasAnalytics: true, hasPrioritySupport: false }
              });
              setShowCreateForm(true);
            }} className="h-10 px-5 rounded-md font-bold text-sm gap-2">
              <Plus className="h-4 w-4" /> Nuevo Plan
            </Button>
          </div>
        </header>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Planes', value: (plans || []).length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Planes de Pago', value: (plans || []).filter(p => p.type !== 'free').length, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Activos', value: (plans || []).filter(p => p.isActive).length, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Ingresos MRR Pot.', value: `$${(plans || []).reduce((sum, p) => sum + (p.price || 0), 0).toFixed(2)}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((kpi, i) => (
            <Card key={i} className="border-none shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden group">
              <CardContent className="p-6 relative">
                <div className={cn("absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity", kpi.color)}>
                  <kpi.icon className="h-24 w-24" />
                </div>
                <div className="flex justify-between items-start">
                  <div className={cn("p-2 rounded-xl mb-4", kpi.bg)}>
                    <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Planes Disponibles - Vista Tabla */}
        <Card className="border rounded-md overflow-hidden bg-white shadow-none">
          <CardContent className="p-0">
            <Table>
                  <TableHeader className="bg-secondary/50 border-b">
                <TableRow className="border-none">
                  <TableHead className="font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Límites</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Precio</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-right py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-20 animate-pulse text-muted-foreground">Sincronizando planes...</TableCell></TableRow>
                ) : (!plans || plans.length === 0) ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-20 italic text-muted-foreground">No hay planes configurados.</TableCell></TableRow>
                ) : plans.map((plan) => (
                  <TableRow key={plan.id} className="hover:bg-secondary/20 border-b transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border font-bold text-xs uppercase shrink-0 transition-transform", 
                            plan.type === 'free' ? "bg-slate-50 text-slate-600 border-slate-200" :
                            plan.type === 'fixed' ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                            "bg-emerald-50 text-emerald-600 border-emerald-200"
                          )}>
                          {plan.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground line-clamp-1">{plan.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/20 text-primary/70">{plan.durationMonths} meses</Badge>
                            {plan.type === 'free' && <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-slate-200 text-slate-500">Gratuita</Badge>}
                            {plan.hasPremiumAI && <span className="ml-1 text-[10px]" title="Incluye Motor IA Premium">🌟</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-slate-700">{plan.limits.maxCourses === -1 ? '∞' : plan.limits.maxCourses} cursos</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">{plan.limits.maxStudents === -1 ? '∞' : plan.limits.maxStudents} alumnos</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900">
                          {plan.type === 'free' ? 'Gratis' : plan.type === 'fixed' ? `$${plan.price}/m` : `${plan.percentageRate}%`}
                        </span>
                        {plan.type === 'percentage' && <span className="text-[9px] uppercase text-muted-foreground font-bold">Por Ventas</span>}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant={plan.isEnterprise ? 'default' : 'outline'} className={cn("text-[9px] px-2 h-5", plan.isEnterprise ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-500 uppercase")}>
                          {plan.isEnterprise ? 'Empresa' : 'Tutor/Mentor'}
                        </Badge>
                        <div className="text-[8px] text-slate-400 mt-1">
                          {plan.isEnterprise ? 'Para organizaciones con múltiples usuarios' : 'Para tutores independientes y mentores'}
                        </div>
                        <Badge variant="outline" className="text-[9px] opacity-70 px-0 h-3 border-none bg-transparent">
                          {plan.isActive ? '✓ Disponible' : '✗ Oculto'}
                        </Badge>
                        <div className="text-[8px] text-slate-400 mt-1">
                          {plan.isActive ? 'Visible para nuevos suscriptores' : 'No disponible para nuevos suscriptores'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs font-bold">
                          <DropdownMenuItem onSelect={() => handleEdit(plan)} className="cursor-pointer gap-2 py-2">
                            <Edit className="h-3.5 w-3.5" /> Editar Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleDelete(plan.id)} className="text-destructive font-bold cursor-pointer gap-2 py-2">
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog Formulario de Creación/Edición */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-none rounded-[2rem] overflow-hidden flex flex-col bg-slate-50">
            <DialogHeader className="p-8 bg-indigo-600 text-white shrink-0 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <DialogTitle className="text-2xl font-bold">{editingPlan ? 'Editar Configuración del Plan' : 'Definir Nuevo Plan Comercial'}</DialogTitle>
              <DialogDescription className="text-indigo-100 font-medium text-base">Especifica permisos, topes y regalías del nivel de suscripción.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-8">
              <form id="plan-form" onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="planName" className="text-xs font-bold uppercase tracking-widest text-slate-500">Nombre del Nivel</Label>
                    <Input id="planName" name="planName" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Plan Profesional" className="h-12 rounded-xl border-slate-200" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planType" className="text-xs font-bold uppercase tracking-widest text-slate-500">Tipo de Contrato</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData({...formData, type: value as 'free' | 'fixed' | 'percentage'})}
                        disabled={formData.isActive}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-sans">
                          <SelectItem value="free" className="font-bold" disabled={formData.isActive}>Gratuito</SelectItem>
                          <SelectItem value="fixed" className="font-bold">Abono Fijo</SelectItem>
                          <SelectItem value="percentage" className="font-bold" disabled={formData.isActive}>Regalías / Revenue Share</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                </div>

                <div className={cn(
                  "grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm",
                  formData.type === 'free' && "opacity-50 pointer-events-none"
                )}>
                  {formData.type !== 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="planPrice" className="text-xs font-bold uppercase tracking-widest text-slate-500">Fijo (USD/mes)</Label>
                      <Input id="planPrice" name="planPrice" type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} disabled={formData.type === 'free'} className="h-12 rounded-xl bg-slate-50" />
                    </div>
                  )}
                  {formData.type === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="planPercentage" className="text-xs font-bold uppercase tracking-widest text-slate-500">Regalía (%)</Label>
                      <Input id="planPercentage" name="planPercentage" type="number" min="0" max="100" step="0.1" value={formData.percentageRate} onChange={(e) => setFormData({...formData, percentageRate: parseFloat(e.target.value)})} className="h-12 rounded-xl bg-slate-50" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="planDuration" className="text-xs font-bold uppercase tracking-widest text-slate-500">Duración mínima (m)</Label>
                    <Input id="planDuration" name="planDuration" type="number" min="1" value={formData.durationMonths} onChange={(e) => setFormData({...formData, durationMonths: parseInt(e.target.value)})} className="h-12 rounded-xl bg-slate-50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="planMaxCourses" className="text-xs font-bold uppercase tracking-widest text-slate-500">Tope de Cursos Publicados</Label>
                    <Input id="planMaxCourses" name="planMaxCourses" type="number" min="-1" value={formData.limits?.maxCourses ?? 10} onChange={(e) => { const val = parseInt(e.target.value); setFormData({...formData, maxSimultaneousCourses: isNaN(val) ? 0 : val, limits: { ...formData.limits, maxCourses: isNaN(val) ? 0 : val } as any}); }} placeholder="10 (-1 = ∞)" className="h-12 rounded-xl border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planMaxStudents" className="text-xs font-bold uppercase tracking-widest text-slate-500">Tope de Alumnos (Base)</Label>
                    <Input id="planMaxStudents" name="planMaxStudents" type="number" min="-1" value={formData.limits?.maxStudents ?? 200} onChange={(e) => { const val = parseInt(e.target.value); setFormData({...formData, limits: { ...formData.limits, maxStudents: isNaN(val) ? 0 : val } as any}); }} placeholder="200 (-1 = ∞)" className="h-12 rounded-xl border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planInvitationsPerCourse" className="text-xs font-bold uppercase tracking-widest text-slate-500">Alumnos Invitados por Curso</Label>
                    <Input id="planInvitationsPerCourse" name="planInvitationsPerCourse" type="number" min="0" value={formData.invitationsPerCourse ?? 5} onChange={(e) => { const val = parseInt(e.target.value); setFormData({...formData, invitationsPerCourse: isNaN(val) ? 0 : val}); }} placeholder="5" className="h-12 rounded-xl border-slate-200" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planFeatures" className="text-xs font-bold uppercase tracking-widest text-slate-500">Propuesta de Valor (1 línea = 1 viñeta)</Label>
                  <Textarea id="planFeatures" name="planFeatures" rows={4} value={formData.features?.join('\n') || ''} onChange={(e) => setFormData({...formData, features: e.target.value.split('\n')})} placeholder="Perfil premium&#10;Analytics avanzadas&#10;API" className="rounded-xl border-slate-200" required />
                </div>

                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Derechos Administrativos (RBAC)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-medium text-slate-700">
                    {[
                      { k: 'academic_management', l: 'Gestión de Cursos Ppios', i: GraduationCap },
                      { k: 'students_view', l: 'Exportar Lead Alumnos', i: Users },
                      { k: 'marketing_access', l: 'Campañas de Lanzamiento AI', i: Rocket },
                      { k: 'followups_management', l: 'Tickets de Seguimiento', i: ClipboardList },
                      { k: 'mentor_challenges', l: 'Emitir Desafíos', i: Target }
                    ].map(perm => (
                      <div key={perm.k} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <perm.i className="h-4 w-4 text-indigo-500" />
                          <Label htmlFor={`perm-${perm.k}`} className="cursor-pointer">{perm.l}</Label>
                        </div>
                        <Switch 
                          id={`perm-${perm.k}`}
                          name={`perm-${perm.k}`}
                          checked={(formData.permissions as any)?.[perm.k] || false} 
                          onCheckedChange={(c) => setFormData({...formData, permissions: {...formData.permissions, [perm.k]: c} as any})} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-center rounded-b-[2rem]">
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex gap-2 items-center">
                  <Switch 
                    id="plan-is-enterprise" 
                    name="plan-is-enterprise" 
                    checked={formData.isEnterprise} 
                    onCheckedChange={(c) => {
                      setFormData({
                        ...formData, 
                        isEnterprise: c,
                        // Si es Empresa (true), forzar a Fijo
                        type: c ? 'fixed' : formData.type
                      });
                    }} 
                    className="data-[state=checked]:bg-indigo-600" 
                  />
                  <Label htmlFor="plan-is-enterprise" className="font-bold text-xs uppercase tracking-widest text-slate-500 cursor-pointer">
                    {formData.isEnterprise ? 'Empresa' : 'Tutor/Mentor'}
                  </Label>
                </div>
                
                <div className="flex gap-2 items-center px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                  <Switch 
                    id="plan-has-ai" 
                    name="plan-has-ai" 
                    checked={formData.hasPremiumAI} 
                    onCheckedChange={(c) => setFormData({...formData, hasPremiumAI: c})} 
                    className="data-[state=checked]:bg-amber-500" 
                  />
                  <Label htmlFor="plan-has-ai" className="font-bold text-[10px] uppercase tracking-widest text-amber-900 cursor-pointer">✨ IA Premium (Imagen 3)</Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch id="plan-is-active" name="plan-is-active" checked={formData.isActive} onCheckedChange={(c) => setFormData({...formData, isActive: c})} className="data-[state=checked]:bg-emerald-500" />
                  <Label htmlFor="plan-is-active" className="font-bold text-[10px] uppercase tracking-widest text-slate-500 cursor-pointer">{formData.isActive ? 'Disponible' : 'Oculto'}</Label>
                </div>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
                <Button type="button" variant="outline" className="flex-1 md:flex-auto rounded-xl h-12 px-6" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" form="plan-form" className="flex-1 md:flex-auto rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 font-bold text-white">
                  {editingPlan ? 'Guardar Cambios' : 'Emitir Plan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
