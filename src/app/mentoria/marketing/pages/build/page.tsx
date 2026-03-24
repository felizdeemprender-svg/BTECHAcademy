
'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Layout, 
  BookOpen, 
  Loader2, 
  BrainCircuit, 
  Target,
  CheckCircle2,
  Rocket,
  Zap,
  Mail,
  Instagram,
  Megaphone,
  Save,
  Pencil,
  ImageIcon,
  Video,
  Play,
  RefreshCw,
  Upload,
  Trash2,
  Type,
  Palette,
  FileText,
  DollarSign,
  Link2,
  UserCheck,
  Lightbulb,
  Tags,
  Twitter,
  Linkedin,
  Circle,
  FileEdit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { generateCampaignAssets, GenerateCampaignOutput } from '@/ai/flows/generate-campaign-assets';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { ImageEditor } from '@/components/courses/ImageEditor';

const STRATEGIC_SEGMENTS = [
  { id: 'technical', label: 'Perfiles Técnicos (Hard Skills)', desc: 'Enfoque en dominio de herramientas, código, ingeniería o implementación precisa.' },
  { id: 'health', label: 'Área Salud y Bienestar', desc: 'Enfoque en autoridad profesional, evidencia científica y ética del cuidado.' },
  { id: 'corporate', label: 'Sector Corporativo / B2B', desc: 'Enfoque en eficiencia operativa, liderazgo de equipos, ROI y reporte de resultados.' },
  { id: 'entrepreneurs', label: 'Solopreneurs & Freelancers', desc: 'Enfoque en escala de marca personal, optimización del tiempo y libertad operativa.' },
  { id: 'career_pivot', label: 'Reconversión Profesional', desc: 'Enfoque en seguridad ante la automatización y adquisición rápida de nuevas competencias.' },
  { id: 'academic', label: 'Estudiantes / Académicos', desc: 'Enfoque en profundidad teórica, certificaciones y especialización de alto nivel.' }
];

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  if (platform?.toLowerCase() === 'instagram') return <Instagram className={className} />;
  if (platform?.toLowerCase() === 'twitter' || platform?.toLowerCase() === 'x') return <Twitter className={className} />;
  if (platform?.toLowerCase() === 'tiktok') return <TikTokIcon className={className} />;
  if (platform?.toLowerCase() === 'linkedin') return <Linkedin className={className} />;
  return <Circle className={className} />;
};

