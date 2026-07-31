'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { LandingStyle, StyleBrand, resolveStyleBrand } from '@/lib/landing-styles';
import { parseBrandFile } from '@/lib/landing-styles/dtcg';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Users,
   Globe, 
  Linkedin, 
  Twitter, 
  Palette, 
  Save, 
  Loader2, 
  Camera,
  Instagram,
  Youtube,
  Calendar,
  Trash2,
  Check,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  Phone,
  CreditCard,
  Clock,
  Sparkles,
  Zap,
  Layers,
  CheckCircle2,
  Layout,
  LayoutDashboard,
  Shield,
  Fingerprint,
  Users as UsersIcon,
  ShieldCheck,
  KeyRound,
  Wallet,
  Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { differenceInDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    photoURL: '',
    bio: '',
    linkedin: '',
    twitter: '',
    website: '',
    instagram: '',
    whatsapp: '',
    phone: '',
    youtube: '',
    tiktok: '',
    calendly: '',
    primaryColor: '#3B2D86',
    logoUrl: '',
    layoutMode: 'light',
    username: '',
    publicProfileEnabled: true,
    websiteConfig: {
      headline: '',
      subheadline: '',
      mission: '',
      pilares: [
        { titulo: '', descripcion: '' },
        { titulo: '', descripcion: '' },
        { titulo: '', descripcion: '' }
      ] as { titulo: string; descripcion: string }[],
      badges: [] as { label: string; description: string }[],
      showStats: true,
      theme: 'professional-light',
      styleId: '',
      brandName: ''
    },
    myBrands: [] as StyleBrand[],
    activeBrandName: ''
  });
  const [origin, setOrigin] = useState('');

  const hasLoadedProfile = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (profile && !hasLoadedProfile.current) {
      const config = profile.profile?.websiteConfig;
      setFormData({
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
        bio: profile.profile?.bio || '',
        linkedin: profile.profile?.socials?.linkedin || '',
        twitter: profile.profile?.socials?.twitter || '',
        website: profile.profile?.socials?.website || '',
        instagram: profile.profile?.socials?.instagram || '',
        whatsapp: profile.profile?.socials?.whatsapp || '',
        phone: profile.profile?.socials?.phone || '',
        youtube: profile.profile?.socials?.youtube || '',
        tiktok: profile.profile?.socials?.tiktok || '',
        calendly: profile.profile?.socials?.calendly || '',
        primaryColor: profile.profile?.branding?.primaryColor || '#3B2D86',
        logoUrl: profile.profile?.branding?.logoUrl || '',
        layoutMode: profile.profile?.branding?.layoutMode || 'light',
        username: profile.username || '',
        publicProfileEnabled: profile.profile?.publicProfile?.enabled !== false,
        websiteConfig: {
          headline: config?.headline || '',
          subheadline: config?.subheadline || '',
          mission: config?.mission || '',
          pilares: (config?.pilares || []).map((p: any) => ({
            titulo: p.titulo || '',
            descripcion: p.descripcion || ''
          })).concat([
            { titulo: '', descripcion: '' },
            { titulo: '', descripcion: '' },
            { titulo: '', descripcion: '' }
          ]).slice(0, 3),
          badges: (config?.badges || []).map((b: any) => ({
            label: b.label || '',
            description: b.description || ''
          })),
          showStats: config?.showStats ?? true,
          theme: config?.theme || 'professional-light',
          styleId: config?.styleId || '',
          brandName: config?.brandName || ''
        },
        myBrands: profile.profile?.brands || [],
        activeBrandName: profile.profile?.activeBrandName || ''
      });
      hasLoadedProfile.current = true;
    }
  }, [profile]);
  
  const [isGeneratingWeb, setIsGeneratingWeb] = useState(false);

  const handleGenerateWeb = async () => {
    const hasEnoughBio = formData.bio && formData.bio.length > 20;
    const hasExternalWeb = formData.website && formData.website.startsWith('http');
    const hasLinkedin = formData.linkedin && formData.linkedin.includes('linkedin.com');

    if (!hasEnoughBio && !hasExternalWeb && !hasLinkedin) {
      toast({ 
        variant: 'destructive', 
        title: 'Falta información', 
        description: 'Escribe un poco más sobre ti o añade tu LinkedIn/Sitio Web en la pestaña Contacto para que la IA tenga material de análisis.' 
      });
      return;
    }

    setIsGeneratingWeb(true);
    try {
      const res = await fetch('/api/ai/tutor-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.displayName,
          bio: formData.bio,
          socials: {
            linkedin: formData.linkedin,
            website: formData.website,
            instagram: formData.instagram
          }
        })
      });

      if (!res.ok) throw new Error('Error al generar la propuesta');
      const data = await res.json();

      setFormData(prev => ({
        ...prev,
        websiteConfig: {
          ...prev.websiteConfig,
          headline: data.headline || '',
          subheadline: data.subheadline || '',
          mission: data.mission || '',
          pilares: (data.pilares || []).map((p: any) => ({
            titulo: p.titulo || '',
            descripcion: p.descripcion || ''
          })).concat([
            { titulo: '', descripcion: '' },
            { titulo: '', descripcion: '' },
            { titulo: '', descripcion: '' }
          ]).slice(0, 3),
          badges: (data.badges || []).map((b: any) => ({
            label: b.label || '',
            description: b.description || ''
          })),
          showStats: data.showStats ?? true,
          theme: data.suggested_theme || prev.websiteConfig.theme
        }
      }));

      toast({ 
        title: 'Propuesta Generada ✨', 
        description: 'He analizado tu biografía y creado una estructura de marca personal premium. ¡Revísala en la pestaña Web Personal!' 
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error de IA', description: error.message });
    } finally {
      setIsGeneratingWeb(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    // Validar unicidad del username
    const desiredUsername = (formData.username || formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-') || user.uid.substring(0, 8)).toLowerCase().trim();
    if (desiredUsername && desiredUsername !== (profile?.username || '').toLowerCase().trim()) {
      try {
        const usernameQuery = query(
          collection(db, 'users'),
          where('username', '==', desiredUsername)
        );
        const snap = await getDocs(usernameQuery);
        const conflict = snap.docs.find(d => d.id !== user.uid);
        if (conflict) {
          toast({
            variant: 'destructive',
            title: 'Nombre de usuario no disponible',
            description: `"${desiredUsername}" ya está en uso por otro tutor. Elige uno diferente.`
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        // Si falla la verificación, continuamos (no bloqueamos el guardado)
      }
    }

    const userRef = doc(db, 'users', user.uid);
    const updateData = {
      displayName: formData.displayName,
      photoURL: formData.photoURL,
      profile: {
        ...(profile?.profile || {}),
        bio: formData.bio,
        socials: {
          linkedin: formData.linkedin,
          twitter: formData.twitter,
          website: formData.website,
          instagram: formData.instagram,
          whatsapp: formData.whatsapp,
          phone: formData.phone,
          youtube: formData.youtube,
          tiktok: formData.tiktok,
          calendly: formData.calendly,
        },
        branding: {
          primaryColor: activeBrand?.palette?.primary || formData.primaryColor,
          logoUrl: formData.logoUrl,
          layoutMode: activeBrand?.tokens?.themeMode === 'dark' || activeBrand?.tokens?.themeMode === 'glass' ? 'dark' : formData.layoutMode,
        },
        brands: formData.myBrands,
        activeBrandName: formData.activeBrandName,
        publicProfile: {
          enabled: formData.publicProfileEnabled
        },
        websiteConfig: formData.websiteConfig
      },
      username: formData.username || formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-') || user.uid.substring(0, 8)
    };

    updateDoc(userRef, updateData)
      .then(() => {
        toast({ title: 'Configuración guardada' });
        hasLoadedProfile.current = false;
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      })
      .finally(() => setLoading(false));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (type === 'avatar') setUploading(true);
    else setUploadingLogo(true);

    try {
      const storageRef = ref(storage, `users/${user.uid}/${type}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setFormData(prev => ({ ...prev, [type === 'avatar' ? 'photoURL' : 'logoUrl']: url }));
      toast({ title: `${type === 'avatar' ? 'Foto de perfil' : 'Logo'} subido correctamente` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al subir imagen' });
    } finally {
      if (type === 'avatar') setUploading(false);
      else setUploadingLogo(false);
    }
  };

  const handleDeleteAsset = (type: 'avatar' | 'logo') => {
    setFormData(prev => ({ ...prev, [type === 'avatar' ? 'photoURL' : 'logoUrl']: '' }));
    toast({ title: `${type === 'avatar' ? 'Foto de perfil' : 'Logo'} marcado para eliminación` });
  };

  const brandFileInputRef = useRef<HTMLInputElement>(null);

  const handleBrandFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseBrandFile(String(reader.result || ''));
        if (result.errors.length > 0) {
          toast({ variant: 'destructive', title: 'Brand inválido', description: result.errors[0] });
          return;
        }
        setFormData(prev => {
          const existing = new Set(prev.myBrands.map(b => b.name));
          const newBrands = result.brands.filter(b => !existing.has(b.name));
          if (newBrands.length === 0) {
            toast({ title: 'Sin cambios', description: 'Ese brand ya está cargado.' });
            return prev;
          }
          toast({ title: `${newBrands.length} brand(s) cargado(s)`, description: newBrands.map(b => b.name).join(', ') });
          return {
            ...prev,
            myBrands: [...prev.myBrands, ...newBrands],
            activeBrandName: prev.activeBrandName || newBrands[0].name
          };
        });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error de parsing', description: err?.message || 'JSON inválido' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleActivateBrand = (name: string) => {
    setFormData(prev => ({ ...prev, activeBrandName: name }));
    toast({ title: `Brand activo: ${name}` });
  };

  const handleRemoveBrand = (name: string) => {
    setFormData(prev => {
      const myBrands = prev.myBrands.filter(b => b.name !== name);
      const activeBrandName = prev.activeBrandName === name
        ? (myBrands[0]?.name || '')
        : prev.activeBrandName;
      return { ...prev, myBrands, activeBrandName };
    });
    toast({ title: 'Brand eliminado' });
  };

  const sub = profile?.subscription;
  
  const safeDate = (dateVal: any) => {
    if (!dateVal) return null;
    try {
      // Handle Firestore Timestamp
      if (typeof dateVal.toDate === 'function') return dateVal.toDate();
      // Handle numeric ms or ISO string
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const startD = safeDate(sub?.startDate);
  const endD = safeDate(sub?.endDate);
  const daysLeft = endD ? differenceInDays(endD, new Date()) : 0;
  
  const isMentorOrAdmin = profile?.roles?.some((role: string) => role === 'mentor' || role === 'admin');
  const previewUsername = formData.username || profile?.username;

  const stylesQuery = useMemoFirebase(() => db ? query(collection(db, 'landingStyles')) : null, [db]);
  const { data: landingStyles } = useCollection<LandingStyle>(stylesQuery);

  const selectedStyle = landingStyles?.find(s => s.id === formData.websiteConfig.styleId) || null;

  const activeOwnBrand = formData.myBrands.find(b => b.name === formData.activeBrandName) || formData.myBrands[0] || null;
  const systemBrand = resolveStyleBrand(selectedStyle as any) || landingStyles?.find(s => s.id === 'classic')?.brands?.[0] || null;
  const activeBrand = activeOwnBrand || systemBrand;

  const RESERVED_PATHS = [
    'admin', 'api', 'auth', 'courses', 'dashboard', 'mentoria', 
    'my-courses', 'seguimientos', 'settings', 'tasks', 'v', 
    'about', 'services', 'privacy', 'terms', 'tutor', 'alumnos'
  ];
  
  // Enmascaramiento: la URL pública debe usar el subdominio si no es una ruta reservada
  // Enmascaramiento: la URL pública debe usar el subdominio si hay un username
  const getSubdomainUrl = () => {
    if (!previewUsername || !origin) return null;
    
    const parts = origin.split('://');
    const protocol = parts[0];
    const fullHost = parts[1]; // ej: admin.localhost:9002 o juan.FastoriaAcademy.com
    
    let baseHost = fullHost;
    
    // Limpiamos el host de cualquier subdominio previo
    if (fullHost.includes('localhost')) {
      // Especial para localhost:9002 o tutor.localhost:9002
      baseHost = fullHost.includes('.') ? fullHost.split('.').slice(-1)[0] : fullHost;
    } else {
      // Para dominios reales: tomamos solo los últimos 2 segmentos (dominio.com)
      const hostParts = fullHost.split('.');
      if (hostParts.length > 2) {
        baseHost = hostParts.slice(-2).join('.');
      }
    }
    
    return `${protocol}://${previewUsername.toLowerCase()}.${baseHost}`;
  };

  const tutorProfileUrl = getSubdomainUrl();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header><h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Configuración</h1></header>

        <Card className="border-none rounded-lg bg-white overflow-hidden">
          <div className="p-10 bg-primary/5 flex flex-col md:flex-row items-center gap-10 border-b">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white">
                <AvatarImage src={formData.photoURL || undefined} />
                <AvatarFallback className="text-3xl font-bold">{formData.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 right-0 flex gap-1">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="rounded-full shadow-lg h-9 w-9 border-2 border-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Cambiar avatar"
                >
                  {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </Button>
                {formData.photoURL && (
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="rounded-full shadow-lg h-9 w-9 border-2 border-white"
                    onClick={() => handleDeleteAsset('avatar')}
                    title="Eliminar avatar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'avatar')} />
            </div>
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-3xl font-bold text-primary">{formData.displayName || 'Usuario'}</h2>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                {profile?.roles.map((role: string) => (
                  <Badge key={role} className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold px-3">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="bg-secondary/10 p-1.5 rounded-none border-b h-16 w-full justify-start gap-2 px-10">
              <TabsTrigger value="perfil" className="rounded-xl gap-2 font-bold px-6 h-11"><User className="h-4 w-4" /> Perfil</TabsTrigger>
              {isMentorOrAdmin && (
                <TabsTrigger value="web" className="rounded-xl gap-2 font-bold px-6 h-11 text-amber-600 bg-amber-50/50 border-amber-100"><Sparkles className="h-4 w-4" /> Web Personal</TabsTrigger>
              )}
              <TabsTrigger value="contacto" className="rounded-xl gap-2 font-bold px-6 h-11"><Globe className="h-4 w-4" /> Contacto</TabsTrigger>
              {isMentorOrAdmin && (
                <TabsTrigger value="marca" className="rounded-xl gap-2 font-bold px-6 h-11"><Palette className="h-4 w-4" /> Marca</TabsTrigger>
              )}
            </TabsList>

            <div className="p-10">
              <TabsContent value="perfil" className="m-0 space-y-8">
                <div className="grid gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="settings-displayName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre para mostrar</Label>
                    <Input 
                      id="settings-displayName"
                      name="displayName"
                      value={formData.displayName || ''} 
                      onChange={e => setFormData({...formData, displayName: e.target.value})} 
                      className="bg-secondary/10 border-none font-bold text-lg px-6" 
                     size="xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-bio" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Biografía</Label>
                    <Textarea 
                      id="settings-bio"
                      name="bio"
                      value={formData.bio || ''} 
                      onChange={e => setFormData({...formData, bio: e.target.value})} 
                      className="min-h-[200px] rounded-lg bg-secondary/10 border-none p-8 text-base leading-relaxed" 
                    />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-secondary/5 rounded-3xl border border-primary/5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800">Visibilidad del Perfil</p>
                        <p className="text-xs text-slate-400 font-medium">Habilita o deshabilita tu página pública</p>
                      </div>
                    </div>
                    <Switch 
                      checked={formData.publicProfileEnabled}
                      onCheckedChange={(checked: boolean) => setFormData({...formData, publicProfileEnabled: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settings-username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre de usuario (URL Pública)</Label>
                    <div className="relative">
                      <Input 
                        id="settings-username"
                        name="username"
                        value={formData.username || ''} 
                        onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                        placeholder="tu-nombre-de-usuario"
                        className="bg-secondary/10 border-none font-mono text-sm px-6" 
                       size="xl" />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50">
                        /tutor/{formData.username || '...'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-3">Tu Puerta al Mundo</p>
                    {formData.username ? (
                      <div className="p-6 bg-white rounded-3xl border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Globe className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-lg">Página Pública</p>
                            <p className="text-xs text-slate-400 font-medium">Link para compartir con tus alumnos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Input 
                            readOnly 
                            value={tutorProfileUrl || ''} 
                            className="bg-slate-50 border-slate-100 font-mono text-[10px] min-w-[200px]"
                           size="lg" />
                          <Button 
                            onClick={() => {
                              if (tutorProfileUrl) {
                                navigator.clipboard.writeText(tutorProfileUrl);
                                toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles' });
                              }
                            }}
                            className="rounded-xl h-12 font-bold bg-primary text-white px-6 shadow-lg shadow-primary/20"
                          >
                            Copiar
                          </Button>
                          <a href={tutorProfileUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="rounded-xl h-12 font-bold px-6 border-2">Visitar</Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100 flex items-center gap-4 text-amber-800">
                        <Info className="h-5 w-5" />
                        <p className="text-sm font-medium">Define un <strong>Nombre de Usuario</strong> arriba para habilitar tu página pública.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="web" className="m-0 space-y-10">
                {/* Cabecera de Generación IA */}
                <div className="relative overflow-hidden p-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                      <h3 className="text-2xl font-black flex items-center justify-center md:justify-start gap-2">
                        <Sparkles className="h-6 w-6 text-amber-300" /> Tu Vitrina de Marca Personal
                      </h3>
                      <p className="text-sm text-indigo-100 max-w-md">
                        Convierte tu biografía en una web premium de autoridad. La IA analizará tu perfil y creará una estructura persuasiva automáticamente.
                      </p>
                    </div>
                    <Button 
                      onClick={handleGenerateWeb}
                      disabled={isGeneratingWeb}
                      className="h-16 px-10 rounded-2xl bg-white text-indigo-600 hover:bg-indigo-50 font-black text-lg transition-all hover:scale-105 active:scale-95 group"
                    >
                      {isGeneratingWeb ? (
                        <Loader2 className="animate-spin mr-2 h-6 w-6" />
                      ) : (
                        <Zap className="mr-2 h-6 w-6 fill-amber-400 text-amber-400 group-hover:animate-pulse" />
                      )}
                      {formData.websiteConfig.headline ? 'Regenerar con IA' : 'Magia IA: Crear mi Web'}
                    </Button>
                  </div>
                  {/* Decoración visual */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
                </div>

                {formData.websiteConfig.headline && (
                  <div className="grid gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Hero Section Edit */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Layout className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tighter">Sección Principal (Hero)</h4>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Lo primero que verán tus alumnos</p>
                        </div>
                      </div>
                      <div className="grid gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Titular de Impacto</Label>
                          <Input 
                            value={formData.websiteConfig.headline || ''}
                            onChange={e => setFormData({
                              ...formData, 
                              websiteConfig: { ...formData.websiteConfig, headline: e.target.value }
                            })}
                            className="bg-white border-none shadow-sm font-bold text-slate-800"
                           size="lg" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Propuesta de Valor (Bajada)</Label>
                          <Textarea 
                            value={formData.websiteConfig.subheadline || ''}
                            onChange={e => setFormData({
                              ...formData, 
                              websiteConfig: { ...formData.websiteConfig, subheadline: e.target.value }
                            })}
                            className="min-h-[80px] rounded-xl bg-white border-none shadow-sm py-3"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pillars Edit */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tighter">Tus 3 Pilares Metodológicos</h4>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Tu propuesta diferencial de enseñanza</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-6">
                        {formData.websiteConfig.pilares.map((pilar, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </div>
                            <div className="space-y-2">
                              <Input 
                                value={pilar.titulo || ''}
                                onChange={e => {
                                  const newPilares = [...formData.websiteConfig.pilares];
                                  newPilares[idx] = { ...newPilares[idx], titulo: e.target.value };
                                  setFormData({ ...formData, websiteConfig: { ...formData.websiteConfig, pilares: newPilares } });
                                }}
                                className="font-bold border-none bg-slate-50 rounded-xl h-10"
                                placeholder="Título del Pilar"
                              />
                              <Textarea 
                                value={pilar.descripcion || ''}
                                onChange={e => {
                                  const newPilares = [...formData.websiteConfig.pilares];
                                  newPilares[idx] = { ...newPilares[idx], descripcion: e.target.value };
                                  setFormData({ ...formData, websiteConfig: { ...formData.websiteConfig, pilares: newPilares } });
                                }}
                                className="text-xs border-none bg-slate-50 rounded-xl min-h-[100px]"
                                placeholder="Descripción corta..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Authority Badges */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tighter">Medallas de Autoridad</h4>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Lo que garantiza tu excelencia</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div>
                          <h4 className="font-bold text-slate-800">Mostrar Estadísticas</h4>
                          <p className="text-xs text-muted-foreground">Si eres un tutor nuevo o prefieres un perfil exclusivo, puedes ocultar los números de alumnos y horas.</p>
                        </div>
                        <Button 
                          variant={formData.websiteConfig.showStats ? "default" : "outline"}
                          onClick={() => setFormData({
                            ...formData,
                            websiteConfig: { ...formData.websiteConfig, showStats: !formData.websiteConfig.showStats }
                          })}
                          className="rounded-xl font-bold"
                        >
                          {formData.websiteConfig.showStats ? "Visible" : "Oculto"}
                        </Button>
                      </div>

                      <div className="grid gap-6 p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100">
                        {formData.websiteConfig.badges.map((badge: any, idx) => (
                          <div key={idx} className="relative group bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="space-y-1">
                                  <Label className="text-[9px] font-black uppercase text-slate-400">Título de la Medalla</Label>
                                  <Input 
                                    value={badge.label || ''}
                                    onChange={e => {
                                      const newBadges = [...formData.websiteConfig.badges];
                                      newBadges[idx] = { ...newBadges[idx], label: e.target.value };
                                      setFormData({ ...formData, websiteConfig: { ...formData.websiteConfig, badges: newBadges } });
                                    }}
                                    className="h-10 bg-slate-50 border-none rounded-xl font-bold text-emerald-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[9px] font-black uppercase text-slate-400">Argumento de Respaldo</Label>
                                  <Textarea 
                                    value={badge.description || ''}
                                    onChange={e => {
                                      const newBadges = [...formData.websiteConfig.badges];
                                      newBadges[idx] = { ...newBadges[idx], description: e.target.value };
                                      setFormData({ ...formData, websiteConfig: { ...formData.websiteConfig, badges: newBadges } });
                                    }}
                                    className="text-xs bg-slate-50 border-none rounded-xl min-h-[60px]"
                                    placeholder="Explica por qué esto te da autoridad..."
                                  />
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const newBadges = formData.websiteConfig.badges.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, websiteConfig: { ...formData.websiteConfig, badges: newBadges } });
                                }}
                                className="h-8 w-8 bg-slate-100 text-slate-400 rounded-lg hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="rounded-full border-2 border-dashed border-emerald-200 text-emerald-600 font-bold hover:bg-emerald-100 h-12"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              websiteConfig: { 
                                ...formData.websiteConfig, 
                                badges: [...formData.websiteConfig.badges, { label: 'Nuevo Valor', description: 'Justifica este valor aquí...' }] 
                              } 
                            });
                          }}
                        >
                          + Añadir Argumento de Autoridad
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!formData.websiteConfig.headline && (
                  <div className="py-20 text-center space-y-6">
                    <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                      <LayoutDashboard className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-400">Tu web personal está en blanco</h4>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto">
                        Usa el botón de Magia IA de arriba para generar tu propuesta de marca personal basada en tu biografía actual.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contacto" className="m-0 grid sm:grid-cols-2 gap-8">
                {[
                  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/...' },
                  { id: 'twitter', label: 'X (Twitter)', icon: Twitter, placeholder: '@usuario' },
                  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@usuario' },
                  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'URL canal' },
                  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, placeholder: '@usuario' },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: '+54...' },
                  { id: 'phone', label: 'Teléfono', icon: Phone, placeholder: '+54...' },
                  { id: 'website', label: 'Sitio Web', icon: Globe, placeholder: 'https://...' },
                  { id: 'calendly', label: 'Calendly', icon: Calendar, placeholder: 'https://calendly.com/...' },
                ].map((social) => (
                  <div key={social.id} className="space-y-2">
                    <Label htmlFor={`settings-${social.id}`} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      <social.icon className="h-3 w-3" /> {social.label}
                    </Label>
                    <Input 
                      id={`settings-${social.id}`}
                      name={social.id}
                      value={(formData as any)[social.id] || ''} 
                      onChange={e => setFormData({...formData, [social.id]: e.target.value})} 
                      placeholder={social.placeholder} 
                      className="bg-secondary/10 border-none px-6 font-medium"
                     size="xl" />
                  </div>
                ))}
              </TabsContent>

              {isMentorOrAdmin && (
                <>
                  <TabsContent value="marca" className="m-0 space-y-12">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logotipo Institucional</Label>
                      <div className="flex items-center gap-8">
                        <div className="w-32 h-32 rounded-3xl bg-secondary/20 flex items-center justify-center relative overflow-hidden border-2 border-dashed border-muted-foreground/20">
                          {(formData.logoUrl && typeof formData.logoUrl === 'string') ? (
                            <Image 
                              src={formData.logoUrl} 
                              alt="Logo" 
                              fill 
                              sizes="128px"
                              className="object-contain p-4" 
                              unoptimized 
                              data-ai-hint="institution logo"
                            />
                          ) : <ImageIcon className="h-10 w-10 text-muted-foreground/30" />}
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button variant="outline" className="rounded-2xl font-bold h-12 px-8 border-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                            {uploadingLogo ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-5 w-5" />} Subir Logo
                          </Button>
                          {formData.logoUrl && (
                            <Button variant="ghost" className="rounded-2xl font-bold h-12 px-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAsset('logo')}>
                              <Trash2 className="mr-2 h-5 w-5" /> Eliminar Logo
                            </Button>
                          )}
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'logo')} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mis brands (web personal)</Label>
                        <Button variant="outline" size="sm" className="rounded-full font-bold" onClick={() => brandFileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-1.5" /> Cargar brand (.json)
                        </Button>
                        <input type="file" ref={brandFileInputRef} className="hidden" accept=".json,application/json" onChange={handleBrandFile} />
                      </div>
                      <p className="text-xs text-slate-500 -mt-3">
                        Tus brands son privados y solo se usan en tu página personal. Formato DTCG/W3C o el formato del sistema.
                      </p>
                      {formData.myBrands.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {formData.myBrands.map((brand) => {
                            const isActive = formData.activeBrandName === brand.name;
                            return (
                              <div
                                key={brand.name}
                                className={cn(
                                  "border-2 rounded-xl p-4 transition-all",
                                  isActive ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200 bg-white"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex -space-x-1.5">
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-30" style={{ backgroundColor: brand.palette.primary }} />
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-20" style={{ backgroundColor: brand.palette.secondary }} />
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-10" style={{ backgroundColor: brand.palette.accent }} />
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleActivateBrand(brand.name)}
                                      disabled={isActive}
                                      className={cn(
                                        "text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 transition-colors",
                                        isActive
                                          ? "bg-emerald-500 text-white cursor-default"
                                          : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"
                                      )}
                                    >
                                      {isActive ? 'Activo' : 'Activar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBrand(brand.name)}
                                      className="text-[10px] font-black text-slate-300 hover:text-red-500 transition-colors px-1"
                                      title="Eliminar brand"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="font-bold text-sm text-slate-800 mt-2">{brand.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{brand.description || 'Sin descripción'}</p>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">
                                  {brand.typography?.headingFont} · {brand.palette.primary} · modo {brand.tokens?.themeMode}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => brandFileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-8 text-center hover:border-primary hover:text-primary transition-colors"
                        >
                          <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-500">No tenés brands cargados</p>
                          <p className="text-xs text-slate-400 mt-1">Cargá un archivo .json (DTCG/W3C) para tu web personal.</p>
                        </button>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand del sistema</Label>
                      </div>
                      {activeOwnBrand ? (
                        <p className="text-xs text-slate-500">
                          Tu brand activo <span className="font-bold">{formData.activeBrandName || activeOwnBrand.name}</span> tiene prioridad sobre el del sistema.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Sin brands propios, tu web usa el brand activo del sistema ({systemBrand?.name || 'Classic'}). No se pueden elegir otros.
                        </p>
                      )}
                      {systemBrand && (
                        <div className="border-2 border-slate-200 bg-white rounded-xl px-4 py-3 flex items-center gap-4">
                          <div className="flex -space-x-1.5">
                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-30" style={{ backgroundColor: systemBrand.palette.primary }} />
                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-20" style={{ backgroundColor: systemBrand.palette.secondary }} />
                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-10" style={{ backgroundColor: systemBrand.palette.accent }} />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-xs text-slate-800">{systemBrand.name}</p>
                            <p className="text-[10px] text-slate-400">Brand activo del sistema · usado por la plataforma</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Fijo
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </>
              )}

              <div className="mt-12 pt-10 border-t flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={loading} 
                  className="h-20 px-16 rounded-lg text-2xl font-bold bg-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Save className="h-8 w-8 mr-3" />} Guardar Cambios
                </Button>
              </div>
            </div>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
