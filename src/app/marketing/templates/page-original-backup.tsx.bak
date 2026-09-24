"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/components/auth-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import {
  Layout,
  Mail,
  Instagram,
  Megaphone,
  Sparkles,
  Plus,
  Rocket,
  Loader2,
  Trash2,
  ChevronRight,
  BrainCircuit,
  X,
  Target,
  Zap,
  ShieldCheck,
  FileSearch,
  Ruler,
  Layers,
  ChevronLeft,
  Eye,
  Type,
  Maximize,
  Palette,
  AlignLeft,
  Grid3X3,
  ImageIcon,
  ArrowUpRight,
  Info,
  Settings2,
  Check,
  Save,
  SlidersHorizontal,
  Play,
  CheckCircle2,
  Linkedin,
  MessageCircle,
  Twitter,
  Globe,
  Youtube,
  Phone,
  ShoppingCart,
  Users,
  Video,
  Search,
  LayoutTemplate,
  Circle,
  Share2,
  Heart,
  AlertTriangle,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { generateTemplateCollection } from "@/ai/flows/generate-template-collection";
import { refineVariant } from "@/ai/flows/refine-variant-flow";
import { checkAiHealth } from "@/ai/flows/check-ai-health";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PlatformIcon = ({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) => {
  if (platform === "instagram") return <Instagram className={className} />;
  if (platform === "twitter") return <Twitter className={className} />;
  if (platform === "tiktok") return <TikTokIcon className={className} />;
  if (platform === "linkedin") return <Linkedin className={className} />;
  return <Circle className={className} />;
};

export default function MarketingTemplatesPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [directives, setDirectives] = useState("");
  const [campaignName, setName] = useState("");
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);

  // AI Health State
  const [aiHealth, setAiHealth] = useState<{
    status: string;
    message?: string;
    details?: string;
  }>({ status: "checking" });

  const performHealthCheck = useCallback(async () => {
    setAiHealth({ status: "checking" });
    try {
      const res = await checkAiHealth();
      setAiHealth(res);
    } catch (e) {
      setAiHealth({
        status: "error",
        message: "Fallo crítico al conectar con el servidor de IA.",
      });
    }
  }, []);

  useEffect(() => {
    performHealthCheck();
  }, [performHealthCheck]);

  // Generation Options
  const [enabledChannels, setEnabledChannels] = useState({
    landings: true,
    emails: true,
    socials: true,
    ads: true,
  });
  const [socialTargets, setSocialTargets] = useState<any>({
    twitter: { enabled: true, thread: 1, single_post: 2 },
    instagram: { enabled: true, story: 2, carousel: 1, single_post: 1 },
    tiktok: { enabled: true, short_video: 1, carousel: 0 },
    linkedin: { enabled: true, document: 1, single_post: 1, carousel: 0 },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Manual Editing States
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // AI Refinement Review State
  const [pendingRefinement, setPendingRefinement] = useState<{
    variant: any;
    explanation: string;
    channel: string;
    index: number;
  } | null>(null);

  const collectionsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(
      collection(db, "templateCollections"),
      where("ownerId", "==", profile.uid),
    );
  }, [db, profile?.uid]);
  const { data: rawCollections, isLoading } = useCollection(collectionsQuery);

  const collections = useMemo(() => {
    if (!rawCollections) return null;
    return [...rawCollections].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawCollections]);

  const selectedCollection = useMemo(() => {
    if (!selectedId || !collections) return null;
    return collections.find((c) => c.id === selectedId);
  }, [selectedId, collections]);

  const socialByPlatform = useMemo(() => {
    if (!selectedCollection?.assets?.socials) return {};
    return selectedCollection.assets.socials.reduce(
      (acc: any, s: any, idx: number) => {
        const platform = s.platform || "other";
        if (!acc[platform]) acc[platform] = [];
        acc[platform].push({ ...s, originalIndex: idx });
        return acc;
      },
      {},
    );
  }, [selectedCollection]);

  const platforms = useMemo(
    () => Object.keys(socialByPlatform),
    [socialByPlatform],
  );

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "auto";
    document.documentElement.style.pointerEvents = "auto";
    document.documentElement.style.overflow = "auto";
    document.body.removeAttribute("inert");
  }, []);

  useEffect(() => {
    if (
      !isCreateOpen &&
      !isViewOpen &&
      !isEditVariantOpen &&
      !pendingRefinement
    ) {
      const timer = setTimeout(clearUILocks, 300);
      return () => clearTimeout(timer);
    }
  }, [
    isCreateOpen,
    isViewOpen,
    isEditVariantOpen,
    pendingRefinement,
    clearUILocks,
  ]);

  const handleGenerate = async () => {
    if (aiHealth.status === "error") {
      toast({
        variant: "destructive",
        title: "Motor de IA Offline",
        description: "Corrige la conexión antes de generar contenido.",
      });
      return;
    }

    if (!directives.trim() || !campaignName.trim()) return;

    const anyChannelEnabled = Object.values(enabledChannels).some((v) => v);
    if (!anyChannelEnabled) {
      toast({
        variant: "destructive",
        title: "Selección Requerida",
        description: "Debes habilitar al menos un canal de emisión.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const tasks: { channel: string; label: string; payload: any }[] = [];
      if (enabledChannels.landings)
        tasks.push({
          channel: "landings",
          label: "Estructurando Landings...",
          payload: {
            landings: true,
            emails: false,
            socials: false,
            ads: false,
          },
        });
      if (enabledChannels.emails)
        tasks.push({
          channel: "emails",
          label: "Redactando Emails...",
          payload: {
            landings: false,
            emails: true,
            socials: false,
            ads: false,
          },
        });
      if (enabledChannels.ads)
        tasks.push({
          channel: "ads",
          label: "Optimizando Ads...",
          payload: {
            landings: false,
            emails: false,
            socials: false,
            ads: true,
          },
        });
      if (enabledChannels.socials)
        tasks.push({
          channel: "socials",
          label: "Diseñando Redes Sociales...",
          payload: {
            landings: false,
            emails: false,
            socials: true,
            ads: false,
          },
        });

      setGenerationProgress({
        current: 0,
        total: tasks.length,
        label: "Iniciando conectividad...",
      });

      let finalAssets: any = {};

      for (let i = 0; i < tasks.length; i++) {
        setGenerationProgress({
          current: i,
          total: tasks.length,
          label: tasks[i].label,
        });
        const stepResult = await generateTemplateCollection({
          directives,
          mentorName: profile?.displayName || undefined,
          enabledChannels: tasks[i].payload,
          platforms: socialTargets,
        });

        if (stepResult.landings)
          finalAssets.landings = [
            ...(finalAssets.landings || []),
            ...stepResult.landings,
          ];
        if (stepResult.emails)
          finalAssets.emails = [
            ...(finalAssets.emails || []),
            ...stepResult.emails,
          ];
        if (stepResult.socials)
          finalAssets.socials = [
            ...(finalAssets.socials || []),
            ...stepResult.socials,
          ];
        if (stepResult.ads)
          finalAssets.ads = [...(finalAssets.ads || []), ...stepResult.ads];
      }

      setGenerationProgress({
        current: tasks.length,
        total: tasks.length,
        label: "Guardando Colección...",
      });

      const collId = Math.random().toString(36).substring(2, 15);
      const collRef = doc(db, "templateCollections", collId);

      const newColl = {
        id: collId,
        name: campaignName,
        directives,
        ownerId: profile?.uid,
        assets: finalAssets,
        createdAt: serverTimestamp(),
      };

      await setDoc(collRef, newColl);
      toast({
        title: "Blueprint Creado",
        description: "La arquitectura visual de tu campaña ha sido generada.",
      });
      setIsCreateOpen(false);
      resetForm();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error de generación",
        description: e.message || "La IA no pudo procesar tu solicitud.",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleOpenEditVariant = (
    variant: any,
    channel: string,
    index: number,
  ) => {
    setEditingVariant({ ...variant });
    setEditingChannel(channel);
    setEditingIndex(index);
    setIsEditVariantOpen(true);
  };

  const handleSaveVariantEdit = async () => {
    if (!selectedCollection || !editingVariant || editingIndex === -1) return;
    setIsSavingEdit(true);
    try {
      const channelKey = editingChannel + "s";
      const newAssets = { ...selectedCollection.assets };
      if (Array.isArray(newAssets[channelKey])) {
        newAssets[channelKey][editingIndex] = editingVariant;
      }
      await updateDoc(doc(db, "templateCollections", selectedCollection.id), {
        assets: newAssets,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Cambios Guardados" });
      setIsEditVariantOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRefineVariantAI = async (
    channel: string,
    variant: any,
    index: number,
  ) => {
    if (!selectedCollection) return;
    setIsRefining(`${channel}-${index}`);
    try {
      const result = await refineVariant({
        channel,
        variant,
        directives: selectedCollection.directives,
      });

      setPendingRefinement({
        variant: result.refinedVariant,
        explanation: result.explanation,
        channel,
        index,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al contactar con la IA" });
    } finally {
      setIsRefining(null);
    }
  };

  const applyRefinement = async () => {
    if (!selectedCollection || !pendingRefinement) return;
    setIsSavingEdit(true);
    try {
      const { variant, channel, index } = pendingRefinement;
      const channelKey = channel + "s";
      const newAssets = { ...selectedCollection.assets };
      if (Array.isArray(newAssets[channelKey])) {
        newAssets[channelKey][index] = variant;
      }
      await updateDoc(doc(db, "templateCollections", selectedCollection.id), {
        assets: newAssets,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Refinamiento Aplicado",
        description: "La variante ha sido actualizada exitosamente.",
      });
      setPendingRefinement(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al aplicar cambios" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const resetForm = () => {
    setDirectives("");
    setName("");
    setEnabledChannels({
      landings: true,
      emails: true,
      socials: true,
      ads: true,
    });
    setSocialTargets({
      twitter: { enabled: true, thread: 1, single_post: 2 },
      instagram: { enabled: true, story: 2, carousel: 1, single_post: 1 },
      tiktok: { enabled: true, short_video: 1, carousel: 0 },
      linkedin: { enabled: true, document: 1, single_post: 1, carousel: 0 },
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "templateCollections", id));
      toast({ title: "Colección eliminada" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const openView = (coll: any) => {
    setSelectedId(coll.id);
    setIsViewOpen(true);
  };

  const DesignTokensSummary = ({
    tokens,
    channel,
    variant,
    index,
  }: {
    tokens: any;
    channel: string;
    variant: any;
    index: number;
  }) => {
    if (!tokens) return null;
    const isThisRefining = isRefining === `${channel}-${index}`;
    return (
      <div className="flex justify-end gap-3 p-4 bg-white/40 backdrop-blur-sm rounded-[1.5rem] border border-primary/5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenEditVariant(variant, channel, index)}
          className="rounded-xl font-bold h-10 px-6 border-slate-200 text-slate-600 gap-2 shadow-sm transition-all hover:bg-white"
        >
          <Settings2 className="h-4 w-4" /> Ajustar Blueprint
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRefineVariantAI(channel, variant, index)}
          disabled={!!isRefining}
          className="rounded-xl font-bold h-10 px-6 border-accent/20 text-accent hover:bg-accent/5 gap-2 shadow-sm transition-all"
        >
          {isThisRefining ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}{" "}
          Refinar con IA
        </Button>
      </div>
    );
  };

  const SocialMockup = ({
    variant,
    index,
  }: {
    variant: any;
    index: number;
  }) => {
    const tokens = variant.designTokens;
    const isCarousel =
      variant.type === "carousel" ||
      variant.type === "thread" ||
      variant.type === "document";
    const isVertical =
      variant.type === "story" || variant.type === "short_video";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
              <PlatformIcon
                platform={variant.platform}
                className="h-4 w-4 text-slate-500"
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-900 leading-none">
                {variant.platform}
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                Variante {index + 1} • {variant.type?.replace("_", " ")}
              </p>
            </div>
          </div>
          {isCarousel && (
            <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase h-5">
              {variant.slideCount || 5} Slots
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 transition-all duration-500 group/mockup",
            isVertical
              ? "aspect-[9/16] w-full max-w-[340px]"
              : "aspect-square w-full",
          )}
        >
          {isCarousel && (
            <>
              <div className="absolute inset-0 translate-x-2 translate-y-2 bg-slate-200 rounded-[2rem] z-0" />
              <div className="absolute inset-0 translate-x-1 translate-y-1 bg-slate-300 rounded-[2rem] z-0" />
            </>
          )}

          <div className="absolute inset-0 z-10">
            <Image
              src={`https://loremflickr.com/800/1200/marketing,business?lock=${variant.originalIndex || index}`}
              alt="Mockup"
              fill
              className="object-cover grayscale-[0.2] opacity-90 group-hover/mockup:scale-105 transition-transform duration-1000"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
          </div>

          <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/40" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-white/20 backdrop-blur-md text-white border-none text-[7px] font-black uppercase px-2 h-5">
                  AD PREVIEW
                </Badge>
                {isCarousel && (
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          i === 0 ? "bg-white" : "bg-white/30",
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                <h4
                  className="text-xl font-black italic leading-[1.1] text-white drop-shadow-lg"
                  style={{ fontFamily: tokens?.fontHeading }}
                >
                  "{variant.hook || "Slot para Gancho de Retención"}"
                </h4>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm" />
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                    @entorno_institucional
                  </span>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-3 rounded-lg text-[8px] font-black uppercase shadow-lg"
                  style={{ backgroundColor: tokens?.accent }}
                >
                  Acceder al Programa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">
                Colección de Templates
              </h1>
              <div className="hidden sm:block">
                {aiHealth.status === "checking" ? (
                  <Badge
                    variant="outline"
                    className="animate-pulse bg-slate-50 border-slate-200 text-slate-400 font-bold text-[9px] uppercase tracking-widest h-6"
                  >
                    Verificando Motor IA...
                  </Badge>
                ) : aiHealth.status === "ok" ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] uppercase tracking-widest h-6"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1.5" /> Gemini 1.5 Flash
                    Online
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="destructive"
                      className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[9px] uppercase tracking-widest h-6 gap-1.5 shadow-sm"
                    >
                      <AlertCircle className="h-3 w-3" /> Motor Offline
                    </Badge>
                    <Button
                      variant="ghost"
                      onClick={performHealthCheck}
                      className="h-6 w-6 p-0 rounded-full hover:bg-slate-100"
                      title="Reintentar conexión"
                    >
                      <RefreshCcw className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {aiHealth.status === "error" && (
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-2 animate-in slide-in-from-top-2">
                <p className="text-rose-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Error de Conectividad
                  IA: {aiHealth.message}
                </p>
                <p className="text-rose-600/70 text-[10px] leading-relaxed italic">
                  DETALLE TÉCNICO: {aiHealth.details}
                </p>
              </div>
            )}

            <p className="text-muted-foreground text-lg font-medium">
              Define el ADN visual y arquitectónico para tus futuros
              lanzamientos omnicanal.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-14 px-8 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-xl gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Nuevo Blueprint Estratégico
          </Button>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-muted animate-pulse rounded-[2.5rem]"
              />
            ))
          ) : collections?.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-secondary/10 rounded-[3rem] border-2 border-dashed">
              <Ruler className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-bold italic">
                No has diseñado ningún blueprint institucional todavía.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                variant="link"
                className="font-bold text-accent mt-2"
              >
                Crea tu primer patrón de campaña
              </Button>
            </div>
          ) : (
            collections?.map((coll) => (
              <Card
                key={coll.id}
                className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col"
              >
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <Badge
                      variant="secondary"
                      className="bg-primary/5 text-primary border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest"
                    >
                      Blueprint Omnicanal
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {coll.createdAt?.toDate
                        ? format(coll.createdAt.toDate(), "dd/MM/yyyy")
                        : "-"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                      {coll.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      Directivas: "{coll.directives}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border">
                    <Palette className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      ADN Visual Activo
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex gap-2">
                  <Button
                    onClick={() => openView(coll)}
                    variant="ghost"
                    className="flex-1 rounded-xl font-bold text-primary hover:bg-white hover:shadow-md gap-2"
                  >
                    Visualizar Planos <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(coll.id)}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-slate-900 p-8 text-white relative">
              <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Arquitecto de Identidad IA
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Define el tono y Gemini diseñará las variantes para los canales
                seleccionados.
              </DialogDescription>
            </div>

            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Nombre de la Identidad
                  </Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Branding Premium"
                    className="h-12 rounded-xl bg-secondary/10 border-none font-bold"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <LayoutTemplate className="h-3.5 w-3.5" /> Canales de
                    Emisión
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "landings", label: "Landings", icon: Layout },
                      { id: "emails", label: "Email Pack", icon: Mail },
                      {
                        id: "socials",
                        label: "Redes Sociales",
                        icon: Instagram,
                      },
                      { id: "ads", label: "Ads Copies", icon: Megaphone },
                    ].map((chan) => (
                      <div
                        key={chan.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                          (enabledChannels as any)[chan.id]
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-white border-slate-100 hover:border-slate-200",
                        )}
                        onClick={() =>
                          setEnabledChannels({
                            ...enabledChannels,
                            [chan.id]: !(enabledChannels as any)[chan.id],
                          })
                        }
                      >
                        <div className="flex items-center gap-3">
                          <chan.icon
                            className={cn(
                              "h-4 w-4",
                              (enabledChannels as any)[chan.id]
                                ? "text-primary"
                                : "text-slate-400",
                            )}
                          />
                          <span className="text-xs font-bold">
                            {chan.label}
                          </span>
                        </div>
                        <Checkbox
                          checked={(enabledChannels as any)[chan.id]}
                          className="rounded-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {enabledChannels.socials && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      <Share2 className="h-3.5 w-3.5" /> Cantidades por Red
                      Social
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          id: "instagram",
                          label: "Instagram",
                          icon: Instagram,
                          types: [
                            { k: "story", l: "Stories" },
                            { k: "carousel", l: "Carruseles" },
                            { k: "single_post", l: "Muro" },
                          ],
                        },
                        {
                          id: "tiktok",
                          label: "TikTok",
                          icon: TikTokIcon,
                          types: [
                            { k: "short_video", l: "Videos Cortos" },
                            { k: "carousel", l: "Modo Foto" },
                          ],
                        },
                        {
                          id: "linkedin",
                          label: "LinkedIn",
                          icon: Linkedin,
                          types: [
                            { k: "document", l: "Docs (PDF)" },
                            { k: "single_post", l: "Post" },
                            { k: "carousel", l: "Carrusel" },
                          ],
                        },
                        {
                          id: "twitter",
                          label: "X (Twitter)",
                          icon: Twitter,
                          types: [
                            { k: "thread", l: "Hilos" },
                            { k: "single_post", l: "Tweets" },
                          ],
                        },
                      ].map((platform) => (
                        <div
                          key={platform.id}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all",
                            socialTargets[platform.id]?.enabled
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-dashed border-slate-200 bg-secondary/5",
                          )}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <Checkbox
                              id={`social-${platform.id}`}
                              checked={socialTargets[platform.id]?.enabled}
                              onCheckedChange={(c) =>
                                setSocialTargets({
                                  ...socialTargets,
                                  [platform.id]: {
                                    ...socialTargets[platform.id],
                                    enabled: !!c,
                                  },
                                })
                              }
                            />
                            <Label
                              htmlFor={`social-${platform.id}`}
                              className="text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <platform.icon className="h-4 w-4" />{" "}
                              {platform.label}
                            </Label>
                          </div>
                          {socialTargets[platform.id]?.enabled && (
                            <div className="pl-7 space-y-3 animate-in slide-in-from-top-1">
                              {platform.types.map((t: any) => (
                                <div
                                  key={t.k}
                                  className="flex items-center justify-between gap-4 bg-white/50 p-1.5 px-3 rounded-xl border border-white/60 shadow-sm"
                                >
                                  <span className="text-xs font-bold text-slate-600">
                                    {t.l}
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={socialTargets[platform.id][t.k] || 0}
                                    onChange={(e) =>
                                      setSocialTargets({
                                        ...socialTargets,
                                        [platform.id]: {
                                          ...socialTargets[platform.id],
                                          [t.k]: parseInt(e.target.value) || 0,
                                        },
                                      })
                                    }
                                    className="w-16 h-8 text-center text-xs font-black bg-white focus-visible:ring-1"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-accent ml-1 flex items-center gap-2">
                    <Target className="h-3 w-3" /> Directivas de Estilo
                  </Label>
                  <Textarea
                    value={directives}
                    onChange={(e) => setDirectives(e.target.value)}
                    placeholder="Ej: Colores profesionales para LinkedIn, ganchos virales para TikTok, hilos para Twitter..."
                    className="min-h-[120px] rounded-2xl bg-accent/5 border-accent/20 p-6 text-sm leading-relaxed"
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="p-8 pt-0 space-y-6">
              {generationProgress && (
                <div className="space-y-2 bg-secondary/10 p-4 rounded-2xl border border-secondary/20">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>{generationProgress.label}</span>
                    <span className="text-primary">
                      {Math.round(
                        (generationProgress.current /
                          (generationProgress.total || 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (generationProgress.current /
                        (generationProgress.total || 1)) *
                      100
                    }
                    className="h-2 bg-slate-200"
                  />
                </div>
              )}
              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !directives ||
                  !campaignName ||
                  aiHealth.status === "error"
                }
                className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-2xl bg-primary transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-6 w-6" /> Procesando
                    Lote{" "}
                    {generationProgress
                      ? `${Math.min(generationProgress.current + 1, generationProgress.total)}/${generationProgress.total}`
                      : ""}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-3 h-6 w-6 text-accent" /> Generar
                    Planos Omnicanal
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-primary p-8 text-white shrink-0 relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">
                      {selectedCollection?.name}
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/70 font-medium">
                      Blueprints de Diseño Omnicanal
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsViewOpen(false)}
                  className="rounded-full text-white hover:bg-white/10"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <Tabs
              defaultValue={
                selectedCollection?.assets?.landings
                  ? "landing"
                  : selectedCollection?.assets?.emails
                    ? "email"
                    : "social"
              }
              className="flex-1 overflow-hidden flex flex-col"
            >
              <TabsList className="bg-secondary/20 p-1.5 h-16 w-full justify-start gap-2 px-8 border-b rounded-none shrink-0">
                {selectedCollection?.assets?.landings && (
                  <TabsTrigger
                    value="landing"
                    className="rounded-xl gap-2 font-bold px-6 h-11"
                  >
                    <Layout className="h-4 w-4" /> Landings
                  </TabsTrigger>
                )}
                {selectedCollection?.assets?.emails && (
                  <TabsTrigger
                    value="email"
                    className="rounded-xl gap-2 font-bold px-6 h-11"
                  >
                    <Mail className="h-4 w-4" /> Emails
                  </TabsTrigger>
                )}
                {selectedCollection?.assets?.socials && (
                  <TabsTrigger
                    value="social"
                    className="rounded-xl gap-2 font-bold px-6 h-11"
                  >
                    <Instagram className="h-4 w-4" /> Social
                  </TabsTrigger>
                )}
                {selectedCollection?.assets?.ads && (
                  <TabsTrigger
                    value="ads"
                    className="rounded-xl gap-2 font-bold px-6 h-11"
                  >
                    <Megaphone className="h-4 w-4" /> Ads
                  </TabsTrigger>
                )}
              </TabsList>

              <ScrollArea className="flex-1 bg-slate-50">
                <div className="p-8">
                  {selectedCollection && (
                    <>
                      <TabsContent
                        value="landing"
                        className="m-0 space-y-8 animate-in fade-in"
                      >
                        <Tabs defaultValue="0" className="w-full">
                          <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm flex-wrap h-auto">
                            {selectedCollection.assets?.landings?.map(
                              (l: any, i: number) => (
                                <TabsTrigger
                                  key={i}
                                  value={i.toString()}
                                  className="rounded-lg px-6 font-bold capitalize"
                                >
                                  {l.type}
                                </TabsTrigger>
                              ),
                            )}
                          </TabsList>
                          {selectedCollection.assets?.landings?.map(
                            (l: any, lIdx: number) => (
                              <TabsContent
                                key={lIdx}
                                value={lIdx.toString()}
                                className="space-y-10"
                              >
                                <DesignTokensSummary
                                  tokens={l.designTokens}
                                  channel="landing"
                                  variant={l}
                                  index={lIdx}
                                />

                                <div className="space-y-12">
                                  {Array.from({
                                    length: l.sectionCount || 1,
                                  }).map((_, sIdx) => (
                                    <div key={sIdx} className="space-y-6">
                                      <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-12">
                                        <div
                                          className={cn(
                                            "grid lg:grid-cols-2 gap-12 items-center",
                                            sIdx % 2 !== 0 &&
                                              "lg:flex-row-reverse",
                                          )}
                                        >
                                          <div className="space-y-8 text-center lg:text-left">
                                            <div className="flex items-center justify-center lg:justify-start gap-3">
                                              <Badge className="bg-primary/5 text-primary border-none h-6 px-3 text-[8px] font-black uppercase tracking-[0.3em]">
                                                {sIdx === 0
                                                  ? `Layout ${l.type}`
                                                  : `${sIdx + 1} Secciones Académicas`}
                                              </Badge>
                                            </div>
                                            <h2
                                              className="text-5xl font-black leading-[1.1] italic opacity-60"
                                              style={{
                                                color: l.designTokens?.primary,
                                                fontFamily:
                                                  l.designTokens?.fontHeading,
                                              }}
                                            >
                                              {sIdx === 0
                                                ? `"${l.headline}"`
                                                : `Slot de Título Persuasivo`}
                                            </h2>
                                            <p className="text-xl text-slate-400 font-medium italic leading-relaxed">
                                              {sIdx === 0
                                                ? `"${l.subheadline}"`
                                                : `Cursos de vanguardia para impulsar tu carrera y asegurar tu futuro.`}
                                            </p>
                                          </div>

                                          {sIdx === 0 ? (
                                            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border-[12px] border-slate-50 shadow-2xl bg-slate-900 flex flex-col items-center justify-center">
                                              <Play className="h-12 w-12 text-white fill-white ml-1 opacity-20" />
                                              <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em] mt-4">
                                                Slot de Video (Sección 1)
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border-[12px] border-slate-50 shadow-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-300">
                                              <ImageIcon className="h-12 w-12 opacity-20" />
                                              <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">
                                                Imagen de Apoyo {sIdx + 1}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </Card>

                                      <div className="flex justify-center">
                                        <Button
                                          className="h-16 px-12 rounded-2xl font-bold text-xl shadow-xl gap-2 transition-transform hover:scale-105"
                                          style={{
                                            backgroundColor:
                                              l.designTokens?.accent,
                                          }}
                                        >
                                          <ShoppingCart className="h-5 w-5" />{" "}
                                          Explorar Nuestros Programas
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                            ),
                          )}
                        </Tabs>
                      </TabsContent>

                      <TabsContent
                        value="email"
                        className="m-0 space-y-8 animate-in fade-in"
                      >
                        <Tabs defaultValue="0" className="w-full">
                          <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
                            {selectedCollection.assets?.emails?.map(
                              (e: any, i: number) => (
                                <TabsTrigger
                                  key={i}
                                  value={i.toString()}
                                  className="rounded-lg px-6 font-bold capitalize"
                                >
                                  {e.type}
                                </TabsTrigger>
                              ),
                            )}
                          </TabsList>
                          {selectedCollection.assets?.emails?.map(
                            (e: any, eIdx: number) => (
                              <TabsContent
                                key={eIdx}
                                value={eIdx.toString()}
                                className="space-y-10"
                              >
                                <DesignTokensSummary
                                  tokens={e.designTokens}
                                  channel="email"
                                  variant={e}
                                  index={eIdx}
                                />
                                <Card className="rounded-[3rem] border-none shadow-xl bg-white p-12 max-w-4xl mx-auto space-y-10">
                                  <div className="space-y-4 border-b pb-8">
                                    <h3
                                      className="text-3xl font-black italic opacity-60"
                                      style={{
                                        color: e.designTokens?.primary,
                                        fontFamily: e.designTokens?.fontHeading,
                                      }}
                                    >
                                      "{e.subject}"
                                    </h3>
                                  </div>
                                  <div className="p-10 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <p className="text-lg text-slate-400 font-medium italic leading-relaxed whitespace-pre-wrap">
                                      "{e.body}"
                                    </p>
                                  </div>
                                  <Button
                                    className="h-14 px-10 rounded-xl font-bold shadow-lg"
                                    style={{
                                      backgroundColor: e.designTokens?.accent,
                                    }}
                                  >
                                    Botón CTA: [LINK_CARRITO]
                                  </Button>
                                </Card>
                              </TabsContent>
                            ),
                          )}
                        </Tabs>
                      </TabsContent>

                      <TabsContent
                        value="social"
                        className="m-0 space-y-8 animate-in fade-in"
                      >
                        <Tabs defaultValue={platforms[0]} className="w-full">
                          <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm flex h-auto overflow-x-auto justify-start">
                            {platforms.map((p) => (
                              <TabsTrigger
                                key={p}
                                value={p}
                                className="rounded-lg px-6 font-bold capitalize gap-2 h-10"
                              >
                                {p}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          {platforms.map((platform) => (
                            <TabsContent key={platform} value={platform}>
                              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                {socialByPlatform[platform]?.map(
                                  (s: any, sIdx: number) => (
                                    <div key={sIdx} className="space-y-6">
                                      <SocialMockup variant={s} index={sIdx} />
                                      <DesignTokensSummary
                                        tokens={s.designTokens}
                                        channel="social"
                                        variant={s}
                                        index={s.originalIndex}
                                      />
                                    </div>
                                  ),
                                )}
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </TabsContent>

                      <TabsContent
                        value="ads"
                        className="m-0 space-y-8 animate-in fade-in"
                      >
                        <Tabs defaultValue="0" className="w-full">
                          <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
                            {selectedCollection.assets?.ads?.map(
                              (a: any, i: number) => (
                                <TabsTrigger
                                  key={i}
                                  value={i.toString()}
                                  className="rounded-lg px-6 font-bold capitalize"
                                >
                                  {a.type}
                                </TabsTrigger>
                              ),
                            )}
                          </TabsList>
                          {selectedCollection.assets?.ads?.map(
                            (a: any, aIdx: number) => (
                              <TabsContent
                                key={aIdx}
                                value={aIdx.toString()}
                                className="space-y-8"
                              >
                                <DesignTokensSummary
                                  tokens={a.designTokens}
                                  channel="ads"
                                  variant={a}
                                  index={aIdx}
                                />
                                <div className="grid lg:grid-cols-2 gap-12">
                                  <Card className="p-10 rounded-[2.5rem] bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 space-y-10">
                                      <div className="flex justify-between items-center">
                                        <Badge className="bg-white/10 text-white border-white/20 h-6 px-3 text-[8px] font-black uppercase tracking-[0.3em]">
                                          ESTRATEGIA {a.type?.toUpperCase()}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-white/40 uppercase">
                                          Ad Blueprint
                                        </span>
                                      </div>
                                      <div className="space-y-6">
                                        <div className="space-y-2">
                                          <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em]">
                                            Titulares Disponibles:
                                          </p>
                                          <div className="space-y-2">
                                            {a.headlines?.map(
                                              (h: string, i: number) => (
                                                <p
                                                  key={i}
                                                  className="text-xl font-black italic opacity-60 leading-tight"
                                                >
                                                  "{h}"
                                                </p>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em]">
                                            Descripciones de Impacto:
                                          </p>
                                          <div className="space-y-2">
                                            {a.descriptions?.map(
                                              (d: string, i: number) => (
                                                <p
                                                  key={i}
                                                  className="text-sm font-medium text-white/40 leading-relaxed italic"
                                                >
                                                  "{d}"
                                                </p>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                                        <div className="flex gap-2">
                                          {a.keywords?.map(
                                            (k: string, i: number) => (
                                              <Badge
                                                key={i}
                                                variant="outline"
                                                className="text-[7px] border-white/20 text-white/40 uppercase"
                                              >
                                                {k}
                                              </Badge>
                                            ),
                                          )}
                                        </div>
                                        <Button
                                          size="sm"
                                          className="bg-white text-slate-900 rounded-lg font-bold text-[10px] h-8 px-4"
                                        >
                                          CTA: Ir al Carrito
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                  <Card className="p-10 rounded-[2.5rem] bg-white border-none shadow-sm space-y-6">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                      <Layout className="h-5 w-5 text-primary" />{" "}
                                      Atributos del Ad Set
                                    </h4>
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                                        <span className="text-xs font-bold text-slate-500">
                                          Redirección al Carrito
                                        </span>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                      </div>
                                      <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                        <p className="text-[10px] font-black uppercase text-primary mb-3">
                                          Enfoque Técnico:
                                        </p>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                          {a.type === "search"
                                            ? "Optimizado para palabras clave de alta intención en buscadores."
                                            : a.type === "visual"
                                              ? "Diseñado para capturar atención visual rápida en redes sociales."
                                              : "Enfocado en usuarios que ya interactuaron, priorizando la urgencia y el cierre."}
                                        </p>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              </TabsContent>
                            ),
                          )}
                        </Tabs>
                      </TabsContent>
                    </>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 bg-white border-t shrink-0">
                <Button
                  onClick={() => setIsViewOpen(false)}
                  variant="outline"
                  className="rounded-xl font-bold h-12 px-10 border-2"
                >
                  Cerrar Catálogo
                </Button>
              </DialogFooter>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Dialog: Propuesta de Refinamiento */}
        <Dialog
          open={!!pendingRefinement}
          onOpenChange={(open) => !open && setPendingRefinement(null)}
        >
          <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-slate-900 p-8 text-white relative">
              <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <BrainCircuit className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Propuesta de Refinamiento IA
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Gemini ha analizado tu variante y propone los siguientes ajustes
                estratégicos.
              </DialogDescription>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Info className="h-3 w-3" /> Explicación de las Mejoras
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                  "{pendingRefinement?.explanation}"
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 font-medium">
                  Al aplicar, se actualizarán los design tokens y la estructura
                  técnica de esta variante específica basándose en las
                  directivas de campaña.
                </p>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setPendingRefinement(null)}
                  className="flex-1 rounded-xl h-12 font-bold"
                >
                  Descartar Cambios
                </Button>
                <Button
                  onClick={applyRefinement}
                  disabled={isSavingEdit}
                  className="flex-1 h-12 rounded-xl font-bold bg-primary shadow-xl"
                >
                  {isSavingEdit ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Aplicar Mejoras Proactivas
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
          <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-slate-900 p-8 text-white relative">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <SlidersHorizontal className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Ajustes del Blueprint
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Modifica los parámetros técnicos y el ADN visual de esta
                variante.
              </DialogDescription>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-10">
                <section className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Contexto Técnico
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary/10 rounded-xl">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-1">
                        Canal
                      </p>
                      <p className="text-sm font-bold capitalize">
                        {editingChannel}
                      </p>
                    </div>
                    <div className="p-4 bg-secondary/10 rounded-xl">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-1">
                        Estrategia / Tipo
                      </p>
                      <p className="text-sm font-bold capitalize">
                        {(editingVariant?.type || "").replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </section>

                {editingChannel === "landing" && (
                  <section className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      Densidad Académica
                    </Label>
                    <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                      <div>
                        <p className="text-xs font-bold">
                          Cantidad de Secciones
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase">
                          Minimal (1-3), Balanced (3-5), Detailed (5-7)
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="w-20 h-10 font-black text-center bg-white border-none"
                        value={editingVariant?.sectionCount || 0}
                        onChange={(e) =>
                          setEditingVariant({
                            ...editingVariant,
                            sectionCount: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </section>
                )}

                {editingChannel === "social" && (
                  <section className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      Estructura del Formato
                    </Label>
                    <div className="p-4 bg-secondary/10 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold">
                            {editingVariant?.type === "thread"
                              ? "Cantidad de Tweets"
                              : editingVariant?.type === "carousel" ||
                                  editingVariant?.type === "document"
                                ? "Cantidad de Placas"
                                : "Profundidad de Contenido"}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase">
                            Ajuste técnico para la API de{" "}
                            {editingVariant?.platform}
                          </p>
                        </div>
                        <Input
                          type="number"
                          className="w-20 h-10 font-black text-center bg-white border-none"
                          value={editingVariant?.slideCount || 0}
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant,
                              slideCount: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </section>
                )}

                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Type className="h-4 w-4" /> ADN Tipográfico Universal
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                        Fuente Títulos (Heading)
                      </Label>
                      <Input
                        value={editingVariant?.designTokens?.fontHeading}
                        onChange={(e) =>
                          setEditingVariant({
                            ...editingVariant,
                            designTokens: {
                              ...editingVariant.designTokens,
                              fontHeading: e.target.value,
                            },
                          })
                        }
                        className="h-12 rounded-xl bg-secondary/10 border-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                        Fuente Lectura (Body)
                      </Label>
                      <Input
                        value={editingVariant?.designTokens?.fontBody}
                        onChange={(e) =>
                          setEditingVariant({
                            ...editingVariant,
                            designTokens: {
                              ...editingVariant.designTokens,
                              fontBody: e.target.value,
                            },
                          })
                        }
                        className="h-12 rounded-xl bg-secondary/10 border-none font-bold"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Paleta Maestra
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: "primary", label: "Primario" },
                      { id: "secondary", label: "Fondo" },
                      { id: "accent", label: "Acento" },
                    ].map((c) => (
                      <div key={c.id} className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                          {c.label}
                        </Label>
                        <div className="flex flex-col items-center gap-2">
                          <Input
                            type="color"
                            className="w-12 h-12 p-0 border-none rounded-xl cursor-pointer shadow-md"
                            value={
                              editingVariant?.designTokens?.[c.id] || "#000000"
                            }
                            onChange={(e) =>
                              setEditingVariant({
                                ...editingVariant,
                                designTokens: {
                                  ...editingVariant.designTokens,
                                  [c.id]: e.target.value,
                                },
                              })
                            }
                          />
                          <Input
                            value={editingVariant?.designTokens?.[c.id]}
                            className="text-[10px] h-8 font-mono text-center"
                            onChange={(e) =>
                              setEditingVariant({
                                ...editingVariant,
                                designTokens: {
                                  ...editingVariant.designTokens,
                                  [c.id]: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <Button
                  onClick={handleSaveVariantEdit}
                  disabled={isSavingEdit}
                  className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-2xl bg-primary"
                >
                  {isSavingEdit ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}{" "}
                  Guardar Ajustes del Blueprint
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