const SocialLivePreview = ({ social, tokens }: { social: any, tokens?: any }) => {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const isCarousel = social.type === 'carousel' || social.type === 'thread' || social.type === 'document';
  const isVertical = social.type === 'story' || social.type === 'short_video';
  const slides = social.slides?.length > 0 ? social.slides : [{ text: social.hook || '', imageUrl: '' }];
  const slide = slides[currentSlideIdx] || slides[0];
  
  // Construct the preview URL for the linked landing
  const landingUrl = social.landingUrl ? social.landingUrl : (social.landingIdx !== undefined ? `landing-${social.landingIdx + 1}.html` : 'link_en_bio');

  useEffect(() => {
    if (currentSlideIdx >= slides.length) setCurrentSlideIdx(0);
  }, [slides.length]);
  
  return (
    <div className="sticky top-10 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <PlatformIcon platform={social.platform || 'Instagram'} className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{social.platform || 'Red Social'}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{social.type?.replace('_', ' ')}</p>
          </div>
        </div>
        {isCarousel && <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase h-5">{slides.length} Slots</Badge>}
      </div>

      <div className={cn(
          "relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 transition-all duration-500 group/mockup",
          isVertical ? "aspect-[9/16] w-full max-w-[340px]" : "aspect-square w-full"
        )}
      >
        {isCarousel && (
          <>
            <div className="absolute inset-0 translate-x-3 translate-y-3 bg-slate-200 rounded-[2rem] z-0 shadow-sm border border-slate-300" />
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-slate-300 rounded-[2rem] z-0 shadow-sm border border-slate-400" />
          </>
        )}

        <div className="absolute inset-0 z-10 flex flex-col bg-slate-800">
          {slide.imageUrl ? (
            <img 
              key={currentSlideIdx}
              src={slide.imageUrl} 
              alt="Mockup" 
              className="absolute inset-0 w-full h-full object-cover opacity-80 animate-in fade-in zoom-in-95 duration-500" 
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <ImageIcon className="h-12 w-12 text-slate-300 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
        </div>

        <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
            {isCarousel && (
              <div className="flex gap-1.5 mt-1 bg-black/40 px-3 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                {slides.map((_: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentSlideIdx(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300 transform", 
                      i === currentSlideIdx ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/30 hover:bg-white/50"
                    )} 
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-center flex flex-col items-center justify-center min-h-[100px] shadow-lg">
              <h4 
                className="text-lg font-black leading-[1.3] text-white drop-shadow-lg animate-in slide-in-from-bottom-2 duration-500" 
                style={{ fontFamily: tokens?.fontHeading }}
              >
                {slide.text || social.hook || 'Escribe el texto visual aquí...'}
              </h4>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm shadow-sm" />
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 drop-shadow-md">@{social.handle || 'tu_cuenta'}</span>
              </div>
              <Button size="sm" className="h-7 px-3 rounded-lg text-[8px] font-black uppercase shadow-lg truncate max-w-[120px]" style={{ backgroundColor: tokens?.accent || '#10b981' }}>
                {landingUrl}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 rounded-[2rem] bg-white border shadow-sm text-sm text-slate-600 line-clamp-4 leading-relaxed relative">
        <span className="font-bold text-slate-900 mr-2">@{social.handle || 'tu_cuenta'}</span>
        {social.caption || 'Aquí irá el cuerpo de la publicación...'}
        <div className="mt-3 text-primary font-bold text-xs">
          {social.landingIdx !== undefined && <span className="mr-2 block mb-1">🔗 Ver más: {landingUrl}</span>}
          {social.hashtags?.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}
        </div>
      </div>
    </div>
  );
};


export default function ContentBuilderMatchPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}

function BuilderContent() {
  const { profile } = useAuth();
  const { storage } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, label: string } | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  const [pageTitle, setPageTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [price, setPrice] = useState<number>(49990);
  const [generatedAssets, setGeneratedAssets] = useState<GenerateCampaignOutput | null>(null);
  const [blueprintData, setBlueprintData] = useState<any>(null);

  const [activeLandingIdx, setActiveLandingIdx] = useState(0);
  const [activeEmailIdx, setActiveEmailIdx] = useState(0);
  const [activeSocialIdx, setActiveSocialIdx] = useState(0);
  const [activeAdsIdx, setActiveAdsIdx] = useState(0);

  // Load existing page for editing
  useEffect(() => {
    if (editId && db) {
      const loadPage = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'salesPages', editId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setSelectedCourseId(data.courseId);
            setSelectedCollectionId(data.templateCollectionId);
            setPageTitle(data.title);
            setPrice(data.price);
            setTargetAudience(data.targetAudience || '');
            setGeneratedAssets(data.aiContent);
            setStep(3); // Jump directly to editing
          }
        } catch (err) {
          console.error(err);
          toast({ variant: 'destructive', title: 'Error al cargar el pack para editar' });
        } finally {
          setLoading(false);
        }
      };
      loadPage();
    }
  }, [editId, db]);

  // Load blueprint data when collection is selected or loaded
  useEffect(() => {
    if (selectedCollectionId && db) {
      getDoc(doc(db, 'templateCollections', selectedCollectionId)).then(snap => {
        if (snap.exists()) setBlueprintData(snap.data());
      });
    }
  }, [selectedCollectionId, db]);

  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid), where('status', '==', 'approved'));
  }, [db, profile?.uid]);
  const { data: courses, isLoading: coursesLoading } = useCollection(coursesQuery);

  const collectionsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'templateCollections'), where('ownerId', '==', profile.uid), orderBy('createdAt', 'desc'));
  }, [db, profile?.uid]);
  const { data: collections, isLoading: collectionsLoading } = useCollection(collectionsQuery);

  const tagsQuery = useMemoFirebase(() => query(collection(db, 'tags'), orderBy('name', 'asc')), [db]);
  const { data: allTags } = useCollection(tagsQuery);

  const selectedCourse = useMemo(() => {
    return courses?.find(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const dynamicProfiles = useMemo(() => {
    if (!selectedCourse || !allTags) return STRATEGIC_SEGMENTS;
    
    const courseTags = (selectedCourse.tagIds || []).map((tid: string) => {
      const tag = allTags.find(t => t.id === tid);
      if (!tag) return null;
      return {
        id: tag.id,
        label: `Especialista en ${tag.name}`,
        desc: `Perfil enfocado en la maestría de ${tag.name}. Busca profundidad técnica y aplicación práctica institucional.`
      };
    }).filter(Boolean);

    return courseTags.length > 0 ? courseTags : STRATEGIC_SEGMENTS;
  }, [selectedCourse, allTags]);

  const handleMatchAndGenerate = async () => {
    if (!selectedCourseId || !selectedCollectionId) return;
    setIsGenerating(true);
    try {
      const course = courses?.find(c => c.id === selectedCourseId);
      const collection = collections?.find(c => c.id === selectedCollectionId);
      
      if (!course || !collection) throw new Error('No se pudo localizar el programa o la colección seleccionada.');

      setBlueprintData(collection);

      const tasks: { channel: string, label: string, payload: any }[] = [];
      const { assets } = collection;
      
      const chunkArray = (arr: any[], size: number) => 
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

      if (assets?.landings?.length) {
        chunkArray(assets.landings, 2).forEach((chunk, i) => 
          tasks.push({ channel: 'landings', label: `Landings ${i>0?`(${i+1})`:''}...`, payload: { landings: chunk } })
        );
      }
      if (assets?.emails?.length) {
        chunkArray(assets.emails, 3).forEach((chunk, i) => 
          tasks.push({ channel: 'emails', label: `Emails ${i>0?`(${i+1})`:''}...`, payload: { emails: chunk } })
        );
      }
      if (assets?.ads?.length) {
        chunkArray(assets.ads, 2).forEach((chunk, i) => 
          tasks.push({ channel: 'ads', label: `Anuncios ${i>0?`(${i+1})`:''}...`, payload: { ads: chunk } })
        );
      }
      if (assets?.socials?.length) {
        const platforms = ['instagram', 'tiktok', 'linkedin', 'twitter'];
        platforms.forEach(plat => {
          const platSocials = assets.socials.filter((s: any) => s.platform === plat);
          if (platSocials.length > 0) {
            chunkArray(platSocials, 2).forEach((chunk, i) => 
              tasks.push({ 
                channel: 'socials', 
                label: `Creando ${plat.charAt(0).toUpperCase() + plat.slice(1)} ${platSocials.length > 2 ? `(${i+1})` : ''}...`, 
                payload: { socials: chunk } 
              })
            );
          }
        });
        
        const otherSocials = assets.socials.filter((s: any) => !platforms.includes(s.platform));
        if (otherSocials.length > 0) {
          chunkArray(otherSocials, 2).forEach((chunk, i) => 
            tasks.push({ channel: 'socials', label: `Otros Posts ${i>0?`(${i+1})`:''}...`, payload: { socials: chunk } })
          );
        }
      }

      setGenerationProgress({ current: 0, total: tasks.length || 1, label: 'Iniciando conexión interactiva...' });

      let finalAssets: any = {};

      // Sanitize keywords for loremflickr: remove accents, special chars, spaces > dashes, max 5 words
      const sanitizeKeywords = (raw: string): string => {
        return raw
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
          .replace(/[^a-zA-Z0-9,\s-]/g, '')                // remove special chars
          .replace(/\s+/g, '-')                             // spaces → dashes
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 2)
          .slice(0, 5)
          .join(',');
      };

      // Recursive function to replace invalid image URLs with loremflickr placeholders (keyword-aware)
      const ensureValidUrls = (obj: any, baseSeed: number) => {
        const course = courses?.find(c => c.id === selectedCourseId);
        const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t => t.name) || [];
        
        const globalKeywords = sanitizeKeywords([
          ...courseTags.slice(0, 3),
          course?.title?.split(' ').slice(0, 3).join('-') || ''
        ].filter(Boolean).join(','));

        let counter = 0;
        const walk = (o: any, path: string = '') => {
          if (typeof o !== 'object' || o === null) return;
          for (const key in o) {
            if (key === 'imageUrl' && typeof o[key] === 'string' && o[key]) {
              const val = o[key].toLowerCase();
              const isInvalid = !val.startsWith('http');
              
              if (isInvalid) {
                const uniqueSeed = baseSeed + counter + Math.floor(Math.random() * 1000);

                if (path.includes('aboutMentor') || val.includes('mentor') || val.includes('tutor') || val.includes('expert')) {
                  o[key] = profile?.photoURL || `https://loremflickr.com/800/800/professional,speaker,expert?lock=${uniqueSeed}`;
                } else if (val.includes('logo')) {
                  o[key] = course?.logo || `https://loremflickr.com/800/800/logo,brand?lock=${uniqueSeed}`;
                } else if (counter === 0 && course?.thumbnail && !path.includes('social')) {
                  o[key] = course.thumbnail;
                } else {
                  // Use sanitized global keywords
                  const kw = globalKeywords || 'business,strategy,growth';
                  o[key] = `https://loremflickr.com/800/800/${kw}?lock=${uniqueSeed}`;
                }
              }
              counter++;
            } else if (typeof o[key] === 'object') {
              walk(o[key], `${path}.${key}`);
            }
          }
        };
        walk(obj);
        return obj;
      };

      for (let i = 0; i < tasks.length; i++) {
        setGenerationProgress({ current: i, total: tasks.length, label: tasks[i].label });
        const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t => t.name) || [];
        
        const rawResult = await generateCampaignAssets({
          courseTitle: course.title,
          courseDescription: course.description || '',
          mentorName: profile?.displayName || 'Mentor Experto',
          mentorBio: profile?.profile?.bio,
          mentorSocials: profile?.profile?.socials,
          templateDirectives: collection.directives,
          templateStructure: tasks[i].payload,
          targetAudience: targetAudience,
          courseTags: courseTags
        });
        
        const result = ensureValidUrls(rawResult, i * 100);

        if (result.landings?.length) finalAssets.landings = [...(finalAssets.landings || []), ...result.landings];
        if (result.emails?.length) finalAssets.emails = [...(finalAssets.emails || []), ...result.emails];
        if (result.socials?.length) finalAssets.socials = [...(finalAssets.socials || []), ...result.socials];
        if (result.ads?.length) finalAssets.ads = [...(finalAssets.ads || []), ...result.ads];
      }

      setGenerationProgress({ current: tasks.length, total: tasks.length, label: 'Finalizando Fusión...' });

      if (!finalAssets.emails && !finalAssets.landings && !finalAssets.socials) {
        throw new Error('La IA no devolvió un formato de activos válido.');
      }

      const assetsWithLinks = {
        ...finalAssets,
        emails: (finalAssets.emails || []).map((e: any, idx: number) => ({ ...e, targetLandingIdx: idx }))
      };

      setGeneratedAssets(assetsWithLinks as any);
      setStep(3);
      toast({ title: 'Activos Generados', description: 'Revisa las 3 variantes estratégicas antes de guardar.' });
    } catch (e: any) {
      console.error("[Fusion Error]", e);
      toast({ 
        variant: 'destructive', 
        title: 'Error de Fusión', 
        description: e.message || 'No se pudo sincronizar el contenido con el blueprint.' 
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleFinalSave = async () => {
    if (!profile?.uid || !generatedAssets) return;
    setLoading(true);
    try {
      const pageId = editId || Math.random().toString(36).substring(2, 15);
      const pageRef = doc(db, 'salesPages', pageId);
      const course = courses?.find(c => c.id === selectedCourseId);
      
      const exportUrls: Record<string, string> = {};
      const packs = [
        { 
          name: 'emails', 
          content: generatedAssets.emails.map((e, i) => {
            const target = (e as any).targetLandingIdx ?? i;
            const customUrl = (e as any).customCtaUrl;
            // Tracked link for Emails
            const link = customUrl || `${window.location.origin}/api/track?pageId=${pageId}&v=${target}&source=email&channel=email`;
            return `VARIANTE ${i+1}\nASUNTO: ${e.subject}\nLINK DE CONVERSIÓN: ${link}\n\nCONTENIDO DEL EMAIL:\n--------------------------------------------------\n${e.body}\n--------------------------------------------------`;
          }).join('\n\n\n\n') 
        },
        { 
          name: 'social', 
          content: (generatedAssets.socials as any[]).map((s, i) => {
            // Tracked link for Social Posts
            const landingLink = s.landingIdx !== undefined 
              ? `${window.location.origin}/api/track?pageId=${pageId}&v=${s.landingIdx}&source=${s.type?.toLowerCase() || 'social_post'}&channel=social` 
              : 'Link en Bio';
            
            const slidesText = s.slides.map((sl: any, si: number) => `PLACA ${si+1}:\n[TEXTO EN IMAGEN]: ${sl.text}\n[LINK IMAGEN]: ${sl.imageUrl}`).join('\n\n');
            return `${s.marketingName?.toUpperCase() || `PACK SOCIAL ${i+1}`} (${s.type?.toUpperCase()})\n\nGANCHO: ${s.hook}\n\nLINK DE DESTINO (PARA BOTÓN/BIO): ${landingLink}\n\nCAPTION (PARA COPIAR EN REDES):\n--------------------------------------------------\n${s.caption}\n\n🔗 ${landingLink}\n--------------------------------------------------\n\nCONTENIDO PARA DISEÑO DE PLACAS:\n${slidesText}\n\nHASHTAGS SUGERIDOS: ${s.hashtags.join(' ')}`;
          }).join('\n\n\n==================================================\n\n\n') 
        },
        { 
          name: 'ads', 
          content: generatedAssets.ads.map((a, i) => {
            return `CONJUNTO DE ANUNCIOS ${i+1}\n\nTITULARES SUGERIDOS:\n${a.headlines.map((h, hi) => `${hi+1}. ${h}`).join('\n')}\n\nDESCRIPCIONES:\n${a.descriptions.map((d, di) => `D${di+1}. ${d}`).join('\n')}\n\nKEYWORDS SEO: ${a.keywords.join(', ')}`;
          }).join('\n\n\n--------------------------------------------------\n\n\n') 
        }
      ];

      try {
        for (const pack of packs) {
          const sRef = ref(storage, `sales_pages/${pageId}/exports/${pack.name}_pack.txt`);
          await uploadBytes(sRef, new Blob([pack.content], { type: 'text/plain' }));
          exportUrls[`${pack.name}ExportUrl`] = await getDownloadURL(sRef);
        }
      } catch (storageErr: any) {
        console.error("Storage Error:", storageErr);
        throw new Error(`Error al generar archivos de exportación: ${storageErr.message}`);
      }
      
      // Enrich aiContent with resolved URLs, designTokens and status for the Command Center
      const enrichedLandings = (generatedAssets.landings as any[]).map((l, i) => {
        const blueprint = blueprintData?.assets?.landings?.[i];
        return {
          ...l,
          id: `${pageId}_landing_${i}`,
          designTokens: blueprint?.designTokens || {},
        };
      });

      const enrichedSocials = (generatedAssets.socials as any[]).map((s, i) => ({
        ...s,
        id: `${pageId}_social_${i}`,
        designTokens: blueprintData?.assets?.socials?.[i]?.designTokens || {},
        finalLandingUrl: s.landingIdx !== undefined ? `${window.location.origin}/v/${pageId}?v=${s.landingIdx}` : null,
        publishStatus: 'pending',
        lastError: null,
        scheduledAt: null,
        engineHints: {
          platformType: s.platform,
          format: s.type,
          priority: i === 0 ? 'high' : 'normal'
        }
      }));

      const enrichedEmails = (generatedAssets.emails as any[]).map((e, i) => ({
        ...e,
        id: `${pageId}_email_${i}`,
        designTokens: blueprintData?.assets?.emails?.[i]?.designTokens || {},
        finalCtaUrl: (e as any).customCtaUrl || `${window.location.origin}/v/${pageId}?v=${(e as any).targetLandingIdx ?? i}`,
        publishStatus: 'pending',
        engineHints: {
          templateType: e.type,
          segmentation: targetAudience.substring(0, 100),
          trackingEnabled: true
        }
      }));

      const enrichedAds = (generatedAssets.ads as any[]).map((a, i) => ({
        ...a,
        id: `${pageId}_ad_${i}`,
        designTokens: blueprintData?.assets?.ads?.[i]?.designTokens || {},
        targetLandingUrl: `${window.location.origin}/v/${pageId}?v=0`,
        publishStatus: 'pending',
        engineHints: {
          keywordsCount: a.keywords.length,
          adGroupType: a.type,
          suggestedAudience: targetAudience
        }
      }));

      const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t => 
        t.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      ).filter(Boolean) || [];

      const pageData: any = {
        id: pageId,
        mentorId: profile.uid,
        title: pageTitle || `Lanzamiento: ${course?.title}`,
        courseId: selectedCourseId,
        campaignStatus: 'ready_to_publish',
        courseKeywords: courseTags.slice(0, 5).join(',') || 'education,business,professional',
        engineMeta: {
          generationEngine: 'Antigravity-AI-Command',
          blueprintId: selectedCollectionId,
          sourceApp: 'BTECHAcademy'
        },
        price: price,
        targetAudience: targetAudience,
        templateCollectionId: selectedCollectionId,
        aiContent: {
          ...generatedAssets,
          landings: enrichedLandings,
          socials: enrichedSocials,
          emails: enrichedEmails,
          ads: enrichedAds
        },
        exportUrls: exportUrls,
        slug: (pageTitle || course?.title || 'lanzamiento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        branding: course?.brandingOverride || profile.profile?.branding || {},
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (!editId) {
        pageData.createdAt = serverTimestamp();
      }

      try {
        if (editId) {
          const { createdAt, ...updateData } = pageData; // Don't overwrite createdAt
          await updateDoc(pageRef, updateData);
        } else {
          await setDoc(pageRef, pageData);
        }
      } catch (firestoreErr: any) {
        console.error("Firestore Error:", firestoreErr);
        throw new Error(`Error al guardar en base de datos: ${firestoreErr.message}`);
      }

      toast({ title: 'Pack Multimedia Guardado', description: 'Tus 3 rutas de lanzamiento están activas.' });
      router.push('/mentoria/marketing/pages');
    } catch (e: any) {
      console.error("[Final Save Error]", e);
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar el Pack', 
        description: e.message || 'Ocurrió un error inesperado al procesar el guardado.'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = (channel: keyof GenerateCampaignOutput, variantIdx: number, field: string, value: any, subIndex?: number) => {
    if (!generatedAssets) return;
    const newAssets = { ...generatedAssets };
    const variant = newAssets[channel][variantIdx];
    
    if (subIndex !== undefined && Array.isArray((variant as any)[field])) {
      if (typeof (variant as any)[field][subIndex] === 'object') {
        (variant as any)[field][subIndex] = { ...(variant as any)[field][subIndex], ...value };
      } else {
        (variant as any)[field][subIndex] = value;
      }
    } else {
      (variant as any)[field] = value;
    }
    setGeneratedAssets(newAssets);
  };

  const allFonts = useMemo(() => {
    const fonts = new Set(['Inter', 'Outfit']);
    if (blueprintData?.assets) {
      Object.values(blueprintData.assets).forEach((group: any) => {
        if (Array.isArray(group)) {
          group.forEach(asset => {
            if (asset.designTokens?.fontHeading) fonts.add(asset.designTokens.fontHeading);
            if (asset.designTokens?.fontBody) fonts.add(asset.designTokens.fontBody);
          });
        }
      });
    }
    return Array.from(fonts);
  }, [blueprintData]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <style jsx global>{`
          ${allFonts.map(f => `@import url('https://fonts.googleapis.com/css2?family=${f.replace(/\s+/g, '+')}&display=swap');`).join('\n')}
        `}</style>
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Generador Multimedia x3</h1>
            <p className="text-sm text-muted-foreground font-medium">Fusión estratégica avanzada. Paso {step} de 3.</p>
          </div>
        </header>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
              <CardHeader className="bg-primary/5 p-8">
                <CardTitle className="text-xl flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary" /> Programa Académico</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex-1">
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3">
                    {courses?.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => setSelectedCourseId(c.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                          selectedCourseId === c.id ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-border/50 hover:border-primary/20"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm">{c.title}</span>
                          <div className="flex flex-wrap gap-1">
                            {c.tagIds?.map((tid: string) => {
                              const tag = allTags?.find(t => t.id === tid);
                              return tag ? <Badge key={tid} variant="outline" className="text-[8px] h-4 py-0 border-primary/20 text-primary/60">{tag.name}</Badge> : null;
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
              <CardHeader className="bg-accent/5 p-8">
                <CardTitle className="text-xl flex items-center gap-3"><Layout className="h-5 w-5 text-accent" /> Blueprint de Identidad</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex-1">
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3">
                    {collections?.map(coll => (
                      <div 
                        key={coll.id} 
                        onClick={() => setSelectedCollectionId(coll.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                          selectedCollectionId === coll.id ? "bg-accent/5 border-accent shadow-sm" : "bg-white border-border/50 hover:border-accent/20"
                        )}
                      >
                        <p className="font-bold text-sm">{coll.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">"{coll.directives}"</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button onClick={() => setStep(2)} disabled={!selectedCourseId || !selectedCollectionId} className="w-full h-14 rounded-2xl font-bold">Configurar Enfoque <ArrowRight className="ml-2 h-5 w-5" /></Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {step === 2 && (
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden max-w-3xl mx-auto">
            <CardHeader className="bg-primary/5 p-10"><CardTitle className="text-2xl font-bold">Parámetros de la Campaña</CardTitle></CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Título del Pack (Interno)</Label>
                  <Input value={pageTitle} onChange={e => setPageTitle(e.target.value)} placeholder="Ej: Lanzamiento Masterclass IA" className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-accent">Precio del Programa</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                    <Input 
                      type="number" 
                      value={price} 
                      onChange={e => setPrice(parseFloat(e.target.value) || 0)} 
                      className="h-14 rounded-2xl bg-accent/5 border-none pl-12 font-black text-xl text-accent" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Segmentación Estratégica (Buyer Persona)</Label>
                    <Badge variant="outline" className="text-[8px] font-bold text-accent border-accent/20 h-5 px-2">Guía para la IA</Badge>
                  </div>
                  <Textarea 
                    value={targetAudience} 
                    onChange={e => setTargetAudience(e.target.value)} 
                    placeholder="Ej: Médicos interesados en optimizar su consulta con IA o Programadores buscando especialización hard-skill..." 
                    className="min-h-[120px] rounded-[2rem] bg-secondary/10 border-none p-6 text-base font-medium leading-relaxed" 
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 text-amber-500" /> Perfiles Relacionados al Curso:
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dynamicProfiles.map((seg: any) => (
                      <button 
                        key={seg.id}
                        type="button"
                        onClick={() => setTargetAudience(seg.label + ': ' + seg.desc)}
                        className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50 transition-all text-left group"
                      >
                        <p className="font-bold text-xs text-primary group-hover:text-accent">{seg.label}</p>
                        <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{seg.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {generationProgress && (
                  <div className="space-y-2 bg-secondary/10 p-5 rounded-[1.5rem] border border-secondary/20 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>{generationProgress.label}</span>
                      <span className="text-primary">{Math.round((generationProgress.current / (generationProgress.total || 1)) * 100)}%</span>
                    </div>
                    <Progress value={(generationProgress.current / (generationProgress.total || 1)) * 100} className="h-2 bg-slate-200" />
                  </div>
                )}
                <Button onClick={handleMatchAndGenerate} disabled={isGenerating || !targetAudience} className="w-full h-20 rounded-[2rem] font-bold text-2xl shadow-3xl bg-slate-900 group transition-all">
                  {isGenerating ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Sparkles className="mr-3 h-8 w-8 text-accent group-hover:scale-110 transition-transform" />}
                  {isGenerating ? `Procesando Flujo ${Math.min((generationProgress?.current || 0) + 1, generationProgress?.total || 1)}...` : 'Lanzar Generación Triple IA'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && generatedAssets && (
          <div className="space-y-10 animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle2 className="h-8 w-8" /></div>
                <div><h2 className="text-3xl font-bold">Edición Final del Contenido</h2><p className="text-slate-500">Ajusta los detalles de las 3 rutas propuestas por Gemini.</p></div>
              </div>
              <Button onClick={handleFinalSave} disabled={loading} className="h-16 px-12 rounded-2xl font-bold text-xl shadow-2xl bg-primary gap-3">
                {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} Guardar Pack Multimedia
              </Button>
            </header>

            <Tabs defaultValue="landing" className="w-full">
              <TabsList className="bg-secondary/20 p-1.5 h-16 w-full justify-start gap-2 px-8 rounded-[1.5rem] border shadow-sm mb-10">
                <TabsTrigger value="landing" className="rounded-xl gap-2 font-bold px-8 h-12"><Layout className="h-4 w-4" /> Landings</TabsTrigger>
                <TabsTrigger value="email" className="rounded-xl gap-2 font-bold px-8 h-12"><Mail className="h-4 w-4" /> Emails</TabsTrigger>
                <TabsTrigger value="social" className="rounded-xl gap-2 font-bold px-8 h-12"><Instagram className="h-4 w-4" /> Redes Sociales</TabsTrigger>
                <TabsTrigger value="ads" className="rounded-xl gap-2 font-bold px-8 h-12"><Megaphone className="h-4 w-4" /> Ads</TabsTrigger>
              </TabsList>

              <TabsContent value="landing">
                <Tabs value={activeLandingIdx.toString()} onValueChange={v => setActiveLandingIdx(parseInt(v))}>
                  <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
                    {generatedAssets.landings.map((l, i) => (
                      <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 font-bold capitalize">
                        {l.marketingName || `Ruta ${i + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {generatedAssets.landings.map((l, lIdx) => (
                    <TabsContent key={lIdx} value={lIdx.toString()} className="space-y-10">
                      <Card className="p-10 rounded-[2.5rem] bg-white shadow-xl">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-accent ml-1">Nombre Comercial de esta Ruta</Label>
                            <Input value={l.marketingName} onChange={e => updateAsset('landings', lIdx, 'marketingName', e.target.value)} className="h-12 rounded-xl bg-accent/5 border-none px-6 font-bold text-accent" placeholder="Ej: Inscripción Masterclass" />
                          </div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular Principal</Label><Textarea value={l.headline} onChange={e => updateAsset('landings', lIdx, 'headline', e.target.value)} className="text-3xl font-black text-primary border-none bg-slate-50 rounded-2xl p-6" /></div>
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subtitular</Label><Textarea value={l.subheadline} onChange={e => updateAsset('landings', lIdx, 'subheadline', e.target.value)} className="text-lg font-bold text-slate-500 border-none bg-slate-50 rounded-2xl p-6 italic" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-accent ml-1 flex items-center gap-2"><Video className="h-3 w-3" /> Vídeo Ventas</Label><Input value={l.videoUrl || ''} onChange={e => updateAsset('landings', lIdx, 'videoUrl', e.target.value)} className="h-14 rounded-2xl border-none bg-accent/5 px-6 font-mono text-xs" placeholder="URL YouTube/Vimeo" /></div>
                          </div>
                        </div>
                      </Card>
                      <div className="space-y-8">
                        {l.sections.map((section, sIdx) => (
                          <Card key={sIdx} className="p-10 rounded-[2.5rem] bg-white shadow-lg relative overflow-hidden">
                            <div className="grid lg:grid-cols-2 gap-12">
                              <div className="space-y-6">
                                <div className="space-y-2"><Label className="text-[9px] font-black uppercase text-slate-400">Título {sIdx + 1}</Label><Input value={section.title} onChange={e => { const newS = [...l.sections]; newS[sIdx].title = e.target.value; updateAsset('landings', lIdx, 'sections', newS); }} className="font-black text-xl border-none bg-slate-50 rounded-xl h-12" /></div>
                                <div className="space-y-2"><Label className="text-[9px] font-black uppercase text-slate-400">Cuerpo de Sección</Label><Textarea value={section.paragraph} onChange={e => { const newS = [...l.sections]; newS[sIdx].paragraph = e.target.value; updateAsset('landings', lIdx, 'sections', newS); }} className="min-h-[150px] border-none bg-slate-50 rounded-2xl p-6 text-slate-600 font-medium" /></div>
                              </div>
                              <ImageEditor label={`Imagen ${sIdx + 1}`} url={section.imageUrl} onUpdate={newUrl => { const newS = [...l.sections]; newS[sIdx].imageUrl = newUrl; updateAsset('landings', lIdx, 'sections', newS); }} courseId={selectedCourseId!} channel="landing" keywords={selectedCourse ? [...(allTags?.filter(t => selectedCourse.tagIds?.includes(t.id)).map(t => t.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()) || []).slice(0,3), selectedCourse.title?.split(' ')[0].toLowerCase()].filter(Boolean).join(',') : undefined} />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>

              <TabsContent value="email">
                <Tabs value={activeEmailIdx.toString()} onValueChange={v => setActiveEmailIdx(parseInt(v))}>
                  <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
                    {generatedAssets.emails.map((e, i) => (
                      <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 font-bold">
                        {e.marketingName || `Email ${i + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {generatedAssets.emails.map((e, eIdx) => {
                    const blueprintEmail = blueprintData?.assets?.emails?.[eIdx];
                    const tokens = blueprintEmail?.designTokens;
                    return (
                      <TabsContent key={eIdx} value={eIdx.toString()} className="space-y-8 animate-in fade-in">
                        <Card className="p-12 rounded-[3rem] bg-white border-none shadow-xl max-w-4xl mx-auto space-y-10">
                          <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-6">
                            <div className="flex-1 space-y-2 min-w-[200px]">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Nombre del Email</Label>
                              <Input value={e.marketingName} onChange={val => updateAsset('emails', eIdx, 'marketingName', val.target.value)} className="h-10 rounded-xl bg-slate-50 border-none px-4 font-bold" />
                            </div>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: tokens?.primary }}><Mail className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase text-slate-400">Estilo Aplicado</p><p className="text-xs font-bold" style={{ color: tokens?.primary }}>{tokens?.fontHeading}</p></div></div>
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: tokens?.primary }} />
                              <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: tokens?.secondary }} />
                              <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: tokens?.accent }} />
                            </div>
                          </div>

                          <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-6">
                            <div className="flex items-center gap-3 text-primary mb-2">
                              <Link2 className="h-5 w-5" />
                              <h4 className="text-xs font-black uppercase tracking-widest">Configuración de Conversión (CTA)</h4>
                            </div>
                            
                            <div className="space-y-4">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">¿A qué Landing apunta este Email?</Label>
                              <RadioGroup 
                                value={(e as any).targetLandingIdx?.toString() || eIdx.toString()} 
                                onValueChange={v => updateAsset('emails', eIdx, 'targetLandingIdx', parseInt(v))}
                                className="grid grid-cols-3 gap-4"
                              >
                                {[0, 1, 2].map(idx => (
                                  <div key={idx} className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                    ((e as any).targetLandingIdx ?? eIdx) === idx ? "bg-white border-primary shadow-sm" : "bg-transparent border-slate-200 hover:border-slate-300"
                                  )}>
                                    <RadioGroupItem value={idx.toString()} id={`landing-link-${eIdx}-${idx}`} />
                                    <Label htmlFor={`landing-link-${eIdx}-${idx}`} className="text-xs font-bold cursor-pointer">Variante {idx + 1}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>

                            <div className="space-y-2 pt-2">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">URL de Taller / Destino Personalizado</Label>
                              <Input 
                                value={(e as any).customCtaUrl || ''} 
                                onChange={val => updateAsset('emails', eIdx, 'customCtaUrl', val.target.value)}
                                placeholder="Indica una URL externa si no deseas usar la landing..."
                                className="h-12 rounded-xl bg-white border-slate-200 text-sm font-medium px-4"
                              />
                              <p className="text-[9px] text-muted-foreground italic px-1">Si este campo tiene valor, se usará como destino prioritario en lugar de la landing page.</p>
                            </div>
                          </div>

                          <div className="space-y-4 border-2 p-8 rounded-[2rem]" style={{ borderColor: tokens?.primary ? `${tokens.primary}20` : '#f1f5f9' }}>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Asunto del Email</Label>
                              <Input 
                                value={e.subject} 
                                onChange={val => updateAsset('emails', eIdx, 'subject', val.target.value)} 
                                className="h-14 rounded-2xl border-none bg-slate-50 px-6 font-black text-xl" 
                                style={{ fontFamily: tokens?.fontHeading, color: tokens?.primary || 'inherit' }} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Contenido del Correo (Cuerpo Final)</Label>
                              <Textarea 
                                value={e.body} 
                                onChange={val => updateAsset('emails', eIdx, 'body', val.target.value)} 
                                className="min-h-[450px] rounded-[2rem] border-none bg-slate-50 p-10 leading-relaxed text-lg font-medium text-slate-700 shadow-inner" 
                                style={{ fontFamily: tokens?.fontBody }} 
                              />
                              <p className="text-[10px] text-muted-foreground italic px-4">Este es el texto final que recibirán tus alumnos. Incluye saludos y firma.</p>
                            </div>
                          </div>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>

              <TabsContent value="social">
                {(() => {
                  const platforms = Array.from(new Set(generatedAssets.socials.map(s => s.platform)));
                  if (!platforms.length) return <p className="text-muted-foreground font-bold p-8 text-center bg-slate-50 rounded-2xl border">No hay redes sociales generadas para este lanzamiento.</p>;
                  return (
                    <Tabs defaultValue={platforms[0] || ''}>
                      <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm flex flex-wrap h-auto justify-start gap-2">
                        {platforms.map(p => (
                          <TabsTrigger key={p || 'unknown'} value={p || 'unknown'} className="rounded-lg px-6 h-10 font-bold capitalize gap-2">
                            <PlatformIcon platform={p} className="h-4 w-4 opacity-50" /> {p}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {platforms.map(p => {
                        const platSocials = (generatedAssets.socials as any[]).map((s, i) => ({ ...s, originalIndex: i })).filter(s => s.platform === p);
                        return (
                          <TabsContent key={p || 'unknown'} value={p || 'unknown'} className="animate-in fade-in space-y-8">
                            <Tabs defaultValue={platSocials[0]?.originalIndex.toString()}>
                              <TabsList className="bg-secondary/10 p-1.5 rounded-xl border border-secondary/20 flex flex-wrap h-auto justify-start gap-2">
                                {platSocials.map((s, idx) => (
                                  <TabsTrigger key={s.originalIndex} value={s.originalIndex.toString()} className="rounded-lg px-4 h-9 text-xs font-bold capitalize">
                                    {s.marketingName || `Pack ${idx + 1}`}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              {platSocials.map((s) => {
                                const sIdx = s.originalIndex;
                                const tokens = blueprintData?.assets?.socials?.[sIdx]?.designTokens;
                                return (
                                  <TabsContent key={sIdx} value={sIdx.toString()} className="grid lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-7 space-y-8">
                                      <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg space-y-6">
                                        <div className="space-y-4 border-b pb-6">
                                          <Label className="text-[10px] font-black uppercase text-slate-400">Título del Post (Interno)</Label>
                                          <Input value={s.marketingName} onChange={e => updateAsset('socials', sIdx, 'marketingName', e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none px-6 font-bold" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <Label className="text-[10px] font-black uppercase text-slate-400">Caption Final (Listo para publicar)</Label>
                                          <div className="flex items-center gap-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">Link a Landing:</Label>
                                            <select 
                                              value={s.landingIdx ?? ''} 
                                              onChange={e => updateAsset('socials', sIdx, 'landingIdx', e.target.value === '' ? undefined : parseInt(e.target.value))}
                                              className="text-[10px] font-bold bg-slate-50 border-none rounded-lg h-7 px-2 outline-none"
                                            >
                                              <option value="">Ninguna (Link en Bio)</option>
                                              {generatedAssets.landings.map((l, lIdx) => (
                                                <option key={lIdx} value={lIdx}>Landing {lIdx + 1}: {l.headline.substring(0, 20)}...</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                        <div className="space-y-4">
                                          <p className="text-sm font-bold text-emerald-600">GANCHO: {s.hook}</p>
                                          <Textarea value={s.caption} onChange={e => updateAsset('socials', sIdx, 'caption', e.target.value)} className="min-h-[150px] border-none bg-slate-50 rounded-[1.5rem] p-6 text-sm font-medium leading-relaxed" />
                                          <div className="pt-4 border-t">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Hashtags:</p>
                                            <Input value={s.hashtags.join(' ')} onChange={e => updateAsset('socials', sIdx, 'hashtags', e.target.value.split(' '))} className="bg-slate-50 border-none h-10 text-xs font-mono text-accent" />
                                          </div>
                                        </div>
                                      </Card>
                                      <Card className="p-8 rounded-[2.5rem] bg-slate-900 text-white border-none shadow-2xl">
                                        <h3 className="font-black text-lg mb-6 border-b border-white/10 pb-4 flex items-center justify-between">
                                          <span>Edición de Placas / Slides</span>
                                          <Badge className="bg-accent text-white uppercase text-[8px] tracking-widest">{s.slides.length} SLIDES</Badge>
                                        </h3>
                                        <div className="space-y-6">
                                          {(() => {
                                            const slides = s.slides?.length > 0 ? s.slides : [{ text: '', imageUrl: '' }];
                                            return (slides as any[]).map((slide: any, i: number) => (
                                              <div key={i} className="space-y-6 p-6 bg-white/5 rounded-3xl border border-white/10">
                                                <div className="flex gap-4 items-start">
                                                  <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs shrink-0 shadow-lg" style={{ backgroundColor: tokens?.accent }}>{i+1}</div>
                                                  <div className="space-y-4 flex-1">
                                                    <Label className="text-[8px] font-black uppercase text-white/40">Texto de la Placa</Label>
                                                    <Textarea value={slide.text} onChange={e => { const newS = [...slides]; newS[i].text = e.target.value; updateAsset('socials', sIdx, 'slides', newS); }} className="border-none bg-white/5 p-4 min-h-[60px] text-sm text-white font-medium rounded-xl" style={{ fontFamily: tokens?.fontHeading }} />
                                                  </div>
                                                </div>
                                                <div className="pt-4 border-t border-white/5">
                                                  <ImageEditor 
                                                    label={s.type === 'short_video' ? 'Miniatura / Video' : `Imagen Placa ${i + 1}`} 
                                                    url={slide.imageUrl} 
                                                    onUpdate={newUrl => { const newS = [...slides]; newS[i].imageUrl = newUrl; updateAsset('socials', sIdx, 'slides', newS); }} 
                                                    courseId={selectedCourseId!} 
                                                    channel="social" 
                                                  />
                                                </div>
                                              </div>
                                            ));
                                          })()}
                                          {s.slides?.length === 0 && (
                                            <Button variant="outline" className="w-full h-14 rounded-2xl border-dashed border-2 text-white/40 hover:text-white" onClick={() => updateAsset('socials', sIdx, 'slides', [{ text: '', imageUrl: '' }])}>
                                              + Agregar Placa Visual
                                            </Button>
                                          )}
                                        </div>
                                      </Card>
                                    </div>
                                    <div className="lg:col-span-5 relative">
                                      {(() => {
                                        const selectedCourse = courses?.find(c => c.id === selectedCourseId);
                                        const override = selectedCourse?.brandingOverride?.socials || {};
                                        const mentorSocials = profile?.profile?.socials || {};
                                        
                                        const rawValue = override[s.platform] || mentorSocials[s.platform] || '';
                                        // Extract handle from URL if necessary
                                        let finalHandle = rawValue;
                                        if (rawValue.includes('/')) {
                                          finalHandle = rawValue.split('/').filter(Boolean).pop() || '';
                                          if (finalHandle.includes('?')) finalHandle = finalHandle.split('?')[0];
                                        }
                                        finalHandle = finalHandle.replace('@', '');
                                        
                                        if (!finalHandle && profile?.displayName) {
                                          finalHandle = profile.displayName.replace(/\s+/g, '').toLowerCase();
                                        }

                                        return (
                                          <SocialLivePreview 
                                            social={{...s, handle: finalHandle || 'tu_cuenta'}} 
                                            tokens={tokens} 
                                          />
                                        );
                                      })()}
                                    </div>
                                  </TabsContent>
                                );
                              })}
                            </Tabs>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  );
                })()}
              </TabsContent>

              <TabsContent value="ads">
                <Tabs value={activeAdsIdx.toString()} onValueChange={v => setActiveAdsIdx(parseInt(v))}>
                  <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
                    {generatedAssets.ads.map((ad, i) => (
                      <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 font-bold">
                        {ad.marketingName || `Ads ${i + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {generatedAssets.ads.map((a, aIdx) => (
                    <TabsContent key={aIdx} value={aIdx.toString()} className="grid lg:grid-cols-2 gap-10">
                      <div className="col-span-full bg-white p-6 rounded-[2rem] shadow-sm flex items-center gap-6">
                        <Label className="text-[10px] font-black uppercase text-slate-400 shrink-0">Nombre del Set:</Label>
                        <Input value={a.marketingName} onChange={e => updateAsset('ads', aIdx, 'marketingName', e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none px-6 font-bold" />
                      </div>
                      <section className="space-y-6">
                        <header className="flex items-center gap-3 px-4"><Megaphone className="h-6 w-6 text-amber-500" /><h3 className="font-bold text-xl">Títulos Finales Ads</h3></header>
                        <div className="space-y-4">
                          {a.headlines.map((h, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100" style={{ borderLeft: `4px solid ${blueprintData?.assets?.ads?.[aIdx]?.designTokens?.primary || '#facc15'}` }}>
                              <Input value={h} onChange={e => updateAsset('ads', aIdx, 'headlines', e.target.value, i)} className="font-black text-lg border-none bg-transparent h-auto py-0" style={{ fontFamily: blueprintData?.assets?.ads?.[aIdx]?.designTokens?.fontHeading }} />
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="space-y-6">
                        <header className="flex items-center gap-3 px-4"><FileText className="h-6 w-6 text-blue-500" /><h3 className="font-bold text-xl">Descripciones de Impacto</h3></header>
                        <div className="space-y-4">
                          {a.descriptions.map((d, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" style={{ fontFamily: blueprintData?.assets?.ads?.[aIdx]?.designTokens?.fontBody }}>
                              <Textarea value={d} onChange={e => updateAsset('ads', aIdx, 'descriptions', e.target.value, i)} className="min-h-[100px] font-medium border-none bg-transparent italic h-auto py-0 leading-relaxed" />
                            </div>
                          ))}
                        </div>
                      </section>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
