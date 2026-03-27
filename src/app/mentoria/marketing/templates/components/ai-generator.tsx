'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  ChevronRight
} from 'lucide-react';
import { AIHealthState, GenerationOptions, SocialTarget } from '../types/template-types';
import { cn } from '@/lib/utils';

interface AIGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string, directives: string) => Promise<boolean>;
  aiHealth: AIHealthState;
  isGenerating: boolean;
  generationProgress: { current: number; total: number; label: string } | null;
  enabledChannels: GenerationOptions;
  socialTargets: Record<string, SocialTarget>;
  onChannelsChange: (channels: Partial<GenerationOptions>) => void;
  onSocialTargetsChange: (platform: string, targets: Partial<SocialTarget>) => void;
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
  onNavigateDesign: (direction: 'next' | 'prev') => void;
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
  socialTargets,
  onChannelsChange,
  onSocialTargetsChange,
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
  hasPrevDesign
}: AIGeneratorProps) {
  const [campaignName, setCampaignName] = useState('');
  const [directives, setDirectives] = useState('');
  const [activeTab, setActiveTab] = useState('config');

  if (!isOpen) return null;

  const handleGenerateDesign = async () => {
    if (!directives.trim()) {
      return;
    }
    
    const design = await onGenerateDesign(directives);
    if (design) {
      setActiveTab('design');
    }
  };

  const handleGenerateFinal = async () => {
    if (!campaignName.trim() || !directives.trim() || !isDesignApproved) {
      return;
    }

    const success = await onGenerate(campaignName, directives);
    if (success) {
      setCampaignName('');
      setDirectives('');
      setActiveTab('config');
      onClose();
    }
  };

  const getHealthBadge = () => {
    switch (aiHealth.status) {
      case 'healthy':
        return (
          <Badge className="bg-green-100 text-green-800">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Saludable
          </Badge>
        );
      case 'checking':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Verificando
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Circle className="h-3 w-3 mr-1" />
            Desconocido
          </Badge>
        );
    }
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
                disabled={aiHealth.status === 'checking'}
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
              <TabsTrigger value="design" disabled={!directives.trim()} className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Diseño Visual
                {identityDesign && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
              </TabsTrigger>
              <TabsTrigger value="generate" disabled={!isDesignApproved} className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Generar Planos
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Configuración */}
            <TabsContent value="config" className="space-y-6">
              {/* Información de salud */}
              {aiHealth.status !== 'healthy' && (
                <div className={cn(
                  "p-4 rounded-lg",
                  aiHealth.status === 'error' ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"
                )}>
                  <div className="flex items-center gap-2">
                    {aiHealth.status === 'error' ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      aiHealth.status === 'error' ? "text-red-800" : "text-blue-800"
                    )}>
                      {aiHealth.message || 'Verificando estado del servicio...'}
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

              {/* Canales habilitados */}
              <div>
                <Label className="text-base font-medium">Canales a Generar</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {[
                    { key: 'landings', label: 'Landing Pages', icon: LayoutTemplate },
                    { key: 'emails', label: 'Emails', icon: Mail },
                    { key: 'socials', label: 'Redes Sociales', icon: Instagram },
                    { key: 'ads', label: 'Anuncios', icon: Megaphone }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={enabledChannels[key as keyof GenerationOptions]}
                        onCheckedChange={(checked) => 
                          onChannelsChange({ [key]: checked as boolean })
                        }
                        disabled={isGenerating}
                      />
                      <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuración de redes sociales */}
              {enabledChannels.socials && (
                <div>
                  <Label className="text-base font-medium">Configuración de Redes Sociales</Label>
                  <div className="space-y-3 mt-2">
                    {Object.entries(socialTargets).map(([platform, targets]) => (
                      <div key={platform} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <PlatformIcon platform={platform} />
                          <span className="font-medium capitalize">{platform}</span>
                          <Checkbox
                            checked={targets.enabled}
                            onCheckedChange={(checked) =>
                              onSocialTargetsChange(platform, { enabled: checked as boolean })
                            }
                            disabled={isGenerating}
                          />
                        </div>
                        
                        {targets.enabled && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {Object.entries(targets).filter(([key]) => key !== 'enabled').map(([type, count]) => (
                              <div key={type} className="flex items-center gap-1">
                                <Label htmlFor={`${platform}-${type}`} className="text-xs capitalize">
                                  {type.replace('_', ' ')}:
                                </Label>
                                <Input
                                  id={`${platform}-${type}`}
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={count as number}
                                  onChange={(e) =>
                                    onSocialTargetsChange(platform, { 
                                      [type]: parseInt(e.target.value) || 0 
                                    })
                                  }
                                  className="h-6 w-12 text-xs"
                                  disabled={isGenerating}
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
                  disabled={!directives.trim() || isGenerating || aiHealth.status !== 'healthy'}
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
                        onClick={() => onNavigateDesign('prev')}
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
                        onClick={() => onNavigateDesign('next')}
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
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentDesignIndex
                            ? 'bg-blue-600'
                            : 'bg-gray-300'
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
                          className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                          style={{ backgroundColor: identityDesign.colorPalette.primary }}
                        />
                        <p className="text-sm font-medium">Primario</p>
                        <p className="text-xs text-gray-600">{identityDesign.colorPalette.primary}</p>
                      </div>
                      <div className="text-center">
                        <div 
                          className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                          style={{ backgroundColor: identityDesign.colorPalette.secondary }}
                        />
                        <p className="text-sm font-medium">Secundario</p>
                        <p className="text-xs text-gray-600">{identityDesign.colorPalette.secondary}</p>
                      </div>
                      <div className="text-center">
                        <div 
                          className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                          style={{ backgroundColor: identityDesign.colorPalette.accent }}
                        />
                        <p className="text-sm font-medium">Acento</p>
                        <p className="text-xs text-gray-600">{identityDesign.colorPalette.accent}</p>
                      </div>
                      <div className="text-center">
                        <div className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2 bg-gradient-to-r from-gray-100 to-gray-300"/>
                        <p className="text-sm font-medium">Neutros</p>
                        <p className="text-xs text-gray-600">4 tonos</p>
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
                          <div style={{ fontFamily: identityDesign.typography.heading.font, fontWeight: '700' }}>
                            <p className="text-2xl">Título Principal</p>
                          </div>
                          <div style={{ fontFamily: identityDesign.typography.heading.font, fontWeight: '600' }}>
                            <p className="text-xl">Subtítulo Importante</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Cuerpo de Texto</h4>
                        <div className="space-y-2" style={{ fontFamily: identityDesign.typography.body.font }}>
                          <p className="text-base font-normal">Texto normal para párrafos.</p>
                          <p className="text-sm font-medium">Texto medio para énfasis.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del Tab 2 */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('config')}
                        disabled={isDesigning}
                      >
                        Atrás
                      </Button>
                    </div>
                    <Button
                      onClick={onApproveDesign}
                      disabled={isDesigning}
                      className="bg-green-600 hover:bg-green-700"
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
                  <Palette className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sin Diseño Generado</h3>
                  <p className="text-gray-600 mb-6">Primero completa la configuración y genera la identidad visual</p>
                  <Button onClick={() => setActiveTab('config')}>
                    Volver a Configuración
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Generación Final */}
            <TabsContent value="generate" className="space-y-6">
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-50 rounded-full">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Listo para Generar Planos Omnicanal
                </h3>
                <p className="text-gray-600 mb-6">
                  Con la identidad visual aprobada, podemos generar los planos para todos los canales configurados
                </p>
                
                {/* Resumen de la configuración */}
                <div className="bg-gray-50 p-6 rounded-lg text-left mb-6">
                  <h4 className="font-medium mb-4">Resumen de la Campaña:</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombre:</strong> {campaignName}</p>
                      <p><strong>Canales:</strong> {Object.entries(enabledChannels).filter(([_, enabled]) => enabled).map(([key]) => key).join(', ')}</p>
                    </div>
                    <div>
                      <p><strong>Color Primario:</strong> {identityDesign?.colorPalette.primary}</p>
                      <p><strong>Tipografía:</strong> {identityDesign?.typography.heading.font}</p>
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
                    <span className="text-sm font-medium">Generando Planos...</span>
                    <span className="text-sm text-gray-600">
                      {generationProgress.current} / {generationProgress.total}
                    </span>
                  </div>
                  <Progress 
                    value={(generationProgress.current / generationProgress.total) * 100} 
                    className="w-full" 
                  />
                  <p className="text-sm text-gray-600">{generationProgress.label}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
