'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Layers, 
  X, 
  Palette, 
  Type, 
  Save, 
  RefreshCw,
  Eye,
  LayoutTemplate,
  Settings2,
  Sparkles,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  Mail,
  Instagram,
  Megaphone,
  Twitter,
  Linkedin,
  Edit3,
  Copy,
  Download
} from 'lucide-react';
import { TemplateCollection } from '../types/template-types';

interface TemplateViewerProductionProps {
  collection: TemplateCollection | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (template: any, type: string) => void;
  onRefine?: (template: any, type: string) => void;
}

export function TemplateViewerProduction({ 
  collection, 
  isOpen, 
  onClose, 
  onEdit, 
  onRefine
}: TemplateViewerProductionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Estados de edición - como en el original
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editingChannel, setEditingChannel] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [pendingRefinement, setPendingRefinement] = useState<{
    variant: any;
    explanation: string;
    channel: string;
    index: number;
  } | null>(null);

  if (!collection) return null;

  // Funciones de edición - como en el original
  const handleOpenEditVariant = (variant: any, channel: string, index: number) => {
    setEditingVariant({ ...variant });
    setEditingChannel(channel);
    setEditingIndex(index);
    setIsEditVariantOpen(true);
  };

  const handleSaveVariantEdit = async () => {
    if (!collection || !editingVariant || editingIndex === -1) return;
    setIsSavingEdit(true);
    try {
      const channelKey = editingChannel + 's' as keyof typeof collection.assets;
      const newAssets = { ...collection.assets };
      if (Array.isArray(newAssets[channelKey])) {
        newAssets[channelKey]![editingIndex] = editingVariant;
      }
      
      // Actualizar colección
      const updatedCollection = {
        ...collection,
        assets: newAssets,
        updatedAt: new Date()
      };
      
      // Por ahora, solo logueamos el cambio
      console.log('Colección actualizada:', updatedCollection);
      
      setIsEditVariantOpen(false);
    } catch (e) {
      console.error('Error al guardar cambios:', e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRefineVariantAI = async (channel: string, variant: any, index: number) => {
    setIsRefining(`${channel}-${index}`);
    try {
      // Aquí iría la lógica de refinamiento con IA
      // Por ahora, simulamos una propuesta
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

  const applyRefinement = async () => {
    if (!collection || !pendingRefinement) return;
    setIsSavingEdit(true);
    try {
      const { variant, channel, index } = pendingRefinement;
      const channelKey = channel + 's' as keyof typeof collection.assets;
      const newAssets = { ...collection.assets };
      if (Array.isArray(newAssets[channelKey])) {
        newAssets[channelKey]![index] = variant;
      }
      
      const updatedCollection = {
        ...collection,
        assets: newAssets,
        updatedAt: new Date()
      };
      
      // Por ahora, solo logueamos el cambio
      console.log('Refinamiento aplicado:', updatedCollection);
      
      setPendingRefinement(null);
    } catch (e) {
      console.error('Error al aplicar refinamiento:', e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'emails': return <Mail className="h-4 w-4" />;
      case 'socials': return <Instagram className="h-4 w-4" />;
      case 'ads': return <Megaphone className="h-4 w-4" />;
      case 'landings': return <LayoutTemplate className="h-4 w-4" />;
      default: return <LayoutTemplate className="h-4 w-4" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'twitter': return <Twitter className="h-4 w-4 text-blue-400" />;
      case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-700" />;
      case 'tiktok': return <Megaphone className="h-4 w-4 text-black" />;
      default: return <Instagram className="h-4 w-4" />;
    }
  };

  const renderTemplateCard = (template: any, type: string, index: number) => {
    const isThisRefining = isRefining === `${type}-${index}`;
    
    return (
      <Card 
        key={`${type}-${index}`}
        className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-primary/20"
        onClick={() => setSelectedTemplate({ template, type, index })}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getChannelIcon(type)}
              <CardTitle className="text-lg capitalize">
                {type} {index + 1}
              </CardTitle>
              {template.platform && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {getPlatformIcon(template.platform)}
                  {template.platform}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Eye className="h-3 w-3" />
              </Button>
              {onEdit && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Landing Pages */}
          {type === 'landings' && (
            <div className="space-y-2">
              <h4 className="font-bold text-lg">{template.headline}</h4>
              <p className="text-sm text-gray-600">{template.subheadline}</p>
              <div className="flex gap-2">
                <Badge variant="secondary">{template.ctaText}</Badge>
                <Badge variant="outline">{template.sectionCount} secciones</Badge>
              </div>
            </div>
          )}

          {/* Emails */}
          {type === 'emails' && (
            <div className="space-y-2">
              <h4 className="font-semibold">{template.subject}</h4>
              <p className="text-sm text-gray-600 italic">{template.preheader}</p>
              <div className="bg-gray-50 p-2 rounded text-xs max-h-16 overflow-y-auto">
                {template.body?.substring(0, 100)}...
              </div>
            </div>
          )}

          {/* Social Media */}
          {type === 'socials' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {template.platform && getPlatformIcon(template.platform)}
                <Badge variant="outline">{template.type}</Badge>
              </div>
              <p className="font-semibold text-blue-600 text-sm">{template.hook}</p>
              <p className="text-xs text-gray-600">{template.caption?.substring(0, 80)}...</p>
              {template.hashtags && (
                <div className="flex flex-wrap gap-1">
                  {template.hashtags.slice(0, 3).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ads */}
          {type === 'ads' && (
            <div className="space-y-2">
              <div className="space-y-1">
                {template.headlines?.slice(0, 2).map((headline: string, i: number) => (
                  <p key={i} className="text-sm bg-gray-50 p-2 rounded">
                    {headline}
                  </p>
                ))}
              </div>
              <div className="space-y-1">
                {template.descriptions?.slice(0, 1).map((desc: string, i: number) => (
                  <p key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {desc}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Botones de edición como en el original */}
        <div className="flex justify-end gap-3 p-4 bg-white/40 backdrop-blur-sm rounded-[1.5rem] border border-primary/5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenEditVariant(template, type, index)}
            className="rounded-xl font-bold h-10 px-6 border-slate-200 text-slate-600 gap-2 shadow-sm transition-all hover:bg-white"
          >
            <Settings2 className="h-4 w-4" /> Ajustar Blueprint
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleRefineVariantAI(type, template, index)} 
            disabled={!!isThisRefining} 
            className="rounded-xl font-bold h-10 px-6 border-accent/20 text-accent gap-2 shadow-sm transition-all"
          >
            {isThisRefining ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />} Refinar con IA
          </Button>
        </div>
      </Card>
    );
  };

  const renderTemplateDetail = (template: any, type: string) => {
    switch (type) {
      case 'landings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">{template.headline}</h3>
              <p className="text-lg text-gray-600">{template.subheadline}</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">{template.ctaText}</Badge>
              <Badge variant="outline" className="text-sm px-3 py-1">{template.sectionCount} secciones</Badge>
            </div>
            {template.designTokens && (
              <div className="space-y-3">
                <h4 className="font-semibold">Design Tokens</h4>
                <div className="flex gap-3">
                  <div 
                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                    style={{ backgroundColor: template.designTokens.primary }}
                    title="Primary"
                  />
                  <div 
                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                    style={{ backgroundColor: template.designTokens.secondary }}
                    title="Secondary"
                  />
                  <div 
                    className="w-16 h-16 rounded-lg border-2 border-gray-200"
                    style={{ backgroundColor: template.designTokens.accent }}
                    title="Accent"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'emails':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold">{template.subject}</h3>
              <p className="text-sm text-gray-600 italic mt-1">{template.preheader}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="whitespace-pre-wrap text-sm">{template.body}</div>
            </div>
          </div>
        );

      case 'socials':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {template.platform && getPlatformIcon(template.platform)}
              <Badge variant="outline" className="text-sm">{template.type}</Badge>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{template.hook}</p>
              <p className="text-gray-700 mt-2">{template.caption}</p>
            </div>
            {template.hashtags && (
              <div className="space-y-2">
                <h4 className="font-semibold">Hashtags</h4>
                <div className="flex flex-wrap gap-2">
                  {template.hashtags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'ads':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Headlines</h3>
              <div className="space-y-2">
                {template.headlines.map((headline: string, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded border">
                    {i + 1}. {headline}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Descriptions</h3>
              <div className="space-y-2">
                {template.descriptions.map((desc: string, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded border">
                    {i + 1}. {desc}
                  </div>
                ))}
              </div>
            </div>
            {template.keywords && (
              <div>
                <h3 className="font-semibold mb-3">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {template.keywords.map((keyword: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>Template no disponible</div>;
    }
  };

  const totalTemplates = Object.values(collection.assets || {}).reduce(
    (total: number, channel: any) => total + (Array.isArray(channel) ? channel.length : 0), 
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-8 text-white shrink-0 relative">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">{collection.name}</DialogTitle>
                <DialogDescription className="text-primary-foreground/70 font-medium">
                  Blueprints de Diseño Omnicanal
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="rounded-full text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 bg-transparent border-b rounded-none h-auto p-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Overview
              </TabsTrigger>
              <TabsTrigger value="landings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Landings
              </TabsTrigger>
              <TabsTrigger value="emails" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Emails
              </TabsTrigger>
              <TabsTrigger value="socials" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Social
              </TabsTrigger>
              <TabsTrigger value="ads" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Ads
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 flex min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <Card className="text-center p-4">
                        <div className="text-2xl font-bold text-primary">{totalTemplates}</div>
                        <div className="text-sm text-gray-600">Total Templates</div>
                      </Card>
                      <Card className="text-center p-4">
                        <div className="text-2xl font-bold text-green-600">
                          {collection.assets?.landings?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Landings</div>
                      </Card>
                      <Card className="text-center p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {collection.assets?.emails?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Emails</div>
                      </Card>
                      <Card className="text-center p-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {(collection.assets?.socials?.length || 0) + (collection.assets?.ads?.length || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Social & Ads</div>
                      </Card>
                    </div>

                    {collection.designTokens && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Design Tokens Aplicados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-6">
                            <div className="flex gap-3">
                              <div 
                                className="w-12 h-12 rounded-lg border-2 border-gray-200"
                                style={{ backgroundColor: collection.designTokens.primary }}
                                title="Primary"
                              />
                              <div 
                                className="w-12 h-12 rounded-lg border-2 border-gray-200"
                                style={{ backgroundColor: collection.designTokens.secondary }}
                                title="Secondary"
                              />
                              <div 
                                className="w-12 h-12 rounded-lg border-2 border-gray-200"
                                style={{ backgroundColor: collection.designTokens.accent }}
                                title="Accent"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Tipografía: {collection.designTokens.fontHeading} / {collection.designTokens.fontBody}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Landings Tab */}
                  <TabsContent value="landings" className="mt-0">
                    <div className="grid gap-4">
                      {collection.assets?.landings?.map((template: any, index: number) => 
                        renderTemplateCard(template, 'landings', index)
                      )}
                    </div>
                  </TabsContent>

                  {/* Emails Tab */}
                  <TabsContent value="emails" className="mt-0">
                    <div className="grid gap-4">
                      {collection.assets?.emails?.map((template: any, index: number) => 
                        renderTemplateCard(template, 'emails', index)
                      )}
                    </div>
                  </TabsContent>

                  {/* Social Tab */}
                  <TabsContent value="socials" className="mt-0">
                    <div className="grid gap-4">
                      {collection.assets?.socials?.map((template: any, index: number) => 
                        renderTemplateCard(template, 'socials', index)
                      )}
                    </div>
                  </TabsContent>

                  {/* Ads Tab */}
                  <TabsContent value="ads" className="mt-0">
                    <div className="grid gap-4">
                      {collection.assets?.ads?.map((template: any, index: number) => 
                        renderTemplateCard(template, 'ads', index)
                      )}
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              {/* Template Detail Sidebar */}
              {selectedTemplate && (
                <div className="w-96 border-l bg-gray-50 p-6 overflow-y-auto">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold capitalize">
                        {selectedTemplate.type} {selectedTemplate.index + 1}
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {renderTemplateDetail(selectedTemplate.template, selectedTemplate.type)}

                    <div className="flex gap-2 pt-4 border-t">
                      {onEdit && (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      )}
                      {onRefine && (
                        <Button size="sm" variant="outline" className="flex-1">
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
                </div>
              )}
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t shrink-0">
          <Button onClick={onClose} variant="outline" className="rounded-xl font-bold h-12 px-10 border-2">
            Cerrar Catálogo
          </Button>
        </div>
      {/* Modal de Edición - Como en el Original */}
        <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
          <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-slate-900 p-8 text-white relative">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <SlidersHorizontal className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">Ajustes del Blueprint</DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Modifica los parámetros técnicos y el ADN visual de esta variante.
              </DialogDescription>
            </div>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-10">
                {/* Contexto Técnico */}
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
                        {(editingVariant?.type || '').replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Densidad Académica para Landings */}
                {editingChannel === 'landing' && (
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
                        onChange={e => setEditingVariant({
                          ...editingVariant, 
                          sectionCount: parseInt(e.target.value) || 0
                        })} 
                      />
                    </div>
                  </section>
                )}
                
                {/* Estructura para Social */}
                {editingChannel === 'social' && (
                  <section className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                      Estructura del Formato
                    </Label>
                    <div className="p-4 bg-secondary/10 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold">
                            {editingVariant?.type === 'thread' ? 'Cantidad de Tweets' : 
                             (editingVariant?.type === 'carousel' || editingVariant?.type === 'document') ? 'Cantidad de Placas' : 
                             'Profundidad de Contenido'}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase">
                            Ajuste técnico para la API de {editingVariant?.platform}
                          </p>
                        </div>
                        <Input 
                          type="number" 
                          className="w-20 h-10 font-black text-center bg-white border-none" 
                          value={editingVariant?.slideCount || 0} 
                          onChange={e => setEditingVariant({
                            ...editingVariant, 
                            slideCount: parseInt(e.target.value) || 0
                          })} 
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* ADN Tipográfico Universal */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Type className="h-4 w-4" /> 
                    ADN Tipográfico Universal
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                        Fuente Títulos (Heading)
                      </Label>
                      <Input 
                        value={editingVariant?.designTokens?.fontHeading} 
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
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                        Fuente Lectura (Body)
                      </Label>
                      <Input 
                        value={editingVariant?.designTokens?.fontBody} 
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

                {/* Paleta Maestra */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Palette className="h-4 w-4" /> 
                    Paleta Maestra
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'primary', label: 'Primario' },
                      { id: 'secondary', label: 'Fondo' },
                      { id: 'accent', label: 'Acento' }
                    ].map(c => (
                      <div key={c.id} className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                          {c.label}
                        </Label>
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
                            })} 
                          />
                          <Input 
                            value={editingVariant?.designTokens?.[c.id]} 
                            className="text-[10px] h-8 font-mono text-center" 
                            onChange={e => setEditingVariant({
                              ...editingVariant, 
                              designTokens: { 
                                ...editingVariant.designTokens, 
                                [c.id]: e.target.value 
                              }
                            })} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                
                {/* Botón de Guardado */}
                <Button 
                  onClick={handleSaveVariantEdit} 
                  disabled={isSavingEdit} 
                  className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-2xl bg-primary"
                >
                  {isSavingEdit ? 
                    <Loader2 className="animate-spin mr-2" /> 
                  : 
                    <Save className="mr-2 h-5 w-5" />
                  } 
                  Guardar Ajustes del Blueprint
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Modal de Propuesta de Refinamiento */}
        <Dialog open={!!pendingRefinement} onOpenChange={open => !open && setPendingRefinement(null)}>
          <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-slate-900 p-8 text-white relative">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Propuesta de Refinamiento IA
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Gemini ha analizado tu variante y propone los siguientes ajustes estratégicos.
              </DialogDescription>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Eye className="h-3 w-3" /> 
                  Explicación de las Mejoras
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                  "{pendingRefinement?.explanation}"
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-start">
                <Settings2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 font-medium">
                  Al aplicar, se actualizarán los design tokens y la estructura técnica de esta variante específica basándose en las directivas de campaña.
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
                  {isSavingEdit ? 
                    <Loader2 className="animate-spin mr-2" /> 
                    : 
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  }
                  Aplicar Mejoras Proactivas
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
