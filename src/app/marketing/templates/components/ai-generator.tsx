"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LandingMockup } from "./template-mockups";
import {
  Sparkles,
  Loader2,
  Target,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
  Mail,
  Instagram,
  Megaphone,
  LayoutTemplate,
  Twitter,
  Linkedin,
  Circle,
  Palette,
  Type,
  CheckCircle2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  AIHealthState,
  GenerationOptions,
} from "../types/template-types";
import { cn } from "@/lib/utils";
import { useStyleExamples } from "../hooks/use-style-examples";

interface AIGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string, directives: string) => Promise<boolean>;
  aiHealth: AIHealthState;
  isGenerating: boolean;
  generationProgress: { current: number; total: number; label: string } | null;
  enabledChannels: GenerationOptions;
  onChannelsChange: (channels: Partial<GenerationOptions>) => void;
  onHealthCheck: () => void;
  // Props para diseño de identidad
  identityDesign: any;
  isDesigning: boolean;
  designProgress: { current: number; total: number; label: string } | null;
  isDesignApproved: boolean;
  designGallery: any[];
  currentDesignIndex: number;
  onGenerateDesign: (directives: string) => Promise<any>;
  onUpdateDesign: (updates: any) => Promise<any>;
  onApproveDesign: () => void;
  onNavigateDesign: (direction: "next" | "prev") => void;
  hasNextDesign: () => boolean;
  hasPrevDesign: () => boolean;
}

