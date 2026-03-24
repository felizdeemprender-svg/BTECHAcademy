'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
  Maximize,
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
    mpAccessToken: '',
    mpPublicKey: '',
    username: '',
  });
  const [origin, setOrigin] = useState('');

  const hasLoadedProfile = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (profile && !hasLoadedProfile.current) {
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
        mpAccessToken: profile.profile?.mercadopago?.accessToken || '',
        mpPublicKey: profile.profile?.mercadopago?.publicKey || '',
        username: profile.username || '',
      });
      hasLoadedProfile.current = true;
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

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
          primaryColor: formData.primaryColor,
          logoUrl: formData.logoUrl,
          layoutMode: formData.layoutMode,
        },
        mercadopago: {
          accessToken: formData.mpAccessToken,
          publicKey: formData.mpPublicKey,
        }
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
  
  const isMentorOrAdmin = profile?.roles?.some(role => role === 'mentor' || role === 'admin');
  const previewUsername = formData.username || profile?.username;
  const tutorProfileUrl = previewUsername ? `/tutor/${previewUsername}` : null;
  const isPublic = (profile?.profile as any)?.publicProfile?.enabled ?? true;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header><h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Configuración</h1></header>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <div className="p-10 bg-primary/5 flex flex-col md:flex-row items-center gap-10 border-b">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                <AvatarImage src={formData.photoURL} />
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
                {profile?.roles.map(role => (
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
              <TabsTrigger value="contacto" className="rounded-xl gap-2 font-bold px-6 h-11"><Globe className="h-4 w-4" /> Contacto</TabsTrigger>
              {isMentorOrAdmin && (
                <>
                  <TabsTrigger value="marca" className="rounded-xl gap-2 font-bold px-6 h-11"><Palette className="h-4 w-4" /> Marca</TabsTrigger>
                  <TabsTrigger value="abono" className="rounded-xl gap-2 font-bold px-6 h-11"><CreditCard className="h-4 w-4" /> Abono</TabsTrigger>
                  <TabsTrigger value="mercadopago" className="rounded-xl gap-2 font-bold px-6 h-11"><Wallet className="h-4 w-4" /> MercadoPago</TabsTrigger>
                </>
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
                      value={formData.displayName} 
                      onChange={e => setFormData({...formData, displayName: e.target.value})} 
                      className="h-14 rounded-2xl bg-secondary/10 border-none font-bold text-lg px-6" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-bio" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Biografía</Label>
                    <Textarea 
                      id="settings-bio"
                      name="bio"
                      value={formData.bio} 
                      onChange={e => setFormData({...formData, bio: e.target.value})} 
                      className="min-h-[200px] rounded-[2rem] bg-secondary/10 border-none p-8 text-base leading-relaxed" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre de usuario (URL Pública)</Label>
                    <div className="relative">
                      <Input 
                        id="settings-username"
                        name="username"
                        value={formData.username} 
                        onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                        placeholder="tu-nombre-de-usuario"
                        className="h-14 rounded-2xl bg-secondary/10 border-none font-mono text-sm px-6" 
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50">
                        /tutor/{formData.username || '...'}
                      </div>
                    </div>
                  </div>
                </div>
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
                      value={(formData as any)[social.id]} 
                      onChange={e => setFormData({...formData, [social.id]: e.target.value})} 
                      placeholder={social.placeholder} 
                      className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-medium"
                    />
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
                          {formData.logoUrl ? (
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
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color Primario Institucional</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] font-bold uppercase tracking-tighter"
                          onClick={() => setFormData({...formData, primaryColor: '#3B2D86'})}
                        >
                          <Zap className="h-3 w-3 mr-1" /> Usar Color del Sistema
                        </Button>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-8 bg-secondary/10 p-6 rounded-3xl">
                        <div className="relative">
                          <input 
                            type="color" 
                            value={formData.primaryColor || '#3B2D86'} 
                            onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                            className="w-24 h-24 rounded-3xl p-0 border-none cursor-pointer overflow-hidden shadow-xl ring-4 ring-white"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Maximize className="h-6 w-6 text-white mix-blend-difference opacity-50" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-4">
                          <Input 
                            value={formData.primaryColor} 
                            onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                            className="h-14 text-2xl font-mono font-bold text-center rounded-2xl bg-white border-none shadow-sm"
                          />
                          <div className="flex gap-2">
                             {['#3B2D86', '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'].map(color => (
                               <button 
                                 key={color}
                                 type="button"
                                 className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125"
                                 style={{ backgroundColor: color }}
                                 onClick={() => setFormData({...formData, primaryColor: color})}
                               />
                             ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tema Visual de Landing Page</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div 
                          className={cn("cursor-pointer border-2 rounded-2xl p-6 transition-all", formData.layoutMode === 'light' ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300")}
                          onClick={() => setFormData({...formData, layoutMode: 'light'})}
                        >
                          <div className="h-24 rounded-lg bg-[#FAFAFA] border border-slate-200 mb-4 flex flex-col p-3 shadow-inner">
                            <div className="w-full h-8 bg-slate-200 rounded animate-pulse" />
                            <div className="w-1/2 h-3 bg-slate-300 rounded mt-auto" />
                          </div>
                          <p className="font-bold text-center text-slate-800">Modo Claro</p>
                        </div>
                        <div 
                          className={cn("cursor-pointer border-2 rounded-2xl p-6 transition-all", formData.layoutMode === 'dark' ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300")}
                          onClick={() => setFormData({...formData, layoutMode: 'dark'})}
                        >
                          <div className="h-24 rounded-lg bg-slate-950 border border-slate-800 mb-4 flex flex-col p-3 shadow-inner">
                            <div className="w-full h-8 bg-slate-800 rounded animate-pulse" />
                            <div className="w-1/2 h-3 bg-slate-700 rounded mt-auto" />
                          </div>
                          <p className="font-bold text-center text-slate-800">Modo Oscuro</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="abono" className="m-0 space-y-10">
                    <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
                      {sub ? (
                        <div className="space-y-8">
                          <div className="grid sm:grid-cols-3 gap-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> Tipo de Abono</span>
                              <p className="text-2xl font-bold text-primary">{sub.planName}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-2"><Layers className="h-3 w-3 text-primary" /> Cursos Activos</span>
                              <p className="text-2xl font-bold text-primary">{sub.limits?.maxCourses === -1 ? 'Ilimitados' : `${sub.limits?.maxCourses || sub.maxSimultaneousCourses || 0} Máx.`}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-2"><Users className="h-3 w-3 text-primary" /> Estudiantes</span>
                              <p className="text-2xl font-bold text-primary">{sub.limits?.maxStudents === -1 ? 'Ilimitados' : sub.limits?.maxStudents || 0}</p>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/50 p-4 rounded-xl border border-primary/5 flex flex-col">
                              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Invitaciones/Curso</span>
                              <p className="text-lg font-black text-primary">{sub.invitationsPerCourse || 0}</p>
                            </div>
                            <div className="bg-white/50 p-4 rounded-xl border border-primary/5 flex flex-col">
                              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Branding Propio</span>
                              <p className="text-lg font-black text-primary">{sub.limits?.hasCustomBranding ? 'SÍ' : 'NO'}</p>
                            </div>
                            <div className="bg-white/50 p-4 rounded-xl border border-primary/5 flex flex-col">
                              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Analíticas</span>
                              <p className="text-lg font-black text-primary">{sub.limits?.hasAnalytics ? 'SÍ' : 'NO'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-primary/10 shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                                <ShieldCheck className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-black text-slate-800">Visibilidad del Perfil</p>
                                <p className="text-xs text-slate-400 font-medium">Habilita o deshabilita tu página pública</p>
                              </div>
                            </div>
                            <Switch 
                              checked={(profile?.profile as any)?.publicProfile?.enabled !== false}
                              onCheckedChange={(checked: boolean) => {
                                const userRef = doc(db, 'users', user!.uid);
                                updateDoc(userRef, {
                                  'profile.publicProfile.enabled': checked
                                }).then(() => toast({ title: checked ? 'Perfil Público' : 'Perfil Privado' }));
                              }}
                            />
                          </div>

                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Inicio del Abono</Label>
                              <div className="h-14 rounded-xl bg-white border px-6 flex items-center font-bold text-sm text-foreground/70">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" /> {startD ? format(startD, 'dd / MM / yyyy') : 'No registrada'}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Fin del Abono</Label>
                              <div className="h-14 rounded-xl bg-white border px-6 flex items-center font-bold text-sm text-foreground/70">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" /> {endD ? format(endD, 'dd / MM / yyyy') : 'No registrada'}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Vigencia Restante</Label>
                              <div className={cn("h-14 rounded-xl px-6 flex items-center font-bold text-sm border", daysLeft > 0 ? "bg-primary/5 text-primary border-primary/10" : "bg-destructive/10 text-destructive border-destructive/10")}>
                                <Sparkles className="h-4 w-4 mr-2" /> {daysLeft > 0 ? `${daysLeft} Días de Acceso` : 'Abono Expirado'}
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-primary/10">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Tu Página Personal de Tutor</Label>
                            {tutorProfileUrl ? (
                              <div className="mt-2 p-6 bg-white rounded-3xl border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-inner">
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
                                    value={origin + tutorProfileUrl} 
                                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-mono text-[10px] min-w-[200px]"
                                  />
                                  <Button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(origin + tutorProfileUrl);
                                      toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles' });
                                    }}
                                    className="rounded-xl h-12 font-bold bg-accent text-accent-foreground px-6"
                                  >
                                    Copiar
                                  </Button>
                                  <Link href={tutorProfileUrl} target="_blank">
                                    <Button variant="outline" className="rounded-xl h-12 font-bold px-6 border-2">Visitar</Button>
                                  </Link>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 p-8 bg-amber-50 rounded-3xl border border-amber-100 flex items-center gap-4 text-amber-800">
                                <Info className="h-5 w-5" />
                                <p className="text-sm font-medium">Define un <strong>Nombre de Usuario</strong> en la pestaña Perfil para habilitar tu página pública.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <CreditCard className="h-16 w-16 text-muted-foreground opacity-20 mx-auto mb-4" />
                          <p className="font-bold text-xl text-muted-foreground">Sin Abono Institucional Activo</p>
                          <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2">Contacta al administrador para habilitar tus capacidades académicas.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="mercadopago" className="m-0 space-y-8">
                    <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 space-y-8">
                      <div className="flex items-center gap-4 border-b border-primary/10 pb-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                          <Wallet className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-primary">Configuración de MercadoPago</h3>
                          <p className="text-sm text-muted-foreground">Vincula tu cuenta para recibir pagos de tus programas académicos.</p>
                        </div>
                      </div>

                      <div className="grid gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="mp-access-token" className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                            <KeyRound className="h-3 w-3" /> Access Token (Producción)
                          </Label>
                          <Input 
                            id="mp-access-token"
                            type="password" 
                            value={formData.mpAccessToken}
                            onChange={e => setFormData({...formData, mpAccessToken: e.target.value})}
                            placeholder="APP_USR-..." 
                            className="h-14 rounded-2xl bg-white border-none font-mono text-sm px-6 shadow-inner" 
                          />
                          <p className="text-[10px] text-muted-foreground italic px-1">Este token es privado y se utiliza para crear preferencias de pago de forma segura.</p>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="mp-public-key" className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" /> Public Key
                          </Label>
                          <Input 
                            id="mp-public-key"
                            value={formData.mpPublicKey}
                            onChange={e => setFormData({...formData, mpPublicKey: e.target.value})}
                            placeholder="APP_USR-..." 
                            className="h-14 rounded-2xl bg-white border-none font-mono text-sm px-6 shadow-inner" 
                          />
                          <p className="text-[10px] text-muted-foreground italic px-1">La clave pública permite inicializar el SDK de MercadoPago en el frontend de tus páginas de venta.</p>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4 items-start">
                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-blue-800 space-y-2 leading-relaxed">
                          <p className="font-bold uppercase tracking-tight">¿Dónde encuentro estas credenciales?</p>
                          <p>Ingresa a tu panel de <a href="https://www.mercadopago.com.ar/developers/panel/credentials" target="_blank" className="underline font-bold">MercadoPago Developers</a>, selecciona tu aplicación y busca la sección de **Credenciales de Producción**.</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </>
              )}

              <div className="mt-12 pt-10 border-t flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={loading} 
                  className="h-20 px-16 rounded-[2rem] text-2xl font-bold bg-primary shadow-3xl transition-all hover:scale-[1.02] active:scale-[0.98]"
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
