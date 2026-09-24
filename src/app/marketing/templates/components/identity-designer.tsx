"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Type,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Eye,
  Edit3,
  Sparkles,
  Info,
} from "lucide-react";
import { IdentityDesign, DesignTokens } from "../hooks/use-identity-design";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface IdentityDesignerProps {
  isOpen: boolean;
  onClose: () => void;
  directives: string;
  identityDesign: IdentityDesign | null;
  isDesigning: boolean;
  designProgress: { current: number; total: number; label: string } | null;
  isDesignApproved: boolean;
  onGenerateDesign: (directives: string) => Promise<IdentityDesign | null>;
  onUpdateDesign: (
    updates: Partial<IdentityDesign>,
  ) => Promise<IdentityDesign | null>;
  onApproveDesign: () => void;
}

export function IdentityDesigner({
  isOpen,
  onClose,
  directives,
  identityDesign,
  isDesigning,
  designProgress,
  isDesignApproved,
  onGenerateDesign,
  onUpdateDesign,
  onApproveDesign,
}: IdentityDesignerProps) {
  const [editingMode, setEditingMode] = useState(false);
  const [editedTokens, setEditedTokens] = useState<DesignTokens | null>(null);

  const handleGenerateDesign = async () => {
    await onGenerateDesign(directives);
  };

  const handleStartEditing = () => {
    if (identityDesign) {
      setEditedTokens({ ...identityDesign.designTokens });
      setEditingMode(true);
    }
  };

  const handleSaveEdits = async () => {
    if (editedTokens && identityDesign) {
      const updates = {
        designTokens: editedTokens,
        colorPalette: {
          ...identityDesign.colorPalette,
          primary: editedTokens.primary,
          secondary: editedTokens.secondary,
          accent: editedTokens.accent,
        },
        typography: {
          ...identityDesign.typography,
          heading: {
            ...identityDesign.typography.heading,
            font: editedTokens.fontHeading,
          },
          body: {
            ...identityDesign.typography.body,
            font: editedTokens.fontBody,
          },
        },
      };

      await onUpdateDesign(updates);
      setEditingMode(false);
      setEditedTokens(null);
    }
  };

  const handleCancelEdits = () => {
    setEditingMode(false);
    setEditedTokens(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="mw-6xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Arquitecto de Identidad Visual</DialogTitle>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              Arquitecto de Identidad Visual
            </CardTitle>
            <div className="flex items-center gap-2">
              {identityDesign && (
                <Badge
                  className={cn(
                    "flex items-center gap-1",
                    isDesignApproved
                      ? "bg-success/15 text-success"
                      : "bg-warn/15 text-warn",
                  )}
                >
                  {isDesignApproved ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Aprobado
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3 w-3" />
                      Pendiente
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Directivas */}
          <div>
            <Label className="text-base font-medium">
              Directivas de Diseño
            </Label>
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-foreground">{directives}</p>
            </div>
          </div>

          {/* Generar Diseño */}
          {!identityDesign && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Generar Identidad Visual
              </h3>
              <p className="text-muted-foreground mb-6">
                Basado en tus directivas, la IA creará una propuesta de colores
                y tipografías
              </p>
              <Button
                onClick={handleGenerateDesign}
                disabled={isDesigning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isDesigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Palette className="h-4 w-4 mr-2" />
                    Generar Diseño
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progreso */}
          {isDesigning && designProgress && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {designProgress.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {designProgress.current} / {designProgress.total}
                </span>
              </div>
              <Progress
                value={(designProgress.current / designProgress.total) * 100}
                className="w-full"
              />
            </div>
          )}

          {/* Vista del Diseño */}
          {identityDesign && !editingMode && (
            <div className="space-y-6">
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
                        backgroundColor: identityDesign.colorPalette.primary,
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
                        backgroundColor: identityDesign.colorPalette.secondary,
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
                          fontFamily: identityDesign.typography.heading.font,
                          fontWeight: "700",
                        }}
                      >
                        <p className="text-2xl">Título Principal</p>
                      </div>
                      <div
                        style={{
                          fontFamily: identityDesign.typography.heading.font,
                          fontWeight: "600",
                        }}
                      >
                        <p className="text-xl">Subtítulo Importante</p>
                      </div>
                      <div
                        style={{
                          fontFamily: identityDesign.typography.heading.font,
                          fontWeight: "500",
                        }}
                      >
                        <p className="text-lg">Título Secundario</p>
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
                        Texto normal para párrafos y contenido general.
                      </p>
                      <p className="text-sm font-medium">
                        Texto medio para énfasis ligero.
                      </p>
                      <p className="text-sm font-semibold">
                        Texto destacado para importancia.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div>
                <Label className="text-base font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Justificación del Diseño
                </Label>
                <div className="mt-3 space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Colores</h4>
                    <p className="text-sm text-muted-foreground">
                      {identityDesign.rationale.colors}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Tipografía</h4>
                    <p className="text-sm text-muted-foreground">
                      {identityDesign.rationale.typography}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">
                      Concepto General
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {identityDesign.rationale.overall}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-4 border-t">
                {!isDesignApproved && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleStartEditing}
                      disabled={isDesigning}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Ajustar Diseño
                    </Button>
                    <Button
                      onClick={onApproveDesign}
                      disabled={isDesigning}
                      className="bg-success hover:bg-success"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aprobar Diseño
                    </Button>
                  </>
                )}
                {isDesignApproved && (
                  <Badge className="bg-success/15 text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Diseño Aprobado - Listo para generar planos omnicanal
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Modo Edición */}
          {editingMode && editedTokens && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">
                  Ajustar Tokens de Diseño
                </Label>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">Color Primario</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="primary-color"
                        type="color"
                        value={editedTokens.primary}
                        onChange={(e) =>
                          setEditedTokens({
                            ...editedTokens,
                            primary: e.target.value,
                          })
                        }
                        className="w-16 h-10"
                      />
                      <Input
                        value={editedTokens.primary}
                        onChange={(e) =>
                          setEditedTokens({
                            ...editedTokens,
                            primary: e.target.value,
                          })
                        }
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary-color">Color Secundario</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={editedTokens.secondary}
                        onChange={(e) =>
                          setEditedTokens({
                            ...editedTokens,
                            secondary: e.target.value,
                          })
                        }
                        className="w-16 h-10"
                      />
                      <Input
                        value={editedTokens.secondary}
                        onChange={(e) =>
                          setEditedTokens({
                            ...editedTokens,
                            secondary: e.target.value,
                          })
                        }
                        placeholder="#F3F4F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accent-color">Color Acento</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="accent-color"
                        type="color"
                        value={editedTokens.accent}
                        onChange={(e) =>
                          setEditedTokens({
                            ...editedTokens,
                            accent: e.target.value,
                          })
                        }
                        className="w-16 h-10"
                      />
                      <Input
                        value={editedTokens.accent}
                        onChange={(e) =>
                          setEditedTokens({
                            ...editedTokens,
                            accent: e.target.value,
                          })
                        }
                        placeholder="#10B981"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="heading-font">Fuente Titulares</Label>
                    <Input
                      id="heading-font"
                      value={editedTokens.fontHeading}
                      onChange={(e) =>
                        setEditedTokens({
                          ...editedTokens,
                          fontHeading: e.target.value,
                        })
                      }
                      placeholder="Inter"
                    />
                  </div>
                  <div>
                    <Label htmlFor="body-font">Fuente Cuerpo</Label>
                    <Input
                      id="body-font"
                      value={editedTokens.fontBody}
                      onChange={(e) =>
                        setEditedTokens({
                          ...editedTokens,
                          fontBody: e.target.value,
                        })
                      }
                      placeholder="Inter"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelEdits}
                  disabled={isDesigning}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdits}
                  disabled={isDesigning}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isDesigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Aplicar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Cerrar */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isDesigning}>
              Cerrar
            </Button>
          </div>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