export function AIGenerator({
  isOpen,
  onClose,
  onGenerate,
  aiHealth,
  isGenerating,
  generationProgress,
  enabledChannels,
  onChannelsChange,
  onHealthCheck,
  // Props para diseño de identidad
  identityDesign,
  isDesigning,
  designProgress,
  isDesignApproved,
  designGallery,
  currentDesignIndex,
  onGenerateDesign,
  onUpdateDesign,
  onApproveDesign,
  onNavigateDesign,
  hasNextDesign,
  hasPrevDesign,
}: AIGeneratorProps) {
  const [campaignName, setCampaignName] = useState("");
  const [directives, setDirectives] = useState("");
  const { examples, loading: examplesLoading } = useStyleExamples('classic');
  const [showExamplesModal, setShowExamplesModal] = useState(false);

  const [activeTab, setActiveTab] = useState("config");

  const handleGenerateDesign = async () => {
    if (!directives.trim()) {
      return;
    }

    const design = await onGenerateDesign(directives);
    if (design) {
      setActiveTab("design");
    }
  };

  const handleGenerateFinal = async () => {
    if (!campaignName.trim() || !directives.trim() || !isDesignApproved) {
      return;
    }

    const success = await onGenerate(campaignName, directives);
    if (success) {
      setCampaignName("");
      setDirectives("");
      setActiveTab("config");
      onClose();
    }
  };

  const getHealthBadge = () => {
    switch (aiHealth.status) {
      case "healthy":
        return (
          <Badge className="bg-success/15 text-success">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Saludable
          </Badge>
        );
      case "checking":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Verificando
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-danger/15 text-danger">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-foreground">
            <Circle className="h-3 w-3 mr-1" />
            Desconocido
          </Badge>
        );
    }
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "twitter":
        return <Twitter className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="mw-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Generador de Templates con IA</DialogTitle>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Generador de Templates con IA
            </CardTitle>
            <div className="flex items-center gap-2">
              {getHealthBadge()}
              <Button
                variant="outline"
                size="sm"
                onClick={onHealthCheck}
                disabled={aiHealth.status === "checking"}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Verificar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tabs de Navegación */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Configuración
              </TabsTrigger>
              <TabsTrigger
                value="design"
                disabled={!directives.trim()}
                className="flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Diseño Visual
                {identityDesign && (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="generate"
                disabled={!isDesignApproved}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Generar Planos
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Configuración */}
            <TabsContent value="config" className="space-y-6">
              {/* Información de salud */}
              {aiHealth.status !== "healthy" && (
                <div
                  className={cn(
                    "p-4 rounded-lg",
                    aiHealth.status === "error"
                      ? "bg-danger/10 border border-danger/20"
                      : "bg-blue-50 border border-blue-200",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {aiHealth.status === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-danger" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        aiHealth.status === "error"
                          ? "text-danger"
                          : "text-blue-800",
                      )}
                    >
                      {aiHealth.message || "Verificando estado del servicio..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Información básica */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Nombre de la Campaña</Label>
                  <Input
                    id="campaign-name"
                    placeholder="Ej: Lanzamiento de Producto Q2 2024"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <Label htmlFor="directives">Directivas de Generación</Label>
                  <Textarea
                    id="directives"
                    placeholder="Describe el tipo de templates que quieres generar, público objetivo, tono de voz, elementos visuales, etc."
                    value={directives}
                    onChange={(e) => setDirectives(e.target.value)}
                    rows={4}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Estilo de Landing */}
              <div>
                <Label className="text-base font-medium">
                  Estilo de Landing
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Estilo Classic seleccionado por defecto.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  <div className="rounded-xl border-2 border-blue-500 ring-2 ring-blue-200 transition-all overflow-hidden">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                        <div className="text-white text-center p-4">
                          <div className="w-16 h-16 mx-auto mb-2 bg-white/20 rounded-lg" />
                          <div className="h-2 bg-white/30 rounded w-3/4 mx-auto mb-1" />
                          <div className="h-2 bg-white/30 rounded w-1/2 mx-auto" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">Classic</span>
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        El estilo original, balanceado y profesional
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setShowExamplesModal(true)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Ejemplos (3)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canales habilitados */}
              <div>
                <Label className="text-base font-medium">
                  Canales a Generar
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {[
                    {
                      key: "landings",
                      label: "Landing Pages",
                      icon: LayoutTemplate,
                    },
                    { key: "emails", label: "Emails", icon: Mail },
                    { key: "ads", label: "Anuncios", icon: Megaphone },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={
                          enabledChannels[key as keyof GenerationOptions]
                        }
                        onCheckedChange={(checked) =>
                          onChannelsChange({ [key]: checked as boolean })
                        }
                        disabled={isGenerating}
                      />
                      <Label
                        htmlFor={key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones del Tab 1 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isGenerating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerateDesign}
                  disabled={
                    !directives.trim() ||
                    isGenerating ||
                    aiHealth.status !== "healthy"
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isDesigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando Diseño...
                    </>
                  ) : (
                    <>
                      <Palette className="h-4 w-4 mr-2" />
                      Generar Identidad Visual
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Diseño Visual */}
            <TabsContent value="design" className="space-y-6">
              {identityDesign ? (
                <div className="space-y-6">
                  {/* Navegación de Galería */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateDesign("prev")}
                        disabled={!hasPrevDesign() || isDesigning}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-sm font-medium px-3">
                        {currentDesignIndex + 1} / {designGallery.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateDesign("next")}
                        disabled={!hasNextDesign() || isDesigning}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateDesign()}
                      disabled={isDesigning || !directives.trim()}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Generar 5 Nuevos
                    </Button>
                  </div>

                  {/* Indicadores de diseño */}
                  <div className="flex justify-center gap-1">
                    {designGallery.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${index === currentDesignIndex
                            ? "bg-blue-600"
                            : "bg-border"
                          }`}
                      />
                    ))}
                  </div>

                  {/* Paleta de Colores */}
                  <div>
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Paleta de Colores
                    </Label>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div
                          className="w-full h-20 rounded-lg border-2 border-border mb-2"
                          style={{
                            backgroundColor:
                              identityDesign.colorPalette.primary,
                          }}
                        />
                        <p className="text-sm font-medium">Primario</p>
                        <p className="text-xs text-muted-foreground">
                          {identityDesign.colorPalette.primary}
                        </p>
                      </div>
                      <div className="text-center">
                        <div
                          className="w-full h-20 rounded-lg border-2 border-border mb-2"
                          style={{
                            backgroundColor:
                              identityDesign.colorPalette.secondary,
                          }}
                        />
                        <p className="text-sm font-medium">Secundario</p>
                        <p className="text-xs text-muted-foreground">
                          {identityDesign.colorPalette.secondary}
                        </p>
                      </div>
                      <div className="text-center">
                        <div
                          className="w-full h-20 rounded-lg border-2 border-border mb-2"
                          style={{
                            backgroundColor: identityDesign.colorPalette.accent,
                          }}
                        />
                        <p className="text-sm font-medium">Acento</p>
                        <p className="text-xs text-muted-foreground">
                          {identityDesign.colorPalette.accent}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-full h-20 rounded-lg border-2 border-border mb-2 bg-gradient-to-r from-muted to-border" />
                        <p className="text-sm font-medium">Neutros</p>
                        <p className="text-xs text-muted-foreground">4 tonos</p>
                      </div>
                    </div>
                  </div>

                  {/* Tipografía */}
                  <div>
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Tipografía
                    </Label>
                    <div className="mt-3 grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Titulares</h4>
                        <div className="space-y-2">
                          <div
                            style={{
                              fontFamily:
                                identityDesign.typography.heading.font,
                              fontWeight: "700",
                            }}
                          >
                            <p className="text-2xl">Título Principal</p>
                          </div>
                          <div
                            style={{
                              fontFamily:
                                identityDesign.typography.heading.font,
                              fontWeight: "600",
                            }}
                          >
                            <p className="text-xl">Subtítulo Importante</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Cuerpo de Texto</h4>
                        <div
                          className="space-y-2"
                          style={{
                            fontFamily: identityDesign.typography.body.font,
                          }}
                        >
                          <p className="text-base font-normal">
                            Texto normal para párrafos.
                          </p>
                          <p className="text-sm font-medium">
                            Texto medio para énfasis.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del Tab 2 */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("config")}
                        disabled={isDesigning}
                      >
                        Atrás
                      </Button>
                    </div>
                    <Button
                      onClick={onApproveDesign}
                      disabled={isDesigning}
                      className="bg-success hover:bg-success"
                    >
                      {isDesignApproved ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Diseño Aprobado
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aprobar Diseño
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Palette className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Sin Diseño Generado
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Primero completa la configuración y genera la identidad
                    visual
                  </p>
                  <Button onClick={() => setActiveTab("config")}>
                    Volver a Configuración
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Generación Final */}
            <TabsContent value="generate" className="space-y-6">
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-success/10 rounded-full">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Listo para Generar Planos Omnicanal
                </h3>
                <p className="text-muted-foreground mb-6">
                  Con la identidad visual aprobada, podemos generar los planos
                  para todos los canales configurados
                </p>

                {/* Resumen de la configuración */}
                <div className="bg-muted p-6 rounded-lg text-left mb-6">
                  <h4 className="font-medium mb-4">Resumen de la Campaña:</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Nombre:</strong> {campaignName}
                      </p>
                      <p>
                        <strong>Canales:</strong>{" "}
                        {Object.entries(enabledChannels)
                          .filter(([_, enabled]) => enabled)
                          .map(([key]) => key)
                          .join(", ")}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Color Primario:</strong>{" "}
                        {identityDesign?.colorPalette.primary}
                      </p>
                      <p>
                        <strong>Tipografía:</strong>{" "}
                        {identityDesign?.typography.heading.font}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateFinal}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando Planos...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generar Planos Omnicanal
                    </>
                  )}
                </Button>
              </div>

              {/* Progreso de generación */}
              {isGenerating && generationProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Generando Planos...
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {generationProgress.current} / {generationProgress.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      (generationProgress.current / generationProgress.total) *
                      100
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    {generationProgress.label}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </DialogContent>

      {/* Modal para mostrar ejemplos del estilo */}
      <Dialog open={showExamplesModal} onOpenChange={setShowExamplesModal}>
        <DialogContent className="mw-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">
            Ejemplos del Estilo Classic
          </DialogTitle>
          <DialogDescription>
            3 landings generadas por IA con el tema "por qué BTECHAcademy nuestra aplicación web es bueno para tutores y alumnos"
          </DialogDescription>
          
          {examplesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : examples.length > 0 ? (
            <div className="space-y-6 mt-4">
              {examples.map((example: any, index: number) => (
                <div key={example.variant || index} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {example.imageUrl && (
                      <img 
                        src={example.imageUrl} 
                        alt={example.marketingName || `Variante ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/90 text-xs">
                        {example.variant || `Variante ${index + 1}`}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-2">
                      {example.marketingName || `Variante ${index + 1}`}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {example.headline || 'Ejemplo generado por IA'}
                    </p>
                    {example.sections && example.sections.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Secciones:</p>
                        {example.sections.slice(0, 2).map((section: any, sIndex: number) => (
                          <div key={sIndex} className="text-xs text-muted-foreground">
                            • {section.title}
                          </div>
                        ))}
                        {example.sections.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{example.sections.length - 2} secciones más...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay ejemplos disponibles
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
