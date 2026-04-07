'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Palette,
  Type,
  Save,
  RefreshCw,
  Eye,
  LayoutTemplate
} from 'lucide-react';

interface LandingEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
  onSave: (updatedTemplate: any) => void;
  designTokens?: any;
}

export function LandingEditor({
  isOpen,
  onClose,
  template,
  onSave,
  designTokens
}: LandingEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState(template || {});
  const [editedTokens, setEditedTokens] = useState(designTokens || {});
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');

  // Inicializar cuando cambia el template
  useState(() => {
    if (template) {
      setEditedTemplate({ ...template });
    }
    if (designTokens) {
      setEditedTokens({ ...designTokens });
    }
  });

  const handleSave = () => {
    onSave({
      ...editedTemplate,
      designTokens: editedTokens
    });
    onClose();
  };

  const updateTemplateField = (field: string, value: any) => {
    setEditedTemplate((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateDesignToken = (token: string, value: string) => {
    setEditedTokens((prev: any) => ({
      ...prev,
      [token]: value
    }));
  };

  const presetColors = {
    primary: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    secondary: ['#F3F4F6', '#FEF3C7', '#DBEAFE', '#F3E8FF', '#FEE2E2', '#D1FAE5'],
    accent: ['#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED', '#BE185D']
  };

  const fonts = {
    heading: ['Inter', 'Lexend', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display'],
    body: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans Pro', 'Nunito']
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <LayoutTemplate className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Editor de Landing Page</DialogTitle>
                <p className="text-sm text-gray-600">Personaliza contenido y diseño visual</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            <Type className="h-4 w-4 mr-2 inline" />
            Contenido
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'design'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            <Palette className="h-4 w-4 mr-2 inline" />
            Diseño
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab de Contenido */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contenido Principal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="headline">Headline Principal</Label>
                    <Input
                      id="headline"
                      value={editedTemplate.headline || ''}
                      onChange={(e) => updateTemplateField('headline', e.target.value)}
                      placeholder="Ej: Transforma tu negocio con IA"
                      className="text-lg font-semibold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subheadline">Subheadline</Label>
                    <Textarea
                      id="subheadline"
                      value={editedTemplate.subheadline || ''}
                      onChange={(e) => updateTemplateField('subheadline', e.target.value)}
                      placeholder="Ej: La plataforma definitiva para mentores que quieren escalar"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cta">Texto del CTA</Label>
                    <Input
                      id="cta"
                      value={editedTemplate.ctaText || ''}
                      onChange={(e) => updateTemplateField('ctaText', e.target.value)}
                      placeholder="Ej: Comenzar Gratis"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sections">Número de Secciones</Label>
                    <Input
                      id="sections"
                      type="number"
                      value={editedTemplate.sectionCount || 5}
                      onChange={(e) => updateTemplateField('sectionCount', parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Vista Previa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
                    <h1
                      className="text-3xl font-bold mb-3"
                      style={{ color: editedTokens.primary }}
                    >
                      {editedTemplate.headline || 'Tu Headline Aquí'}
                    </h1>
                    <p className="text-lg text-gray-600 mb-6">
                      {editedTemplate.subheadline || 'Tu subheadline descriptiva aquí...'}
                    </p>
                    <button
                      className="px-6 py-3 rounded-lg font-semibold text-white"
                      style={{ backgroundColor: editedTokens.accent }}
                    >
                      {editedTemplate.ctaText || 'Call to Action'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab de Diseño */}
          {activeTab === 'design' && (
            <div className="space-y-6">
              {/* Colores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Paleta de Colores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Color Primary */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Color Primario</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={editedTokens.primary || '#3B82F6'}
                        onChange={(e) => updateDesignToken('primary', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={editedTokens.primary || '#3B82F6'}
                        onChange={(e) => updateDesignToken('primary', e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {presetColors.primary.map(color => (
                        <button
                          key={color}
                          onClick={() => updateDesignToken('primary', color)}
                          className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Color Secondary */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Color Secundario</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={editedTokens.secondary || '#F3F4F6'}
                        onChange={(e) => updateDesignToken('secondary', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={editedTokens.secondary || '#F3F4F6'}
                        onChange={(e) => updateDesignToken('secondary', e.target.value)}
                        placeholder="#F3F4F6"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {presetColors.secondary.map(color => (
                        <button
                          key={color}
                          onClick={() => updateDesignToken('secondary', color)}
                          className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Color Accent */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Color de Acento</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={editedTokens.accent || '#10B981'}
                        onChange={(e) => updateDesignToken('accent', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={editedTokens.accent || '#10B981'}
                        onChange={(e) => updateDesignToken('accent', e.target.value)}
                        placeholder="#10B981"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {presetColors.accent.map(color => (
                        <button
                          key={color}
                          onClick={() => updateDesignToken('accent', color)}
                          className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tipografía */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Tipografía
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fontHeading">Fuente para Títulos</Label>
                    <select
                      id="fontHeading"
                      value={editedTokens.fontHeading || 'Inter'}
                      onChange={(e) => updateDesignToken('fontHeading', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {fonts.heading.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="fontBody">Fuente para Cuerpo</Label>
                    <select
                      id="fontBody"
                      value={editedTokens.fontBody || 'Inter'}
                      onChange={(e) => updateDesignToken('fontBody', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {fonts.body.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Preview de Diseño */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview de Diseño</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div
                        className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                        style={{ backgroundColor: editedTokens.primary }}
                      />
                      <p className="text-xs font-medium">Primary</p>
                      <p className="text-xs text-gray-500">{editedTokens.primary}</p>
                    </div>
                    <div className="text-center">
                      <div
                        className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                        style={{ backgroundColor: editedTokens.secondary }}
                      />
                      <p className="text-xs font-medium">Secondary</p>
                      <p className="text-xs text-gray-500">{editedTokens.secondary}</p>
                    </div>
                    <div className="text-center">
                      <div
                        className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                        style={{ backgroundColor: editedTokens.accent }}
                      />
                      <p className="text-xs font-medium">Accent</p>
                      <p className="text-xs text-gray-500">{editedTokens.accent}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ fontFamily: editedTokens.fontHeading, color: editedTokens.primary }}
                    >
                      Título de Ejemplo
                    </h3>
                    <p
                      className="text-sm"
                      style={{ fontFamily: editedTokens.fontBody }}
                    >
                      Texto de ejemplo con la tipografía seleccionada para el cuerpo del contenido.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setEditedTemplate(template || {});
              setEditedTokens(designTokens || {});
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetear
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
