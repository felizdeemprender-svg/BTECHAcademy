"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Edit3,
  Download,
  Mail,
  Instagram,
  Twitter,
  Linkedin,
  LayoutTemplate,
  Megaphone,
  Copy,
  RefreshCw,
  X,
  Search,
  Grid,
  List,
} from "lucide-react";
import { TemplateCollection } from "../types/template-types";
import { cn } from "@/lib/utils";

interface TemplateViewerModalProps {
  collection: TemplateCollection | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (template: any, type: string) => void;
  onRefine?: (template: any, type: string) => void;
}

export function TemplateViewerModal({
  collection,
  isOpen,
  onClose,
  onEdit,
  onRefine,
}: TemplateViewerModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Contar templates por tipo
  const templateCounts = useMemo(() => {
    if (!collection?.assets)
      return { landings: 0, emails: 0, socials: 0, ads: 0, total: 0 };

    const counts = {
      landings: collection.assets.landings?.length || 0,
      emails: collection.assets.emails?.length || 0,
      socials: collection.assets.socials?.length || 0,
      ads: collection.assets.ads?.length || 0,
      total: 0,
    };

    counts.total =
      counts.landings + counts.emails + counts.socials + counts.ads;
    return counts;
  }, [collection]);

  // Obtener todos los templates como lista plana
  const allTemplates = useMemo(() => {
    if (!collection?.assets) return [];

    const templates: Array<{ template: any; type: string; index: number }> = [];

    if (collection.assets.landings) {
      collection.assets.landings.forEach((template: any, index: number) => {
        templates.push({ template, type: "landings", index });
      });
    }

    if (collection.assets.emails) {
      collection.assets.emails.forEach((template: any, index: number) => {
        templates.push({ template, type: "emails", index });
      });
    }

    if (collection.assets.socials) {
      collection.assets.socials.forEach((template: any, index: number) => {
        templates.push({ template, type: "socials", index });
      });
    }

    if (collection.assets.ads) {
      collection.assets.ads.forEach((template: any, index: number) => {
        templates.push({ template, type: "ads", index });
      });
    }

    return templates;
  }, [collection]);

  // Filtrar templates
  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates;

    // Filtrar por tipo
    if (selectedType !== "all") {
      filtered = filtered.filter((t) => t.type === selectedType);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter((t) => {
        const template = t.template;
        const searchLower = searchTerm.toLowerCase();

        return (
          (template.headline &&
            template.headline.toLowerCase().includes(searchLower)) ||
          (template.subject &&
            template.subject.toLowerCase().includes(searchLower)) ||
          (template.caption &&
            template.caption.toLowerCase().includes(searchLower)) ||
          (template.hook &&
            template.hook.toLowerCase().includes(searchLower)) ||
          (template.type &&
            template.type.toLowerCase().includes(searchLower)) ||
          (template.platform &&
            template.platform.toLowerCase().includes(searchLower))
        );
      });
    }

    return filtered;
  }, [allTemplates, selectedType, searchTerm]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "emails":
        return <Mail className="h-4 w-4" />;
      case "socials":
        return <Instagram className="h-4 w-4" />;
      case "ads":
        return <Megaphone className="h-4 w-4" />;
      case "landings":
        return <LayoutTemplate className="h-4 w-4" />;
      default:
        return <LayoutTemplate className="h-4 w-4" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case "twitter":
        return <Twitter className="h-4 w-4 text-blue-400" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-blue-700" />;
      case "tiktok":
        return <Megaphone className="h-4 w-4 text-black" />;
      default:
        return <Instagram className="h-4 w-4" />;
    }
  };

  const renderTemplateContent = (template: any, type: string) => {
    switch (type) {
      case "landings":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-lg">{template.headline}</h4>
              <p className="text-gray-600">{template.subheadline}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{template.ctaText}</Badge>
              <Badge variant="outline">{template.sectionCount} secciones</Badge>
            </div>
            {template.designTokens && (
              <div className="flex gap-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: template.designTokens.primary }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: template.designTokens.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: template.designTokens.accent }}
                  title="Accent"
                />
              </div>
            )}
          </div>
        );

      case "emails":
        return (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold">{template.subject}</h4>
              <p className="text-sm text-gray-600 italic">
                {template.preheader}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
              {template.body}
            </div>
          </div>
        );

      case "socials":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {template.platform && getPlatformIcon(template.platform)}
              <Badge variant="outline">{template.type}</Badge>
            </div>
            <div>
              <p className="font-semibold text-blue-600">{template.hook}</p>
              <p className="text-sm mt-1">{template.caption}</p>
            </div>
            {template.hashtags && (
              <div className="flex flex-wrap gap-1">
                {template.hashtags.slice(0, 3).map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {template.hashtags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{template.hashtags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        );

      case "ads":
        return (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold">Headlines:</h4>
              <div className="space-y-1">
                {template.headlines
                  .slice(0, 2)
                  .map((headline: string, i: number) => (
                    <p key={i} className="text-sm bg-gray-50 p-2 rounded">
                      {headline}
                    </p>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold">Descriptions:</h4>
              <div className="space-y-1">
                {template.descriptions
                  .slice(0, 2)
                  .map((desc: string, i: number) => (
                    <p key={i} className="text-sm bg-gray-50 p-2 rounded">
                      {desc}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Template no disponible</div>;
    }
  };

  const renderTemplateCard = ({
    template,
    type,
    index,
  }: {
    template: any;
    type: string;
    index: number;
  }) => {
    const isSelected =
      selectedTemplate?.template === template &&
      selectedTemplate?.type === type;

    return (
      <Card
        key={`${type}-${index}`}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-blue-500 bg-blue-50",
          viewMode === "grid" ? "" : "flex items-center gap-4",
        )}
        onClick={() => setSelectedTemplate({ template, type, index })}
      >
        <CardContent className={cn("p-4", viewMode === "grid" ? "" : "flex-1")}>
          <div
            className={cn(
              "flex items-start gap-3",
              viewMode === "grid" ? "flex-col" : "",
            )}
          >
            <div className="flex items-center gap-2">
              {getChannelIcon(type)}
              <span className="font-medium capitalize">{type}</span>
              {template.platform && (
                <Badge variant="outline" className="text-xs">
                  {template.platform}
                </Badge>
              )}
            </div>

            <div className={cn("flex-1", viewMode === "grid" ? "mt-2" : "")}>
              {renderTemplateContent(template, type)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!collection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {collection.name}
              </DialogTitle>
              <p className="text-gray-600 mt-1">{collection.directives}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(90vh-8rem)]">
          {/* Sidebar - Lista de Templates */}
          <div className="w-1/3 border-r bg-gray-50">
            <div className="p-4 space-y-4">
              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {templateCounts.total}
                  </div>
                  <div className="text-xs text-gray-600">Templates</div>
                </div>
                <div className="bg-white p-3 rounded text-center">
                  <div className="text-lg font-bold text-green-600">
                    {
                      Object.entries(templateCounts).filter(
                        ([key, count]) => key !== "total" && count > 0,
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-600">Canales</div>
                </div>
              </div>

              {/* Filtros */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="flex-1 text-sm border rounded-md px-2 py-1"
                  >
                    <option value="all">Todos</option>
                    <option value="landings">
                      Landings ({templateCounts.landings})
                    </option>
                    <option value="emails">
                      Emails ({templateCounts.emails})
                    </option>
                    <option value="socials">
                      Social ({templateCounts.socials})
                    </option>
                    <option value="ads">Ads ({templateCounts.ads})</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                  >
                    {viewMode === "grid" ? (
                      <List className="h-4 w-4" />
                    ) : (
                      <Grid className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Lista de Templates */}
              <ScrollArea className="h-[calc(100%-12rem)]">
                <div
                  className={cn(
                    "space-y-2",
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-2"
                      : "space-y-2",
                  )}
                >
                  {filteredTemplates.map(({ template, type, index }) =>
                    renderTemplateCard({ template, type, index }),
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Panel Principal - Detalle del Template */}
          <div className="flex-1 flex flex-col">
            {selectedTemplate ? (
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {getChannelIcon(selectedTemplate.type)}
                    <h2 className="text-xl font-semibold capitalize">
                      {selectedTemplate.type} {selectedTemplate.index + 1}
                    </h2>
                    {selectedTemplate.template.platform && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {getPlatformIcon(selectedTemplate.template.platform)}
                        {selectedTemplate.template.platform}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onEdit(
                            selectedTemplate.template,
                            selectedTemplate.type,
                          )
                        }
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    )}
                    {onRefine && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onRefine(
                            selectedTemplate.template,
                            selectedTemplate.type,
                          )
                        }
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refinar
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      Exportar
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  {renderTemplateContent(
                    selectedTemplate.template,
                    selectedTemplate.type,
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Selecciona un template para ver su contenido</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
