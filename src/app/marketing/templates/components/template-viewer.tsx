"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronRight,
  Copy,
  RefreshCw,
} from "lucide-react";
import { TemplateCollection } from "../types/template-types";
import { cn } from "@/lib/utils";

interface TemplateViewerProps {
  collection: TemplateCollection;
  onEdit?: (template: any, type: string) => void;
  onRefine?: (template: any, type: string) => void;
}

export function TemplateViewer({
  collection,
  onEdit,
  onRefine,
}: TemplateViewerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(
    new Set(),
  );

  // Contar templates por tipo
  const templateCounts = useMemo(() => {
    const counts = {
      landings: 0,
      emails: 0,
      socials: 0,
      ads: 0,
      total: 0,
    };

    if (collection.assets) {
      counts.landings = collection.assets.landings?.length || 0;
      counts.emails = collection.assets.emails?.length || 0;
      counts.socials = collection.assets.socials?.length || 0;
      counts.ads = collection.assets.ads?.length || 0;
      counts.total =
        counts.landings + counts.emails + counts.socials + counts.ads;
    }

    return counts;
  }, [collection]);

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

  const toggleTemplateExpansion = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  const renderTemplateCard = (template: any, type: string, index: number) => {
    const templateId = `${type}-${index}`;
    const isExpanded = expandedTemplates.has(templateId);

    return (
      <Card key={templateId} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getChannelIcon(type)}
              <CardTitle className="text-lg capitalize">
                {template.type || type} {index + 1}
              </CardTitle>
              {template.platform && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {getPlatformIcon(template.platform)}
                  {template.platform}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleTemplateExpansion(templateId)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {isExpanded ? "Ocultar" : "Ver"}
              </Button>
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(template, type)}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              )}
              {onRefine && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRefine(template, type)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refinar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Landing Pages */}
            {type === "landings" && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Headline:</h4>
                  <p className="text-lg font-bold">{template.headline}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Subheadline:</h4>
                  <p className="text-muted-foreground">{template.subheadline}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">CTA:</h4>
                  <Badge variant="secondary">{template.ctaText}</Badge>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Secciones:</h4>
                  <Badge variant="outline">
                    {template.sectionCount} secciones
                  </Badge>
                </div>
                {template.designTokens && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">
                      Design Tokens:
                    </h4>
                    <div className="flex gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          backgroundColor: template.designTokens.primary,
                        }}
                        title="Primary"
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          backgroundColor: template.designTokens.secondary,
                        }}
                        title="Secondary"
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          backgroundColor: template.designTokens.accent,
                        }}
                        title="Accent"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Emails */}
            {type === "emails" && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Asunto:</h4>
                  <p className="font-semibold">{template.subject}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Preheader:</h4>
                  <p className="text-sm text-muted-foreground italic">
                    {template.preheader}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Cuerpo:</h4>
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                    {template.body}
                  </div>
                </div>
              </div>
            )}

            {/* Social Media */}
            {type === "socials" && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Hook/Gancho:</h4>
                  <p className="font-semibold text-blue-600">{template.hook}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Caption:</h4>
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                    {template.caption}
                  </div>
                </div>
                {template.hashtags && template.hashtags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground">Hashtags:</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.hashtags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {template.slides && (
                  <div>
                    <h4 className="font-medium text-foreground">
                      Slides/Fragmentos:
                    </h4>
                    <Badge variant="outline">
                      {template.slides.length} slides
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Ads */}
            {type === "ads" && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Headlines:</h4>
                  <div className="space-y-1">
                    {template.headlines.map((headline: string, i: number) => (
                      <div key={i} className="bg-muted p-2 rounded text-sm">
                        {i + 1}. {headline}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Descriptions:</h4>
                  <div className="space-y-1">
                    {template.descriptions.map((desc: string, i: number) => (
                      <div key={i} className="bg-muted p-2 rounded text-sm">
                        {i + 1}. {desc}
                      </div>
                    ))}
                  </div>
                </div>
                {template.keywords && template.keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground">Keywords:</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.keywords.map((keyword: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 pt-3 border-t">
              <Button size="sm" variant="outline">
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Exportar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (!collection.assets) {
    return (
      <div className="bg-muted p-6 rounded-lg text-center">
        <p className="text-muted-foreground">
          Esta colección no tiene templates generados aún.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{collection.name}</h3>
          <p className="text-muted-foreground">{collection.directives}</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {templateCounts.total}
            </div>
            <div className="text-sm text-muted-foreground">Templates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {
                Object.entries(templateCounts).filter(
                  ([key, count]) => key !== "total" && count > 0,
                ).length
              }
            </div>
            <div className="text-sm text-muted-foreground">Canales</div>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="landings" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Landings ({templateCounts.landings})
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails ({templateCounts.emails})
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Social & Ads ({templateCounts.socials + templateCounts.ads})
          </TabsTrigger>
        </TabsList>

        {/* Tab Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(templateCounts)
              .filter(([key]) => key !== "total")
              .map(
                ([channel, count]) =>
                  count > 0 && (
                    <Card key={channel} className="text-center">
                      <CardContent className="pt-6">
                        <div className="flex justify-center mb-2">
                          {getChannelIcon(channel)}
                        </div>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {channel}
                        </div>
                      </CardContent>
                    </Card>
                  ),
              )}
          </div>

          {collection.designTokens && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Identidad Visual Aplicada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded-lg border-2"
                      style={{
                        backgroundColor: collection.designTokens.primary,
                      }}
                      title="Primary"
                    />
                    <div
                      className="w-12 h-12 rounded-lg border-2"
                      style={{
                        backgroundColor: collection.designTokens.secondary,
                      }}
                      title="Secondary"
                    />
                    <div
                      className="w-12 h-12 rounded-lg border-2"
                      style={{
                        backgroundColor: collection.designTokens.accent,
                      }}
                      title="Accent"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Tipografía:</strong>{" "}
                      {collection.designTokens.fontHeading} /{" "}
                      {collection.designTokens.fontBody}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Landings */}
        <TabsContent value="landings">
          {collection.assets.landings &&
            collection.assets.landings.length > 0 ? (
            collection.assets.landings.map((template: any, index: number) =>
              renderTemplateCard(template, "landings", index),
            )
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No hay landing pages generadas
            </div>
          )}
        </TabsContent>

        {/* Tab Emails */}
        <TabsContent value="emails">
          {collection.assets.emails && collection.assets.emails.length > 0 ? (
            collection.assets.emails.map((template: any, index: number) =>
              renderTemplateCard(template, "emails", index),
            )
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No hay emails generados
            </div>
          )}
        </TabsContent>

        {/* Tab Social & Ads */}
        <TabsContent value="content" className="space-y-6">
          {/* Social Media */}
          {collection.assets.socials &&
            collection.assets.socials.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Instagram className="h-5 w-5" />
                  Social Media ({collection.assets.socials.length})
                </h3>
                {collection.assets.socials.map((template: any, index: number) =>
                  renderTemplateCard(template, "socials", index),
                )}
              </div>
            )}

          {/* Ads */}
          {collection.assets.ads && collection.assets.ads.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Anuncios ({collection.assets.ads.length})
              </h3>
              {collection.assets.ads.map((template: any, index: number) =>
                renderTemplateCard(template, "ads", index),
              )}
            </div>
          )}

          {!collection.assets.socials?.length &&
            !collection.assets.ads?.length && (
              <div className="text-center text-muted-foreground py-8">
                No hay contenido de social media o anuncios generados
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
