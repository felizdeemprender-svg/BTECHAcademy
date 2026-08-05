"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateCollection } from "../types/template-types";
import {
  SocialMockup,
  LandingMockup,
  EmailMockup,
  AdMockup,
} from "./template-mockups";

interface TemplateViewerProductionProps {
  collection: TemplateCollection | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateViewerProduction = ({
  collection,
  isOpen,
  onClose,
}: TemplateViewerProductionProps) => {
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [pendingRefinement, setPendingRefinement] = useState<any>(null);

  // Funciones de edición
  const handleOpenEditVariant = (
    variant: any,
    channel: string,
    index: number,
  ) => {
    setEditingVariant({ ...variant });
    setEditingChannel(channel);
    setEditingIndex(index);
    setIsEditVariantOpen(false); // Edición inline, sin sidebar
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">
        {collection?.name || "Colección de Templates"}
      </DialogTitle>
      <DialogContent className="mw-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-white px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {collection?.name || "Colección de Templates"}
                </h2>
                {collection && (
                  <div className="flex gap-8 text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                      {collection.assets?.landings?.length || 0} Landings
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      {collection.assets?.emails?.length || 0} Emails
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      {collection.assets?.socials?.length || 0} Social
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                      {collection.assets?.ads?.length || 0} Ads
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {collection && (
              <div className="space-y-8">
                {/* Landings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Landing Pages</h3>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 border-blue-200"
                    >
                      {collection.assets?.landings?.length || 0} Landings
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collection?.assets?.landings?.map(
                      (l: any, lIdx: number) => (
                        <Card key={lIdx} className="overflow-hidden">
                          <CardContent className="p-0">
                          <div className="flex justify-center w-full h-[600px] overflow-hidden bg-muted rounded-b-3xl">
                             <iframe 
                               src={`/v/${collection.id}?v=${lIdx}&preview=true`} 
                               className="w-full h-[calc(600px*1.28)] origin-top-left"
                              style={{ transform: 'scale(0.78125)', border: 'none' }}
                              title={`Preview Variante ${lIdx + 1}`}
                            />
                          </div>
                          </CardContent>
                          <div className="p-4 border-t">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenEditVariant(l, "landing", lIdx)
                                }
                                className="rounded-xl font-bold h-8 px-4 text-xs"
                              >
                                <Settings2 className="h-3 w-3 mr-1" /> Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleRefineVariantAI("landing", l, lIdx)
                                }
                                disabled={isRefining === `landing-${lIdx}`}
                                className="rounded-xl font-bold h-8 px-4 text-xs"
                              >
                                {isRefining === `landing-${lIdx}` ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3 mr-1" />
                                )}
                                IA
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ),
                    )}
                  </div>
                </div>

                {/* Emails */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Emails</h3>
                    <Badge
                      variant="secondary"
                      className="bg-danger/15 text-danger border-danger/20"
                    >
                      {collection.assets?.emails?.length || 0} Emails
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collection?.assets?.emails?.map((e: any, eIdx: number) => (
                      <Card key={eIdx} className="overflow-hidden">
                        <CardContent className="p-0">
                          <EmailMockup template={e} index={eIdx} />
                        </CardContent>
                        <div className="p-4 border-t">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenEditVariant(e, "email", eIdx)
                              }
                              className="rounded-xl font-bold h-8 px-4 text-xs"
                            >
                              <Settings2 className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRefineVariantAI("email", e, eIdx)
                              }
                              disabled={isRefining === `email-${eIdx}`}
                              className="rounded-xl font-bold h-8 px-4 text-xs"
                            >
                              {isRefining === `email-${eIdx}` ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3 mr-1" />
                              )}
                              IA
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Social Media */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Social Media</h3>
                    <div className="flex gap-4">
                      <Badge
                        variant="secondary"
                        className="bg-primary/15 text-foreground border-primary/20"
                      >
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "instagram",
                        ).length || 0}{" "}
                        Instagram
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 border-blue-200"
                      >
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "twitter",
                        ).length || 0}{" "}
                        Twitter
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-blue-700 text-white border-blue-800"
                      >
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "linkedin",
                        ).length || 0}{" "}
                        LinkedIn
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-black text-white border-muted-foreground"
                      >
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "tiktok",
                        ).length || 0}{" "}
                        TikTok
                      </Badge>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-pink-600">
                        Instagram
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "instagram",
                        ).length || 0}{" "}
                        posts
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {collection?.assets?.socials
                        ?.filter((s: any) => s.platform === "instagram")
                        .map((s: any, sIdx: number) => (
                          <Card key={sIdx} className="overflow-hidden">
                            <CardContent className="p-0">
                              <SocialMockup variant={s} index={sIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenEditVariant(s, "social", sIdx)
                                  }
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleRefineVariantAI("social", s, sIdx)
                                  }
                                  disabled={isRefining === `social-${sIdx}`}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  {isRefining === `social-${sIdx}` ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1" />
                                  )}
                                  IA
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {/* Twitter */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-blue-400">
                        Twitter
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "twitter",
                        ).length || 0}{" "}
                        posts
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {collection?.assets?.socials
                        ?.filter((s: any) => s.platform === "twitter")
                        .map((s: any, sIdx: number) => (
                          <Card key={sIdx} className="overflow-hidden">
                            <CardContent className="p-0">
                              <SocialMockup variant={s} index={sIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenEditVariant(s, "social", sIdx)
                                  }
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleRefineVariantAI("social", s, sIdx)
                                  }
                                  disabled={isRefining === `social-${sIdx}`}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  {isRefining === `social-${sIdx}` ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1" />
                                  )}
                                  IA
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-blue-700">
                        LinkedIn
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "linkedin",
                        ).length || 0}{" "}
                        posts
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {collection?.assets?.socials
                        ?.filter((s: any) => s.platform === "linkedin")
                        .map((s: any, sIdx: number) => (
                          <Card key={sIdx} className="overflow-hidden">
                            <CardContent className="p-0">
                              <SocialMockup variant={s} index={sIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenEditVariant(s, "social", sIdx)
                                  }
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleRefineVariantAI("social", s, sIdx)
                                  }
                                  disabled={isRefining === `social-${sIdx}`}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  {isRefining === `social-${sIdx}` ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1" />
                                  )}
                                  IA
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-black">
                        TikTok
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {collection.assets?.socials?.filter(
                          (s: any) => s.platform === "tiktok",
                        ).length || 0}{" "}
                        posts
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {collection?.assets?.socials
                        ?.filter((s: any) => s.platform === "tiktok")
                        .map((s: any, sIdx: number) => (
                          <Card key={sIdx} className="overflow-hidden">
                            <CardContent className="p-0">
                              <SocialMockup variant={s} index={sIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenEditVariant(s, "social", sIdx)
                                  }
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleRefineVariantAI("social", s, sIdx)
                                  }
                                  disabled={isRefining === `social-${sIdx}`}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  {isRefining === `social-${sIdx}` ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 mr-1" />
                                  )}
                                  IA
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Ads */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Anuncios</h3>
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 border-orange-200"
                    >
                      {collection.assets?.ads?.length || 0} Anuncios
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collection?.assets?.ads?.map((a: any, aIdx: number) => (
                      <Card key={aIdx} className="overflow-hidden">
                        <CardContent className="p-0">
                          <AdMockup template={a} index={aIdx} />
                        </CardContent>
                        <div className="p-4 border-t">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenEditVariant(a, "ad", aIdx)
                              }
                              className="rounded-xl font-bold h-8 px-4 text-xs"
                            >
                              <Settings2 className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRefineVariantAI("ad", a, aIdx)
                              }
                              disabled={isRefining === `ad-${aIdx}`}
                              className="rounded-xl font-bold h-8 px-4 text-xs"
                            >
                              {isRefining === `ad-${aIdx}` ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3 mr-1" />
                              )}
                              IA
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
