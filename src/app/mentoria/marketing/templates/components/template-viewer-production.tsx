"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  LayoutTemplate,
  Mail,
  Megaphone,
  Settings2,
  Sparkles,
  Loader2,
  Instagram,
  Twitter,
  Linkedin,
  Type,
  Palette,
  Save,
  Video,
  Music,
  MonitorPlay,
  ChevronRight,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateCollection } from "../types/template-types";
import {
  LandingMockup,
  EmailMockup,
  AdMockup,
} from "./template-mockups";
import { useStyleExamples } from "../hooks/use-style-examples";

interface TemplateViewerProductionProps {
  collection: TemplateCollection | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCollection?: (updatedCollection: TemplateCollection) => void;
  isAdmin?: boolean;
}

export const TemplateViewerProduction = ({
  collection,
  isOpen,
  onClose,
  onUpdateCollection,
  isAdmin = false,
}: TemplateViewerProductionProps) => {
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [pendingRefinement, setPendingRefinement] = useState<any>(null);
  const { examples, loading: examplesLoading } = useStyleExamples(collection?.styleId || 'classic');

  const [masterAdns, setMasterAdns] = useState<Record<string, any>>({});

  // Cargar ADNs dinámicos
  useEffect(() => {
    const fetchAdns = async () => {
      try {
        const res = await fetch("/api/adns");
        const data = await res.json();
        if (data && data.success) {
          const map: Record<string, any> = {};
          data.adns.forEach((a: any) => (map[a.id] = a));
          setMasterAdns(map);
        }
      } catch (e) {
        console.error("Error loading ADNs in Viewer:", e);
      }
    };
    fetchAdns();
  }, []);

  // Funciones de edición
  const handleOpenEditVariant = (
    variant: any,
    channel: string,
    index: number,
  ) => {
    // Asegurar que designTokens exista y tenga valores por defecto
    const variantWithTokens = {
      ...variant,
      designTokens: {
        primary: variant.designTokens?.primary || "#3B2D86",
        secondary: variant.designTokens?.secondary || "#F0EEF6",
        accent: variant.designTokens?.accent || "#2680E5",
        fontHeading: variant.designTokens?.fontHeading || "Space Grotesk",
        fontBody: variant.designTokens?.fontBody || "Inter",
        ...variant.designTokens,
      },
    };

    setEditingVariant(variantWithTokens);
    setEditingChannel(channel);
    setEditingIndex(index);
    setIsEditVariantOpen(true); // Abrir editor modal en producción
  };

  const handleCloseEditModal = () => {
    setIsEditVariantOpen(false);
    setEditingVariant(null);
    setEditingChannel("");
    setEditingIndex(-1);
  };

  const handleSaveEdit = () => {
    if (!editingVariant || editingIndex === -1 || !collection) return;

    // Guardar los cambios en la colección real
    const updatedCollection = { ...collection };

    // Actualizar el variant específico según el canal
    if (editingChannel === "landing" && updatedCollection.assets?.landings) {
      updatedCollection.assets.landings[editingIndex] = editingVariant;
    } else if (editingChannel === "email" && updatedCollection.assets?.emails) {
      updatedCollection.assets.emails[editingIndex] = editingVariant;
    } else if (
      editingChannel === "social" &&
      updatedCollection.assets?.socials
    ) {
      updatedCollection.assets.socials[editingIndex] = editingVariant;
    } else if (editingChannel === "ads" && updatedCollection.assets?.ads) {
      updatedCollection.assets.ads[editingIndex] = editingVariant;
    }

    // Actualizar el estado de la colección usando la función de actualización
    if (onUpdateCollection) {
      onUpdateCollection(updatedCollection);
    }

    // Cerrar modal
    handleCloseEditModal();

    // Mostrar feedback
    alert("¡Cambios guardados exitosamente!");
  };

  const handleRefineVariantAI = async (
    channel: string,
    variant: any,
    index: number,
  ) => {
    setIsRefining(`${channel}-${index}`);
    try {
      setTimeout(() => {
        setPendingRefinement({
          variant: { ...variant, headline: `${variant.headline} (Refinado)` },
          explanation:
            "He analizado tu variante y propongo ajustes para mejorar el impacto visual y la conversión.",
          channel,
          index,
        });
        setIsRefining(null);
      }, 2000);
    } catch (e) {
      console.error("Error al refinar con IA:", e);
      setIsRefining(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case "twitter":
        return <Twitter className="h-4 w-4 text-blue-400" />;
      case "tiktok":
        return <Megaphone className="h-4 w-4 text-black" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-blue-700" />;
      default:
        return <Instagram className="h-4 w-4" />;
    }
  };

  const totalTemplates = Object.values(collection?.assets || {}).reduce(
    (total: number, channel: any) =>
      total + (Array.isArray(channel) ? channel.length : 0),
    0,
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogTitle className="sr-only">
          {collection?.name || "Colección de Templates"}
        </DialogTitle>
        <DialogContent aria-describedby={undefined} className="mw-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b p-8 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-3xl font-headline font-bold text-primary tracking-tight mb-3">
                  {collection?.name || "Colección de Templates"}
                </h2>
                {collection && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="bg-secondary/10 text-muted-foreground border-none font-bold gap-1.5 px-3 py-1"
                    >
                      <LayoutTemplate className="h-3 w-3" />
                      {collection.assets?.landings?.length || 0} Landings
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-secondary/10 text-muted-foreground border-none font-bold gap-1.5 px-3 py-1"
                    >
                      <Mail className="h-3 w-3" />
                      {collection.assets?.emails?.length || 0} Emails
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-secondary/10 text-muted-foreground border-none font-bold gap-1.5 px-3 py-1"
                    >
                      <Instagram className="h-3 w-3" />
                      {collection.assets?.socials?.length || 0} Social
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-secondary/10 text-muted-foreground border-none font-bold gap-1.5 px-3 py-1"
                    >
                      <Megaphone className="h-3 w-3" />
                      {collection.assets?.ads?.length || 0} Ads
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-muted-foreground hover:text-primary hover:bg-secondary/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Content con solapas y sub-solapas */}
          <div className="flex-1 overflow-y-auto bg-muted/50">
            <Tabs defaultValue="landing" className="w-full">
              <div className="px-8 pt-8 pb-4 border-b bg-white">
                <TabsList className="bg-secondary/20 p-1 rounded-2xl h-14 justify-start gap-2 overflow-x-auto w-full">
                  {collection?.assets?.landings && (
                    <TabsTrigger
                      value="landing"
                      className="rounded-xl px-6 font-bold gap-2 shrink-0"
                    >
                      <LayoutTemplate className="h-4 w-4" /> Landings
                    </TabsTrigger>
                  )}
                  {collection?.assets?.emails && (
                    <TabsTrigger
                      value="email"
                      className="rounded-xl px-6 font-bold gap-2 shrink-0"
                    >
                      <Mail className="h-4 w-4" /> Emails
                    </TabsTrigger>
                  )}
                  {collection?.assets?.ads && (
                    <TabsTrigger
                      value="ads"
                      className="rounded-xl px-6 font-bold gap-2 shrink-0"
                    >
                      <Megaphone className="h-4 w-4" /> Ads
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="p-6">
                {collection && (
                  <>
                    {/* Landings Tab */}
                    <TabsContent value="landing" className="m-0 space-y-6">
                      <Tabs
                        defaultValue={
                          collection?.assets?.landings?.[0] ? `landing-0` : ""
                        }
                        className="w-full"
                      >
                        <TabsList className="bg-transparent p-0 flex-wrap h-auto gap-2">
                          {/* Landings de la colección */}
                          {collection?.assets?.landings?.map(
                            (l: any, lIdx: number) => (
                              <TabsTrigger
                                key={lIdx}
                                value={`landing-${lIdx}`}
                                className="rounded-full px-5 py-2 font-bold text-xs bg-white border border-border text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary shadow-sm"
                              >
                                Variante {lIdx + 1}
                              </TabsTrigger>
                            ),
                          )}
                        </TabsList>
                        
                        {/* Landings de la colección */}
                        {collection?.assets?.landings?.map(
                          (l: any, lIdx: number) => (
                            <TabsContent
                              key={lIdx}
                              value={`landing-${lIdx}`}
                              className="mt-6"
                            >
                              <Card className="overflow-hidden border-none rounded-lg bg-white">
                                <CardContent className="p-0">
                                  <div className="flex justify-center w-full h-[600px] overflow-hidden bg-muted rounded-b-[2rem]">
                                     <iframe 
                                       src={`/v/${collection.id}?v=${lIdx}&preview=true`} 
                                       className="w-full h-[calc(600px*1.28)] origin-top-left"
                                      style={{ transform: 'scale(0.78125)', border: 'none' }}
                                      title={`Preview Variante ${lIdx + 1}`}
                                    />
                                  </div>
                                </CardContent>
                                {isAdmin && (
                                  <div className="p-4 border-t border-muted flex justify-end gap-3 bg-white">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenEditVariant(l, "landing", lIdx)
                                      }
                                      className="rounded-xl font-bold h-9 px-5 text-xs text-primary hover:bg-primary/10"
                                    >
                                      <Settings2 className="h-4 w-4 mr-1.5" />{" "}
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleRefineVariantAI("landing", l, lIdx)
                                      }
                                      disabled={isRefining === `landing-${lIdx}`}
                                      className="rounded-xl font-bold h-9 px-5 text-xs bg-success/10 text-success hover:bg-success/15 shadow-sm border border-success/15"
                                    >
                                      {isRefining === `landing-${lIdx}` ? (
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 mr-1.5" />
                                      )}{" "}
                                      Refinar con IA
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            </TabsContent>
                          ),
                        )}
                      </Tabs>
                    </TabsContent>

                    {/* Emails Tab */}
                    <TabsContent value="email" className="m-0 space-y-6">
                      <Tabs
                        defaultValue={
                          collection?.assets?.emails?.[0] ? `email-0` : ""
                        }
                        className="w-full"
                      >
                        <TabsList className="bg-transparent p-0 flex-wrap h-auto gap-2">
                          {collection?.assets?.emails?.map(
                            (e: any, eIdx: number) => (
                              <TabsTrigger
                                key={eIdx}
                                value={`email-${eIdx}`}
                                className="rounded-full px-5 py-2 font-bold text-xs bg-white border border-border text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary shadow-sm"
                              >
                                Variante {eIdx + 1}
                              </TabsTrigger>
                            ),
                          )}
                        </TabsList>
                        {collection?.assets?.emails?.map(
                          (e: any, eIdx: number) => (
                            <TabsContent
                              key={eIdx}
                              value={`email-${eIdx}`}
                              className="mt-6"
                            >
                              <Card className="overflow-hidden border-none rounded-lg bg-white">
                                <CardContent className="p-0">
                                  <EmailMockup template={e} index={eIdx} />
                                </CardContent>
                                {isAdmin && (
                                  <div className="p-4 border-t border-muted flex justify-end gap-3 bg-white">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenEditVariant(e, "email", eIdx)
                                      }
                                      className="rounded-xl font-bold h-9 px-5 text-xs text-primary hover:bg-primary/10"
                                    >
                                      <Settings2 className="h-4 w-4 mr-1.5" />{" "}
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleRefineVariantAI("email", e, eIdx)
                                      }
                                      disabled={isRefining === `email-${eIdx}`}
                                      className="rounded-xl font-bold h-9 px-5 text-xs bg-success/10 text-success hover:bg-success/15 shadow-sm border border-success/15"
                                    >
                                      {isRefining === `email-${eIdx}` ? (
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 mr-1.5" />
                                      )}{" "}
                                      Refinar con IA
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            </TabsContent>
                          ),
                        )}
                      </Tabs>
                    </TabsContent>

                    {/* Ads Tab */}
                    <TabsContent value="ads" className="m-0 space-y-6">
                      <Tabs
                        defaultValue={
                          collection?.assets?.ads?.[0] ? `ad-0` : ""
                        }
                        className="w-full"
                      >
                        <TabsList className="bg-transparent p-0 flex-wrap h-auto gap-2">
                          {collection?.assets?.ads?.map(
                            (a: any, aIdx: number) => (
                              <TabsTrigger
                                key={aIdx}
                                value={`ad-${aIdx}`}
                                className="rounded-full px-5 py-2 font-bold text-xs bg-white border border-border text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary shadow-sm"
                              >
                                Variante {aIdx + 1}
                              </TabsTrigger>
                            ),
                          )}
                        </TabsList>
                        {collection?.assets?.ads?.map(
                          (a: any, aIdx: number) => (
                            <TabsContent
                              key={aIdx}
                              value={`ad-${aIdx}`}
                              className="mt-6"
                            >
                              <Card className="overflow-hidden border-none rounded-lg bg-white">
                                <CardContent className="p-0">
                                  <AdMockup template={a} index={aIdx} />
                                </CardContent>
                                {isAdmin && (
                                  <div className="p-4 border-t border-muted flex justify-end gap-3 bg-white">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenEditVariant(a, "ad", aIdx)
                                      }
                                      className="rounded-xl font-bold h-9 px-5 text-xs text-primary hover:bg-primary/10"
                                    >
                                      <Settings2 className="h-4 w-4 mr-1.5" />{" "}
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleRefineVariantAI("ad", a, aIdx)
                                      }
                                      disabled={isRefining === `ad-${aIdx}`}
                                      className="rounded-xl font-bold h-9 px-5 text-xs bg-success/10 text-success hover:bg-success/15 shadow-sm border border-success/15"
                                    >
                                      {isRefining === `ad-${aIdx}` ? (
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 mr-1.5" />
                                      )}{" "}
                                      Refinar con IA
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            </TabsContent>
                          ),
                        )}
                      </Tabs>
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Modal - Ajustes de Blueprint */}
      <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
        <DialogContent aria-describedby={undefined} className="mw-2xl">
          <DialogTitle className="text-2xl font-bold">
            Ajustes de Blueprint
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ajusta los tokens de diseño, tipografías y colores para este
            template
          </DialogDescription>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-10">
              <section className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                  Contexto Técnico
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/10 rounded-xl">
                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">
                      Canal
                    </p>
                    <p className="text-sm font-bold capitalize">
                      {editingChannel}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-xl">
                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">
                      Estrategia / Tipo
                    </p>
                    <p className="text-sm font-bold capitalize">
                      {(editingVariant?.type || "").replace("_", " ")}
                    </p>
                  </div>
                </div>
              </section>

              {editingChannel === "landing" && (
                <section className="space-y-8">
                  {/* TEMA VISUAL */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Modo Visual (Theme Mode)
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['light', 'dark', 'glass'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() =>
                            setEditingVariant({
                              ...editingVariant,
                              themeMode: mode,
                            })
                          }
                          className={cn(
                            "py-2 rounded-xl text-xs font-bold border-2 capitalize transition-all",
                            (editingVariant?.themeMode || 'light') === mode
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-muted bg-muted text-muted-foreground hover:border-border"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DENSIDAD ACADÉMICA */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Densidad Académica
                    </Label>
                    <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                      <div>
                        <p className="text-xs font-bold">Cantidad de Secciones</p>
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
                  </div>

                  {/* VISIBILIDAD DE SECCIONES */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Secciones Visibles
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'showHeroVideo', label: 'Video Principal' },
                        { key: 'showNarrative', label: 'Textos Narrativos' },
                        { key: 'showSyllabus', label: 'Temario del Curso' },
                        { key: 'showBenefits', label: 'Beneficios' },
                        { key: 'showMentor', label: 'Perfil del Mentor' },
                        { key: 'showFaqs', label: 'Preguntas Frecuentes' },
                      ].map((item) => {
                        const isVisible = editingVariant?.visibility?.[item.key] ?? true;
                        return (
                          <button
                            key={item.key}
                            onClick={() =>
                              setEditingVariant({
                                ...editingVariant,
                                visibility: {
                                  ...(editingVariant?.visibility || {
                                    showHeroVideo: true,
                                    showNarrative: true,
                                    showSyllabus: true,
                                    showBenefits: true,
                                    showMentor: true,
                                    showFaqs: true,
                                  }),
                                  [item.key]: !isVisible,
                                },
                              })
                            }
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border-2 text-xs font-bold transition-all",
                              isVisible
                                ? "border-success/20 bg-success/10 text-success"
                                : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            {item.label}
                            <div className={cn("w-3 h-3 rounded-full transition-colors", isVisible ? "bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-border")} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {editingChannel === "social" && (
                <section className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                    Estructura del Formato
                  </Label>

                  {/* EVO SOCIAL LAB UNIVERSAL - BLUEPRINT TÉCNICO */}
                  <div className="pt-4 border-t border-border flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <h4 className="text-sm font-black tracking-tight uppercase">
                          Evo Social Lab Universal
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                        Estilo Visual (Preset ADN)
                      </Label>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.values(masterAdns).length > 0 ? (
                          Object.values(masterAdns).map((preset: any) => (
                            <div
                              key={preset.id}
                              onClick={() =>
                                setEditingVariant({
                                  ...editingVariant,
                                  blueprintConfig: {
                                    ...(editingVariant.blueprintConfig || {
                                      resolution: "1080x1920",
                                      fps: 30,
                                      audioMood: "inspiring",
                                      sceneCount: 5,
                                      totalDuration: 30,
                                      slideCount: 5,
                                    }),
                                    presetId: preset.id,
                                  },
                                })
                              }
                              className={cn(
                                "group relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer flex flex-col min-h-[100px] justify-center bg-white hover:border-border",
                                editingVariant?.blueprintConfig?.presetId ===
                                  preset.id ||
                                  (!editingVariant?.blueprintConfig?.presetId &&
                                    preset.id === "01")
                                  ? "border-primary bg-primary/5 shadow-lg scale-[1.01]"
                                  : "border-muted",
                              )}
                            >
                              <div className="p-5 relative z-10 w-full">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p
                                      className={cn(
                                        "text-lg font-black",
                                        editingVariant?.blueprintConfig
                                          ?.presetId === preset.id ||
                                          (!editingVariant?.blueprintConfig
                                            ?.presetId &&
                                            preset.id === "01")
                                          ? "text-primary"
                                          : "text-foreground",
                                      )}
                                    >
                                      {preset.name}
                                    </p>
                                    <p className="text-[12px] text-muted-foreground font-medium mt-1 pr-6 leading-relaxed">
                                      {preset.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {(editingVariant?.blueprintConfig?.presetId ===
                                preset.id ||
                                (!editingVariant?.blueprintConfig?.presetId &&
                                  preset.id === "01")) && (
                                  <Badge className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-3 py-1 shadow-md z-20">
                                    ADN ACTIVO
                                  </Badge>
                                )}
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-sm font-medium text-muted-foreground border rounded-2xl bg-muted border-dashed">
                            <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin text-muted-foreground" />
                            Sincronizando ADNs Maestros...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CAMPOS DINÁMICOS SEGÚN FORMATO */}
                    <div className="space-y-6">
                      {/* ESTRATEGIA INDIVIDUAL DEL BLUEPRINT */}
                      <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Target className="h-4 w-4" />
                          <h4 className="text-[10px] font-black uppercase tracking-tighter">
                            Psicología de Venta de esta pieza
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                              Vector Estratégico
                            </Label>
                            <Input
                              placeholder="Ej: Autoridad, Escasez..."
                              className="h-10 text-xs font-bold bg-white border-none shadow-sm rounded-xl"
                              value={
                                editingVariant?.blueprintConfig
                                  ?.strategyVector || ""
                              }
                              onChange={(e) =>
                                setEditingVariant({
                                  ...editingVariant,
                                  blueprintConfig: {
                                    ...(editingVariant.blueprintConfig || {
                                      presetId: "01",
                                      resolution: "1080x1920",
                                    }),
                                    strategyVector: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                              Tono Comercial
                            </Label>
                            <Input
                              placeholder="Ej: Agresivo, Empático..."
                              className="h-10 text-xs font-bold bg-white border-none shadow-sm rounded-xl"
                              value={
                                editingVariant?.blueprintConfig
                                  ?.commercialTone || ""
                              }
                              onChange={(e) =>
                                setEditingVariant({
                                  ...editingVariant,
                                  blueprintConfig: {
                                    ...(editingVariant.blueprintConfig || {
                                      presetId: "01",
                                      resolution: "1080x1920",
                                    }),
                                    commercialTone: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                        Estructura Técnica del Blueprint
                      </Label>

                      {/* 1. Para Videos y Stories */}
                      {(editingVariant?.type === "short_video" ||
                        editingVariant?.type === "story") && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                  <MonitorPlay className="h-3 w-3" /> Escenas
                                </Label>
                                <Input
                                  type="number"
                                  className="font-black text-center bg-white border-none shadow-sm"
                                  value={
                                    editingVariant?.blueprintConfig?.sceneCount ||
                                    5
                                  }
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      blueprintConfig: {
                                        ...(editingVariant.blueprintConfig || {
                                          presetId: "01",
                                          resolution: "1080x1920",
                                          fps: 30,
                                          totalDuration: 30,
                                        }),
                                        sceneCount: parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                 size="lg" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                  <Video className="h-3 w-3" /> Duración Total
                                  (seg)
                                </Label>
                                <Input
                                  type="number"
                                  className="font-black text-center bg-white border-none shadow-sm"
                                  value={
                                    editingVariant?.blueprintConfig
                                      ?.totalDuration || 30
                                  }
                                  onChange={(e) =>
                                    setEditingVariant({
                                      ...editingVariant,
                                      blueprintConfig: {
                                        ...(editingVariant.blueprintConfig || {
                                          presetId: "01",
                                          resolution: "1080x1920",
                                          fps: 30,
                                          audioMood: "inspiring",
                                          sceneCount: 5,
                                        }),
                                        totalDuration:
                                          parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                 size="lg" />
                              </div>
                            </div>
                          </div>
                        )}

                      {/* 2. Para Carruseles, Documentos e Hilos */}
                      {(editingVariant?.type === "carousel" ||
                        editingVariant?.type === "document" ||
                        editingVariant?.type === "thread") && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <LayoutTemplate className="h-3 w-3" />
                                {editingVariant?.type === "thread"
                                  ? "Cantidad de Tweets"
                                  : "Cantidad de Placas"}
                              </Label>
                              <Input
                                type="number"
                                className="font-black text-center bg-white border-none shadow-sm"
                                value={
                                  editingVariant?.blueprintConfig?.slideCount ||
                                  editingVariant?.slideCount ||
                                  5
                                }
                                onChange={(e) =>
                                  setEditingVariant({
                                    ...editingVariant,
                                    blueprintConfig: {
                                      ...(editingVariant.blueprintConfig || {
                                        presetId: "01",
                                        resolution: "1080x1080",
                                        totalDuration: 45,
                                      }),
                                      slideCount: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                               size="lg" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Tiempo de Lectura
                                (seg)
                              </Label>
                              <Input
                                type="number"
                                className="font-black text-center bg-white border-none shadow-sm"
                                value={
                                  editingVariant?.blueprintConfig
                                    ?.totalDuration || 45
                                }
                                onChange={(e) =>
                                  setEditingVariant({
                                    ...editingVariant,
                                    blueprintConfig: {
                                      ...(editingVariant.blueprintConfig || {
                                        presetId: "01",
                                        resolution: "1080x1080",
                                        slideCount: 5,
                                      }),
                                      totalDuration:
                                        parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                               size="lg" />
                            </div>
                          </div>
                        )}

                      {/* 3. Para Single Posts */}
                      {editingVariant?.type === "single_post" && (
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted text-center text-muted-foreground">
                          <p className="text-xs font-bold uppercase mb-1">
                            Formato Estático
                          </p>
                          <p className="text-[10px]">
                            Esta pieza está configurada como una placa única. No
                            requiere métricas de video ni carrusel.
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[10px] text-primary/80 font-bold uppercase mb-1">
                          Nota de Social Lab
                        </p>
                        <p className="text-[11px] leading-relaxed italic text-muted-foreground">
                          La IA utilizará esta estructura técnica para maquetar
                          el guion detallado según el protocolo de la
                          plataforma.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Solo mostrar ADN de diseño manual si NO es un formato de Social Lab (que usa Presets) */}
              {editingChannel !== "social" && (
                <>
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <Type className="h-4 w-4" /> ADN Tipográfico Universal
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                          Fuente Títulos (Heading)
                        </Label>
                        <Input
                          value={
                            editingVariant?.designTokens?.fontHeading ||
                            "Space Grotesk"
                          }
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant,
                              designTokens: {
                                ...editingVariant.designTokens,
                                fontHeading: e.target.value,
                              },
                            })
                          }
                          className="bg-secondary/10 border-none font-bold"
                         size="lg" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                          Fuente Lectura (Body)
                        </Label>
                        <Input
                          value={
                            editingVariant?.designTokens?.fontBody || "Inter"
                          }
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant,
                              designTokens: {
                                ...editingVariant.designTokens,
                                fontBody: e.target.value,
                              },
                            })
                          }
                          className="bg-secondary/10 border-none font-bold"
                         size="lg" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
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
                              className="w-12 p-0 border-none cursor-pointer shadow-md"
                              value={
                                editingVariant?.designTokens?.[c.id] ||
                                "#000000"
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
                             size="lg" />
                            <Input
                              value={
                                editingVariant?.designTokens?.[c.id] ||
                                "#000000"
                              }
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
                </>
              )}

              <Button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="w-full h-16 rounded-[1.5rem] font-bold text-xl bg-primary"
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
    </>
  );
};
