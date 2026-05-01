import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Settings, 
  Users, 
  Library,
  CreditCard,
  UserPlus,
  Palette,
  ShieldAlert,
  FileText,
  Zap,
  ClipboardList,
  Target,
  Rocket,
  Cpu,
  Activity,
  FileBox,
  Layout as LayoutIcon,
  ChevronDown,
  ChevronRight,
  ReceiptText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-context';
import { canAccessMarketingTools } from '@/lib/subscription-permissions';

interface NavItem {
  name: string;
  href: string;
  roles: string[];
  subPermission?: string;
  icon: any;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(['Cursos', 'Comercialización']);

  // Filtrar items de marketing basados en permisos
  const filterMarketingItems = (items: NavItem[]) => {
    if (profile && 
        !profile?.roles.includes('admin') && 
        !profile?.roles.includes('marketing') && 
        !canAccessMarketingTools(profile?.mentorPermissions || [])) {
      return items.filter(item => !item.href.startsWith('/mentoria/marketing'));
    }
    return items;
  };

  // Navegación optimizada para evitar recargas del menú
  const handleNavigation = (href: string) => {
    if (href === pathname) return; // No navegar si ya estamos en la misma página
    router.push(href);
  };

  const sections: NavSection[] = [
    {
      label: 'Cursos',
      items: [
        { name: 'Inicio', href: '/dashboard', roles: ['alumno', 'mentor', 'admin', 'marketing'], icon: LayoutDashboard },
        { name: 'Catálogo', href: '/courses', roles: ['alumno', 'mentor', 'admin', 'marketing'], icon: BookOpen },
        { name: 'Mis Cursos', href: '/my-courses', roles: ['alumno'], icon: Library },
        { name: 'Mis Desafíos', href: '/tasks', roles: ['alumno'], icon: Zap },
        { name: 'Seguimientos', href: '/seguimientos', roles: ['alumno', 'mentor', 'admin'], subPermission: 'followups_management', icon: ClipboardList },
      ]
    },
    {
      label: 'Admin de Cursos',
      items: [
        { name: 'Gestión Académica', href: '/courses/manage', roles: ['mentor', 'admin'], subPermission: 'academic_management', icon: GraduationCap },
        { name: 'Desafíos (Mentor)', href: '/mentoria/desafios', roles: ['mentor', 'admin'], subPermission: 'mentor_challenges', icon: Target },
        { name: 'Alumnos', href: '/alumnos', roles: ['mentor', 'admin'], subPermission: 'students_view', icon: Users },
      ]
    },
    {
      label: 'Comercialización',
      items: filterMarketingItems([
        { name: 'Mis Campañas', href: '/mentoria/marketing', roles: ['admin', 'marketing', 'mentor'], icon: Rocket },
        { name: 'Centro de Mando', href: '/mentoria/marketing/execution', roles: ['admin', 'marketing', 'mentor'], icon: Cpu },
        { name: 'Track de Campañas', href: '/mentoria/marketing/track', roles: ['admin', 'marketing', 'mentor'], icon: Activity },
        { name: 'Generación de Contenido', href: '/mentoria/marketing/pages', roles: ['admin', 'marketing', 'mentor'], icon: FileBox },
        { name: 'Colección de Templates', href: '/mentoria/marketing/templates', roles: ['admin', 'marketing', 'mentor'], icon: LayoutIcon },
      ])
    },
    {
      label: 'Administración',
      items: [
        { name: 'Usuarios', href: '/admin/users', roles: ['admin'], icon: Users },
        { name: 'Categorías Académicas', href: '/admin/categories', roles: ['admin'], icon: Library },
        { name: 'Niveles Académicos', href: '/admin/levels', roles: ['admin'], icon: Target },
        { name: 'Moderación IA', href: '/admin/moderation', roles: ['admin'], icon: ShieldAlert },
        { name: 'Términos y Condiciones', href: '/admin/terms', roles: ['admin'], icon: FileText },
        { name: 'Planes de Suscripción', href: '/admin/subscriptions', roles: ['admin'], icon: CreditCard },
        { name: 'Métodos de Pago', href: '/admin/payment-methods', roles: ['admin'], icon: Zap },
        { name: 'Facturación', href: '/admin/billing', roles: ['admin'], icon: ReceiptText },
        { name: 'Tema del Sistema', href: '/admin/theme', roles: ['admin'], icon: Palette },
      ]
    },
    {
      label: 'Preferencias',
      items: [
        { name: 'Mi Perfil', href: '/settings', roles: ['alumno', 'mentor', 'admin', 'marketing'], icon: Settings },
      ]
    }
  ];

  const toggleSection = (label: string) => {
    setOpenSections(prev => 
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  // Auto-open section if current path is inside it
  useEffect(() => {
    sections.forEach(section => {
      if (section.items.some(item => item.href === pathname)) {
        if (!openSections.includes(section.label)) {
          setOpenSections(prev => [...prev, section.label]);
        }
      }
    });
  }, [pathname]);

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!profile) return false;
      
      const hasBaseRole = item.roles.some(role => profile.roles.includes(role as any));
      if (!hasBaseRole) return false;

      const isSuperAdmin = profile.email === 'felizdeemprender@gmail.com';
      
      // Check sub-permission if exists (only for non-students)
      if (item.subPermission && !profile.roles.includes('alumno')) {
        return isSuperAdmin || profile.mentorPermissions?.includes(item.subPermission);
      }
      
      // Check marketing access
      if (item.href.startsWith('/mentoria/marketing')) {
        return isSuperAdmin || 
               profile.roles.includes('marketing') || 
               canAccessMarketingTools(profile.mentorPermissions || []);
      }
      
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <div className="space-y-4 py-4 px-3 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
      {filteredSections.map((section, sIdx) => {
        const isOpen = openSections.includes(section.label);
        return (
          <div key={sIdx} className="space-y-1">
            <button
              onClick={() => toggleSection(section.label)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--sidebar-foreground)/0.4)] hover:text-white hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-2">
                {section.label}
              </div>
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            
            <div className={cn(
              "space-y-1 transition-all duration-300 overflow-hidden",
              isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}>
              <div className="pt-1.5 space-y-1">
                {section.items.map((item, index) => (
                  <button
                    key={`${item.href}-${index}`}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ml-1 w-full text-left",
                      pathname === item.href 
                        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" 
                        : "text-[hsl(var(--sidebar-foreground)/0.6)] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", pathname === item.href ? "text-accent" : "opacity-40 group-hover:opacity-100")} />
                    <span className="flex-1 truncate">{item.name}</span>
                    {pathname === item.href && (
                      <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--accent),0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
