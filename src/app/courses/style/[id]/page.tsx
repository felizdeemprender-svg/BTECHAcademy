
'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Palette, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  Instagram, 
  Linkedin, 
  Twitter, 
  Youtube, 
  Globe, 
  MessageCircle, 
  Phone, 
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Play,
  User,
  Trophy,
  Check,
  Trash2,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { resolveProfileBrand } from '@/lib/landing-styles';
import type { StyleBrand } from '@/lib/landing-styles';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function CourseStylePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { storage } = useFirebase();
  const { profile: mentorProfile } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const courseRef = useMemoFirebase(() => (id ? doc(db, 'courses', id) : null), [db, id]);
  const { data: course, isLoading: courseLoading } = useDoc(courseRef);

  const [formData, setFormData] = useState({
    bio: '',
    brandName: '',
    primaryColor: '#3B2D86',
    logoUrl: '',
    socials: {} as Record<string, string>,
  });

  const ownBrands: StyleBrand[] = Array.isArray(mentorProfile?.profile?.brands) ? mentorProfile.profile.brands : [];
  const activeBrand = resolveProfileBrand(mentorProfile?.profile);
  const selectedBrand = formData.brandName
    ? ownBrands.find(b => b.name === formData.brandName) || null
    : activeBrand;
  const primaryColor = selectedBrand?.palette?.primary || formData.primaryColor;

  useEffect(() => {
    if (course && mentorProfile) {
      const override = course.brandingOverride || {};
      const mentorSocials = mentorProfile.profile?.socials || {};
      const overrideBrandName = override.brandName || '';
      const brandPrimary = overrideBrandName
        ? (ownBrands.find(b => b.name === overrideBrandName)?.palette?.primary)
        : activeBrand?.palette?.primary;
      setFormData({
        bio: override.bio || mentorProfile.profile?.bio || '',
        brandName: overrideBrandName,
        primaryColor: override.primaryColor || brandPrimary || mentorProfile.profile?.branding?.primaryColor || '#3B2D86',
        logoUrl: override.logoUrl || mentorProfile.profile?.branding?.logoUrl || '',
        socials: {
          linkedin: override.socials?.linkedin || mentorSocials.linkedin || '',
          twitter: override.socials?.twitter || mentorSocials.twitter || '',
          website: override.socials?.website || mentorSocials.website || '',
          instagram: override.socials?.instagram || mentorSocials.instagram || '',
          whatsapp: override.socials?.whatsapp || mentorSocials.whatsapp || '',
          phone: override.socials?.phone || mentorSocials.phone || '',
          youtube: override.socials?.youtube || mentorSocials.youtube || '',
          tiktok: override.socials?.tiktok || mentorSocials.tiktok || '',
          calendly: override.socials?.calendly || mentorSocials.calendly || '',
        },
      });
    }
  }, [course, mentorProfile]);

  const handleSaveStyle = async () => {
    if (!id) return;
    setLoading(true);
    const ref = doc(db, 'courses', id);
    const updateData = { brandingOverride: { ...formData, primaryColor }, updatedAt: serverTimestamp() };
    updateDoc(ref, updateData).then(() => toast({ title: 'Identidad Visual Actualizada' }))
      .catch(e => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'update', requestResourceData: updateData })))
      .finally(() => setLoading(false));
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `courses/${id}/logo_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast({ title: 'Logo del curso actualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al subir logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: '' }));
    toast({ title: 'Logo marcado para eliminación' });
  };

  if (courseLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-24">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/courses/manage')} className="rounded-full h-12 w-12 hover:bg-secondary"><ArrowLeft className="h-6 w-6" /></Button>
          <div><h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Diseñador de Marca del Curso</h1><p className="text-muted-foreground text-lg font-medium">{course?.title}</p></div>
        </header>

        <div className="space-y-10">
          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="bg-white/50 p-1.5 rounded-[1.5rem] mb-10 shadow-sm border w-full justify-start h-16 gap-2">
              <TabsTrigger value="perfil" className="rounded-xl font-bold px-8 h-13 text-base"><User className="h-4 w-4 mr-2" /> Perfil</TabsTrigger>
              <TabsTrigger value="contacto" className="rounded-xl font-bold px-8 h-13 text-base"><Globe className="h-4 w-4 mr-2" /> Contacto</TabsTrigger>
              <TabsTrigger value="marca" className="rounded-xl font-bold px-8 h-13 text-base"><Palette className="h-4 w-4 mr-2" /> Marca</TabsTrigger>
            </TabsList>

            <TabsContent value="perfil">
              <Card>
                <CardHeader className="bg-primary/5 p-10"><CardTitle className="text-2xl font-bold text-primary">Biografía Específica</CardTitle><CardDescription>Presentación del mentor para este programa.</CardDescription></CardHeader>
                <CardContent className="p-10 space-y-6">
                  <div className="space-y-2"><Label>Biografía corta</Label><Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} size="xl" className="bg-secondary/10 border-none p-8" /></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacto">
              <Card>
                <CardHeader className="bg-primary/5 p-10"><CardTitle className="text-2xl font-bold text-primary">Canales de Contacto</CardTitle><CardDescription>Sobrescribe las redes globales para este curso.</CardDescription></CardHeader>
                <CardContent className="p-10 grid sm:grid-cols-2 gap-8">
                  {[
                    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                    { id: 'twitter', label: 'X (Twitter)', icon: Twitter },
                    { id: 'instagram', label: 'Instagram', icon: Instagram },
                    { id: 'youtube', label: 'YouTube', icon: Youtube },
                    { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                    { id: 'phone', label: 'Teléfono', icon: Phone },
                    { id: 'website', label: 'Sitio Web', icon: Globe },
                    { id: 'calendly', label: 'Calendly', icon: Calendar },
                  ].map((social) => (
                    <div key={social.id} className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><social.icon className="h-3 w-3" /> {social.label}</Label>
                      <Input value={formData.socials[social.id] || ''} onChange={e => setFormData({...formData, socials: {...formData.socials, [social.id]: e.target.value}})} className="bg-secondary/10 border-none"  size="xl" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="marca">
              <Card>
                <CardHeader className="bg-primary/5 p-10"><CardTitle className="text-2xl font-bold text-primary">Identidad Visual del Curso</CardTitle></CardHeader>
                <CardContent className="p-10 space-y-12">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logo del Programa</Label>
                    <div className="flex items-center gap-8">
                      <div className="w-32 h-32 rounded-3xl bg-secondary/20 flex items-center justify-center relative overflow-hidden border-4 border-white">
                        {(formData.logoUrl && typeof formData.logoUrl === 'string') ? (
                          <Image 
                            src={formData.logoUrl} 
                            alt="Logo" 
                            fill 
                            sizes="128px"
                            className="object-contain p-4" 
                            unoptimized 
                            data-ai-hint="course logo"
                          />
                        ) : <ImageIcon className="h-10 w-10 text-muted-foreground/20" />}
                      </div>
                      <div className="flex flex-col gap-3">
                        <Button variant="outline" className="rounded-2xl font-bold h-14 px-8 border-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                          {uploadingLogo ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-5 w-5" />} Cambiar Logo
                        </Button>
                        {formData.logoUrl && (
                          <Button variant="ghost" className="rounded-2xl font-bold h-12 px-8 text-destructive hover:bg-destructive/10" onClick={handleDeleteLogo}>
                            <Trash2 className="mr-2 h-5 w-5" /> Eliminar Logo
                          </Button>
                        )}
                      </div>
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleUploadLogo} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand visual del curso (hereda el DTCG de tu marca)</Label>
                    <div className="bg-secondary/10 p-6 rounded-3xl space-y-4">
                      {ownBrands.length === 0 ? (
                        <div className="flex flex-col gap-4">
                          <div className="space-y-1">
                            <p className="font-bold text-primary">Usa tu brand activo</p>
                            <p className="text-sm text-muted-foreground">
                              El curso hereda automáticamente el color de tu marca activa ({activeBrand?.palette?.primary || mentorProfile?.profile?.branding?.primaryColor || '#3B2D86'}).
                              Sube tus brands DTCG en <span className="font-bold">Ajustes → Mis brands</span> para personalizar este curso.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {(activeBrand?.palette?.primary || mentorProfile?.profile?.branding?.primaryColor) && (
                              <div className="h-10 w-10 rounded-xl ring-4 ring-white shadow" style={{ backgroundColor: activeBrand?.palette?.primary || mentorProfile?.profile?.branding?.primaryColor }} />
                            )}
                            <span className="text-xs text-muted-foreground font-bold">{activeBrand?.name || 'Brand activo'}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1">
                            <p className="font-bold text-primary">Selecciona un brand DTCG</p>
                            <p className="text-sm text-muted-foreground">El color, tipografía y tokens se heredan automáticamente de tu marca. El brand activo se marca en verde.</p>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, brandName: '', primaryColor: activeBrand?.palette?.primary || formData.primaryColor })}
                              className={cn(
                                'flex items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-colors',
                                formData.brandName === '' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-transparent hover:border-primary/40'
                              )}
                            >
                              <div className="h-10 w-10 rounded-xl ring-4 ring-white shadow shrink-0" style={{ backgroundColor: activeBrand?.palette?.primary || '#3B2D86' }} />
                              <div className="min-w-0">
                                <p className="font-bold truncate">{activeBrand?.name || 'Brand activo'}</p>
                                <p className="text-xs text-muted-foreground">{formData.brandName === '' ? 'Usando este brand' : 'Heredar brand activo'}</p>
                              </div>
                              {formData.brandName === '' && <Check className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />}
                            </button>
                            {ownBrands.map((brand) => {
                              const isSelected = formData.brandName === brand.name;
                              const isActive = activeBrand?.name === brand.name;
                              return (
                                <button
                                  key={brand.name}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, brandName: brand.name, primaryColor: brand.palette?.primary || formData.primaryColor })}
                                  className={cn(
                                    'flex items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-colors',
                                    isSelected ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-transparent hover:border-primary/40'
                                  )}
                                >
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <div className="h-6 w-6 rounded-lg ring-2 ring-white shadow" style={{ backgroundColor: brand.palette?.primary || '#3B2D86' }} />
                                    <div className="h-6 w-6 rounded-lg ring-2 ring-white shadow" style={{ backgroundColor: brand.palette?.secondary || brand.palette?.primary || '#3B2D86' }} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold truncate">{brand.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {isActive ? 'Brand activo en tu web' : brand.tokens?.themeMode || 'light'}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color primario resultante</Label>
                      <div className="flex items-center gap-4 bg-white rounded-2xl border p-4">
                        <div className="h-12 w-12 rounded-xl ring-4 ring-white shadow" style={{ backgroundColor: primaryColor }} />
                        <div className="flex-1 space-y-1">
                          <p className="text-lg font-mono font-bold">{primaryColor}</p>
                          <p className="text-xs text-muted-foreground">Se aplicará al curso automáticamente. Para elegir un color libre, cambia el brand en Ajustes.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSaveStyle} className="w-full h-20 rounded-lg text-2xl font-bold bg-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Save className="mr-3 h-8 w-8" />} Guardar Configuración del Curso
          </Button>

          <div className="pt-10 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Simulador de Experiencia del Alumno</h2>
            <Card className="rounded-lg overflow-hidden border-none bg-slate-50 p-12">
              <header className="flex items-end justify-between bg-white p-8 rounded-lg border-4 border-white mb-10">
                <div className="flex items-end gap-4">
                  {Object.entries(formData.socials).map(([key, val]) => val && (
                    <div key={key} className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                      {key === 'linkedin' && <Linkedin className="h-5 w-5" />}
                      {key === 'whatsapp' && <MessageCircle className="h-5 w-5" />}
                      {key === 'instagram' && <Instagram className="h-5 w-5" />}
                      {key === 'twitter' && <Twitter className="h-5 w-5" />}
                      {key === 'tiktok' && <TikTokIcon className="h-5 w-5" />}
                      {key === 'youtube' && <Youtube className="h-5 w-5" />}
                      {key === 'phone' && <Phone className="h-5 w-5" />}
                      {key === 'website' && <Globe className="h-5 w-5" />}
                      {key === 'calendly' && <Calendar className="h-5 w-5" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-6 text-right">
                  <div><h3 className="font-bold text-2xl" style={{ color: primaryColor }}>{course?.title}</h3><p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.3em]">Módulo Actual: Introducción</p></div>
                  <div className="w-16 h-16 relative bg-secondary/10 rounded-2xl overflow-hidden flex items-center justify-center">
                    {(formData.logoUrl && typeof formData.logoUrl === 'string') ? (
                      <Image 
                        src={formData.logoUrl} 
                        alt="Logo" 
                        fill 
                        sizes="64px"
                        className="object-contain p-2" 
                        unoptimized 
                        data-ai-hint="course logo"
                      />
                    ) : <ImageIcon className="h-6 w-6 text-muted-foreground/30" />}
                  </div>
                </div>
              </header>
              <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <div className="aspect-video rounded-lg bg-black flex items-center justify-center border-8 border-white"><Play className="h-20 w-20 text-white/20" /></div>
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold" style={{ color: primaryColor }}>1. Bienvenido al Programa</h1>
                    <p className="text-muted-foreground leading-relaxed text-lg">{formData.bio || 'Tu biografía aparecerá aquí...'}</p>
                  </div>

                  <div className="pt-12 space-y-8 border-t border-dashed">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pre-visualización de Módulos y Evaluaciones</h4>
                    
                    <Card className="p-8 rounded-lg border-none shadow-md bg-white">
                      <div className="flex items-center gap-3 mb-6">
                        <Badge variant="secondary" className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest">Opción Múltiple</Badge>
                      </div>
                      <p className="font-bold text-lg mb-8 leading-tight">¿Cuál es el objetivo principal de este primer módulo introductorio?</p>
                      <div className="grid gap-4">
                        <Button 
                          className="justify-start h-auto py-4 px-6 rounded-xl text-left border-2 whitespace-normal font-bold shadow-lg" 
                          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                        >
                          Definir las bases teóricas del programa
                        </Button>
                        <Button variant="outline" className="justify-start h-auto py-4 px-6 rounded-xl text-left border-2 whitespace-normal">
                          Explorar herramientas avanzadas de diseño
                        </Button>
                      </div>
                    </Card>

                    <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-lg flex items-center gap-4 animate-pulse">
                      <Zap className="h-8 w-8 text-emerald-600" />
                      <div>
                        <p className="font-bold text-emerald-800 text-lg">Modo Refuerzo Activado</p>
                        <p className="text-sm text-emerald-600">Se han habilitado preguntas adicionales para validar tu conocimiento.</p>
                      </div>
                    </div>

                    <Card className="p-8 rounded-lg border-none shadow-md bg-white opacity-80 grayscale-[0.5]">
                      <div className="flex items-center gap-3 mb-6">
                        <Badge variant="secondary" className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-700 border-none">Pregunta de Soporte</Badge>
                      </div>
                      <p className="font-bold text-lg mb-8 leading-tight">Redacta una breve síntesis de lo aprendido hasta el momento:</p>
                      <div className="h-32 bg-secondary/10 rounded-2xl border-2 border-dashed border-muted-foreground/20" />
                    </Card>
                  </div>
                </div>
                <div className="space-y-8">
                  <Card className="p-10 rounded-lg text-white border-none" style={{ backgroundColor: primaryColor }}>
                    <Trophy className="h-12 w-12 mb-6 opacity-50" />
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mb-2">Tu Progreso</p>
                    <p className="text-5xl font-bold">0%</p>
                    <Progress value={10} className="mt-6 bg-white/20 h-2" />
                  </Card>
                  <Card className="p-10 rounded-lg bg-white border-none space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl relative overflow-hidden shadow-md">
                        <Image 
                          src={(mentorProfile?.photoURL && typeof mentorProfile.photoURL === 'string') ? mentorProfile.photoURL : 'https://placehold.co/100/png'} 
                          alt="Mentor" 
                          fill 
                          sizes="48px"
                          className="object-cover" 
                          unoptimized 
                          data-ai-hint="mentor avatar"
                        />
                      </div>
                      <div>
                        <p className="font-bold">{mentorProfile?.displayName}</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Tu Mentor</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {formData.socials.instagram && <div className="p-3 rounded-xl bg-secondary/50 text-muted-foreground"><Instagram className="h-4 w-4" /></div>}
                      {formData.socials.linkedin && <div className="p-3 rounded-xl bg-secondary/50 text-muted-foreground"><Linkedin className="h-4 w-4" /></div>}
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
