'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateCollection } from '../types/template-types';
import { SocialMockup, LandingMockup, EmailMockup, AdMockup } from './template-mockups';

interface TemplateViewerProductionProps {
  collection: TemplateCollection | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCollection?: (updatedCollection: TemplateCollection) => void;
}

export const TemplateViewerProduction = ({ collection, isOpen, onClose, onUpdateCollection }: TemplateViewerProductionProps) => {
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [pendingRefinement, setPendingRefinement] = useState<any>(null);

  // Funciones de edición
  const handleOpenEditVariant = (variant: any, channel: string, index: number) => {
    // Asegurar que designTokens exista y tenga valores por defecto
    const variantWithTokens = {
      ...variant,
      designTokens: {
        primary: variant.designTokens?.primary || '#3B2D86',
        secondary: variant.designTokens?.secondary || '#F0EEF6',
        accent: variant.designTokens?.accent || '#2680E5',
        fontHeading: variant.designTokens?.fontHeading || 'Space Grotesk',
        fontBody: variant.designTokens?.fontBody || 'Inter',
        ...variant.designTokens
      }
    };

    setEditingVariant(variantWithTokens);
    setEditingChannel(channel);
    setEditingIndex(index);
    setIsEditVariantOpen(true); // Abrir editor modal en producción
  };

  const handleCloseEditModal = () => {
    setIsEditVariantOpen(false);
    setEditingVariant(null);
    setEditingChannel('');
    setEditingIndex(-1);
  };

  const handleSaveEdit = () => {
    if (!editingVariant || editingIndex === -1 || !collection) return;

    // Guardar los cambios en la colección real
    const updatedCollection = { ...collection };

    // Actualizar el variant específico según el canal
    if (editingChannel === 'landing' && updatedCollection.assets?.landings) {
      updatedCollection.assets.landings[editingIndex] = editingVariant;
    } else if (editingChannel === 'email' && updatedCollection.assets?.emails) {
      updatedCollection.assets.emails[editingIndex] = editingVariant;
    } else if (editingChannel === 'social' && updatedCollection.assets?.socials) {
      updatedCollection.assets.socials[editingIndex] = editingVariant;
    } else if (editingChannel === 'ads' && updatedCollection.assets?.ads) {
      updatedCollection.assets.ads[editingIndex] = editingVariant;
    }

    // Actualizar el estado de la colección usando la función de actualización
    if (onUpdateCollection) {
      onUpdateCollection(updatedCollection);
    }

    // Cerrar modal
    handleCloseEditModal();

    // Mostrar feedback
    alert('¡Cambios guardados exitosamente!');
  };

  const handleRefineVariantAI = async (channel: string, variant: any, index: number) => {
    setIsRefining(`${channel}-${index}`);
    try {
      setTimeout(() => {
        setPendingRefinement({
          variant: { ...variant, headline: `${variant.headline} (Refinado)` },
          explanation: "He analizado tu variante y propongo ajustes para mejorar el impacto visual y la conversión.",
          channel,
          index
        });
        setIsRefining(null);
      }, 2000);
    } catch (e) {
      console.error('Error al refinar con IA:', e);
      setIsRefining(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'twitter': return <Twitter className="h-4 w-4 text-blue-400" />;
      case 'tiktok': return <Megaphone className="h-4 w-4 text-black" />;
      case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-700" />;
      default: return <Instagram className="h-4 w-4" />;
    }
  };

  const totalTemplates = Object.values(collection?.assets || {}).reduce(
    (total: number, channel: any) => total + (Array.isArray(channel) ? channel.length : 0),
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">{collection?.name || 'Colección de Templates'}</DialogTitle>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{collection?.name || 'Colección de Templates'}</h2>
                {collection && (
                  <div className="flex gap-8 text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      {collection.assets?.landings?.length || 0} Landings
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      {collection.assets?.emails?.length || 0} Emails
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      {(collection.assets?.socials?.length || 0)} Social
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                      {collection.assets?.ads?.length || 0} Ads
                    </span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white hover:bg-white/20">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content con solapas y sub-solapas */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="landing" className="w-full">
            <TabsList className="bg-white p-1 rounded-xl border shadow-sm flex-wrap h-auto px-8 mb-4">
              {collection?.assets?.landings && <TabsTrigger value="landing" className="rounded-lg px-6 font-bold">Landings</TabsTrigger>}
              {collection?.assets?.emails && <TabsTrigger value="email" className="rounded-lg px-6 font-bold">Emails</TabsTrigger>}
              {collection?.assets?.socials && <TabsTrigger value="social" className="rounded-lg px-6 font-bold">Social</TabsTrigger>}
              {collection?.assets?.ads && <TabsTrigger value="ads" className="rounded-lg px-6 font-bold">Ads</TabsTrigger>}
            </TabsList>

            <div className="p-6">
              {collection && (
                <>
                  {/* Landings Tab con sub-solapas - SIN TÍTULO */}
                  <TabsContent value="landing" className="m-0 space-y-4">
                    <Tabs defaultValue={collection?.assets?.landings?.[0] ? `landing-0` : ""} className="w-full">
                      <TabsList className="bg-white p-1 rounded-xl border shadow-sm flex-wrap h-auto px-4">
                        {collection?.assets?.landings?.map((l: any, lIdx: number) => (
                          <TabsTrigger
                            key={lIdx}
                            value={`landing-${lIdx}`}
                            className="rounded-lg px-4 font-bold text-sm"
                          >
                            Landing {lIdx + 1}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {collection?.assets?.landings?.map((l: any, lIdx: number) => (
                        <TabsContent key={lIdx} value={`landing-${lIdx}`} className="mt-4">
                          <Card className="overflow-hidden">
                            <CardContent className="p-0">
                              <LandingMockup template={l} index={lIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditVariant(l, 'landing', lIdx)}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRefineVariantAI('landing', l, lIdx)}
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
                        </TabsContent>
                      ))}
                    </Tabs>
                  </TabsContent>

                  {/* Emails Tab con sub-solapas - SIN TÍTULO */}
                  <TabsContent value="email" className="m-0 space-y-4">
                    <Tabs defaultValue={collection?.assets?.emails?.[0] ? `email-0` : ""} className="w-full">
                      <TabsList className="bg-white p-1 rounded-xl border shadow-sm flex-wrap h-auto px-4">
                        {collection?.assets?.emails?.map((e: any, eIdx: number) => (
                          <TabsTrigger
                            key={eIdx}
                            value={`email-${eIdx}`}
                            className="rounded-lg px-4 font-bold text-sm"
                          >
                            Email {eIdx + 1}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {collection?.assets?.emails?.map((e: any, eIdx: number) => (
                        <TabsContent key={eIdx} value={`email-${eIdx}`} className="mt-4">
                          <Card className="overflow-hidden">
                            <CardContent className="p-0">
                              <EmailMockup template={e} index={eIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditVariant(e, 'email', eIdx)}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRefineVariantAI('email', e, eIdx)}
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
                        </TabsContent>
                      ))}
                    </Tabs>
                  </TabsContent>

                  {/* Social Tab con sub-solapas por plataforma - SIN TÍTULO */}
                  <TabsContent value="social" className="m-0 space-y-4">
                    <Tabs defaultValue="instagram" className="w-full">
                      <TabsList className="bg-white p-1 rounded-xl border shadow-sm flex-wrap h-auto px-4">
                        <TabsTrigger value="instagram" className="rounded-lg px-4 font-bold text-sm">
                          Instagram
                        </TabsTrigger>
                        <TabsTrigger value="twitter" className="rounded-lg px-4 font-bold text-sm">
                          Twitter
                        </TabsTrigger>
                        <TabsTrigger value="linkedin" className="rounded-lg px-4 font-bold text-sm">
                          LinkedIn
                        </TabsTrigger>
                        <TabsTrigger value="tiktok" className="rounded-lg px-4 font-bold text-sm">
                          TikTok
                        </TabsTrigger>
                      </TabsList>

                      {/* Instagram Sub-solapas */}
                      <TabsContent value="instagram" className="mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {collection?.assets?.socials?.filter((s: any) => s.platform === 'instagram').map((s: any, sIdx: number) => (
                            <Card key={sIdx} className="overflow-hidden">
                              <CardContent className="p-0">
                                <SocialMockup variant={s} index={sIdx} />
                              </CardContent>
                              <div className="p-4 border-t">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditVariant(s, 'social', sIdx)}
                                    className="rounded-xl font-bold h-8 px-4 text-xs"
                                  >
                                    <Settings2 className="h-3 w-3 mr-1" /> Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRefineVariantAI('social', s, sIdx)}
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
                      </TabsContent>

                      {/* Twitter Sub-solapas */}
                      <TabsContent value="twitter" className="mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {collection?.assets?.socials?.filter((s: any) => s.platform === 'twitter').map((s: any, sIdx: number) => (
                            <Card key={sIdx} className="overflow-hidden">
                              <CardContent className="p-0">
                                <SocialMockup variant={s} index={sIdx} />
                              </CardContent>
                              <div className="p-4 border-t">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditVariant(s, 'social', sIdx)}
                                    className="rounded-xl font-bold h-8 px-4 text-xs"
                                  >
                                    <Settings2 className="h-3 w-3 mr-1" /> Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRefineVariantAI('social', s, sIdx)}
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
                      </TabsContent>

                      {/* LinkedIn Sub-solapas */}
                      <TabsContent value="linkedin" className="mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {collection?.assets?.socials?.filter((s: any) => s.platform === 'linkedin').map((s: any, sIdx: number) => (
                            <Card key={sIdx} className="overflow-hidden">
                              <CardContent className="p-0">
                                <SocialMockup variant={s} index={sIdx} />
                              </CardContent>
                              <div className="p-4 border-t">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditVariant(s, 'social', sIdx)}
                                    className="rounded-xl font-bold h-8 px-4 text-xs"
                                  >
                                    <Settings2 className="h-3 w-3 mr-1" /> Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRefineVariantAI('social', s, sIdx)}
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
                      </TabsContent>

                      {/* TikTok Sub-solapas */}
                      <TabsContent value="tiktok" className="mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {collection?.assets?.socials?.filter((s: any) => s.platform === 'tiktok').map((s: any, sIdx: number) => (
                            <Card key={sIdx} className="overflow-hidden">
                              <CardContent className="p-0">
                                <SocialMockup variant={s} index={sIdx} />
                              </CardContent>
                              <div className="p-4 border-t">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditVariant(s, 'social', sIdx)}
                                    className="rounded-xl font-bold h-8 px-4 text-xs"
                                  >
                                    <Settings2 className="h-3 w-3 mr-1" /> Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRefineVariantAI('social', s, sIdx)}
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
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  {/* Ads Tab con sub-solapas - SIN TÍTULO */}
                  <TabsContent value="ads" className="m-0 space-y-4">
                    <Tabs defaultValue={collection?.assets?.ads?.[0] ? `ad-0` : ""} className="w-full">
                      <TabsList className="bg-white p-1 rounded-xl border shadow-sm flex-wrap h-auto px-4">
                        {collection?.assets?.ads?.map((a: any, aIdx: number) => (
                          <TabsTrigger
                            key={aIdx}
                            value={`ad-${aIdx}`}
                            className="rounded-lg px-4 font-bold text-sm"
                          >
                            Anuncio {aIdx + 1}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {collection?.assets?.ads?.map((a: any, aIdx: number) => (
                        <TabsContent key={aIdx} value={`ad-${aIdx}`} className="mt-4">
                          <Card className="overflow-hidden">
                            <CardContent className="p-0">
                              <AdMockup template={a} index={aIdx} />
                            </CardContent>
                            <div className="p-4 border-t">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditVariant(a, 'ad', aIdx)}
                                  className="rounded-xl font-bold h-8 px-4 text-xs"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRefineVariantAI('ad', a, aIdx)}
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
                        </TabsContent>
                      ))}
                    </Tabs>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>

      {/* Editor Modal - Ajustes de Blueprint como en la versión 1 */}
      <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
        <DialogTitle className="text-2xl font-bold">Ajustes de Blueprint</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Ajusta los tokens de diseño, tipografías y colores para este template
        </DialogDescription>
        <DialogContent className="max-w-2xl">
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-10">
              <section className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contexto Técnico</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/10 rounded-xl">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Canal</p>
                    <p className="text-sm font-bold capitalize">{editingChannel}</p>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-xl">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Estrategia / Tipo</p>
                    <p className="text-sm font-bold capitalize">{(editingVariant?.type || '').replace('_', ' ')}</p>
                  </div>
                </div>
              </section>

              {editingChannel === 'landing' && (
                <section className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Densidad Académica</Label>
                  <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                    <div>
                      <p className="text-xs font-bold">Cantidad de Secciones</p>
                      <p className="text-[9px] text-muted-foreground uppercase">Minimal (1-3), Balanced (3-5), Detailed (5-7)</p>
                    </div>
                    <Input type="number" className="w-20 h-10 font-black text-center bg-white border-none" value={editingVariant?.sectionCount || 0} onChange={e => setEditingVariant({ ...editingVariant, sectionCount: parseInt(e.target.value) || 0 })} />
                  </div>
                </section>
              )}

              {editingChannel === 'social' && (
                <section className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estructura del Formato</Label>
                  <div className="p-4 bg-secondary/10 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold">
                          {editingVariant?.type === 'thread' ? 'Cantidad de Tweets' :
                            (editingVariant?.type === 'carousel' || editingVariant?.type === 'document') ? 'Cantidad de Placas' : 'Profundidad de Contenido'}
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase">Ajuste técnico para la API de {editingVariant?.platform}</p>
                      </div>
                      <Input
                        type="number"
                        className="w-20 h-10 font-black text-center bg-white border-none"
                        value={editingVariant?.slideCount || 0}
                        onChange={e => setEditingVariant({ ...editingVariant, slideCount: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Type className="h-4 w-4" /> ADN Tipográfico Universal</h4>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Fuente Títulos (Heading)</Label>
                    <Input
                      value={editingVariant?.designTokens?.fontHeading || 'Space Grotesk'}
                      onChange={e => setEditingVariant({
                        ...editingVariant,
                        designTokens: {
                          ...editingVariant.designTokens,
                          fontHeading: e.target.value
                        }
                      })}
                      className="h-12 rounded-xl bg-secondary/10 border-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Fuente Lectura (Body)</Label>
                    <Input
                      value={editingVariant?.designTokens?.fontBody || 'Inter'}
                      onChange={e => setEditingVariant({
                        ...editingVariant,
                        designTokens: {
                          ...editingVariant.designTokens,
                          fontBody: e.target.value
                        }
                      })}
                      className="h-12 rounded-xl bg-secondary/10 border-none font-bold"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Palette className="h-4 w-4" /> Paleta Maestra</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'primary', label: 'Primario' },
                    { id: 'secondary', label: 'Fondo' },
                    { id: 'accent', label: 'Acento' }
                  ].map(c => (
                    <div key={c.id} className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">{c.label}</Label>
                      <div className="flex flex-col items-center gap-2">
                        <Input
                          type="color"
                          className="w-12 h-12 p-0 border-none rounded-xl cursor-pointer shadow-md"
                          value={editingVariant?.designTokens?.[c.id] || '#000000'}
                          onChange={e => setEditingVariant({
                            ...editingVariant,
                            designTokens: {
                              ...editingVariant.designTokens,
                              [c.id]: e.target.value
                            }
                          })
                          }
                        />
                        <Input
                          value={editingVariant?.designTokens?.[c.id] || '#000000'}
                          className="text-[10px] h-8 font-mono text-center"
                          onChange={e => setEditingVariant({
                            ...editingVariant,
                            designTokens: {
                              ...editingVariant.designTokens,
                              [c.id]: e.target.value
                            }
                          })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-2xl bg-primary">
                {isSavingEdit ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />} Guardar Ajustes del Blueprint
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
