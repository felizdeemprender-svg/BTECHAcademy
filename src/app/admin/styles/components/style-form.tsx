'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LandingStyle, LandingStyleSection, StyleGroup, StyleTokens, STYLE_GROUP_LABELS, TOKEN_LABELS, TOKEN_DESCRIPTIONS, StyleBrand, TypographyVariant, ColorPalette } from '@/lib/landing-styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useFirebase } from '@/firebase/provider';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sectionSchema = z.object({
  id: z.string().min(1, 'Requerido'),
  name: z.string().min(1, 'Requerido'),
  description: z.string(),
  blueprint: z.string(),
  required: z.boolean(),
  isRepeatable: z.boolean().optional(),
  contentType: z.enum(['text', 'video', 'image', 'mixed', 'interactive'])
});

const typographySchema = z.object({
  name: z.string(),
  headingScale: z.number().min(0.5).max(3),
  bodyScale: z.number().min(0.5).max(3),
  headingFont: z.string(),
  bodyFont: z.string()
});

const colorPaletteSchema = z.object({
  name: z.string(),
  primary: z.string(),
  secondary: z.string(),
  accent: z.string()
});

const styleBrandSchema = z.object({
  name: z.string().min(1, 'El nombre del brand es requerido'),
  description: z.string().optional(),
  tokens: z.object({
    componentRadius: z.string(),
    componentBorder: z.string(),
    componentShadow: z.string(),
    componentBg: z.string(),
    sectionPadding: z.string(),
    contentGap: z.string(),
    transitionDuration: z.string(),
    themeMode: z.enum(['light', 'dark', 'glass']),
  }),
  typography: z.object({
    name: z.string(),
    headingScale: z.number().min(0.5).max(3),
    bodyScale: z.number().min(0.5).max(3),
    headingFont: z.string(),
    bodyFont: z.string()
  }),
  palette: z.object({
    name: z.string(),
    primary: z.string(),
    secondary: z.string(),
    accent: z.string()
  })
});

const styleSchema = z.object({
  id: z.string().min(1, 'El ID es requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string(),
  thumbnail: z.string(),
  group: z.enum(['storytelling', 'corporate', 'high-ticket', 'promo']),
  allowedSubscriptions: z.array(z.string()).default(['free']),
  aiWriterPersona: z.string().default(''),
  layout: z.enum(['centered', 'split', 'full-width', 'grid', 'asymmetric']),
  tokens: z.object({
    componentRadius: z.string(),
    componentBorder: z.string(),
    componentShadow: z.string(),
    componentBg: z.string(),
    sectionPadding: z.string(),
    contentGap: z.string(),
    transitionDuration: z.string(),
    themeMode: z.enum(['light', 'dark', 'glass']),
  }),
  typography: z.array(typographySchema),
  brands: z.array(styleBrandSchema).optional(),
  aiDirectives: z.string().min(10, 'Las directivas son importantes para la IA'),
  availableSections: z.array(sectionSchema),
  colorProposals: z.array(colorPaletteSchema)
});

type StyleFormValues = z.infer<typeof styleSchema>;

interface StyleFormProps {
  initialData: LandingStyle | null;
  isCloning?: boolean;
  onClose: () => void;
}

export default function StyleForm({ initialData, isCloning, onClose }: StyleFormProps) {
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Valores por defecto
  const defaultValues: Partial<StyleFormValues> = initialData ? {
    ...initialData,
    id: isCloning ? '' : initialData.id
  } : {
    id: '',
    name: '',
    description: '',
    thumbnail: '/styles/placeholder.png',
    group: 'storytelling',
    layout: 'centered',
    tokens: {
      componentRadius: '6px',
      componentBorder: '1px solid var(--border)',
      componentShadow: 'none',
      componentBg: 'var(--surface)',
      sectionPadding: '96px',
      contentGap: '16px',
      transitionDuration: '150ms',
      themeMode: 'light',
    },
    typography: [
      { name: 'Moderna', headingScale: 1.1, bodyScale: 1, headingFont: 'Inter', bodyFont: 'Inter' }
    ],
    brands: [
      {
        name: 'Default',
        description: 'Brand por defecto del estilo',
        tokens: {
          componentRadius: '6px',
          componentBorder: '1px solid var(--border)',
          componentShadow: 'none',
          componentBg: 'var(--surface)',
          sectionPadding: '96px',
          contentGap: '16px',
          transitionDuration: '150ms',
          themeMode: 'light',
        },
        typography: { name: 'Moderna', headingScale: 1.1, bodyScale: 1, headingFont: 'Inter', bodyFont: 'Inter' },
        palette: { name: 'Base', primary: '#000000', secondary: '#ffffff', accent: '#ff0000' }
      }
    ],
    aiDirectives: 'Eres un experto copywriter...',
    availableSections: [
      { id: 'heroVideo', name: 'Hero', description: '', blueprint: '', required: true, isRepeatable: false, contentType: 'video' }
    ],
    colorProposals: [
      { name: 'Base', primary: '#000000', secondary: '#ffffff', accent: '#ff0000' }
    ]
  };

  const form = useForm<StyleFormValues>({
    resolver: zodResolver(styleSchema),
    defaultValues: defaultValues as StyleFormValues
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: 'availableSections'
  });

  const { fields: paletteFields, append: appendPalette, remove: removePalette } = useFieldArray({
    control: form.control,
    name: 'colorProposals'
  });

  const { fields: typoFields, append: appendTypography, remove: removeTypography } = useFieldArray({
    control: form.control,
    name: 'typography'
  });

  const { fields: brandFields, append: appendBrand, remove: removeBrand } = useFieldArray({
    control: form.control,
    name: 'brands'
  });

  const onSubmit = async (data: StyleFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      // Reconstruir defaultVisibility basado en required (simplificado para el form)
      const defaultVisibility: Record<string, boolean> = {};
      data.availableSections.forEach(sec => {
        defaultVisibility[sec.id] = sec.required;
      });

      const finalData = {
        ...data,
        allowedSubscriptions: ['free'],
        aiWriterPersona: `${data.name}: Tono definido por el administrador`,
        defaultVisibility
      } as LandingStyle;

      await setDoc(doc(firestore, 'landingStyles', data.id), {
        ...finalData,
        updatedAt: serverTimestamp(),
        ...((initialData && !isCloning) ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });
      
      onClose();
    } catch (error) {
      console.error('Error saving style:', error);
      alert('Hubo un error al guardar el estilo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mw-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{isCloning ? 'Clonar Estilo' : (initialData ? 'Editar Estilo' : 'Crear Nuevo Estilo')}</DialogTitle>
          <DialogDescription>
            Configura el comportamiento visual y de la IA para este estilo de Landing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow px-6 py-4">
          <form id="style-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="visual">Diseño Visual</TabsTrigger>
                <TabsTrigger value="brands">Brands</TabsTrigger>
                <TabsTrigger value="ai">IA & Prompts</TabsTrigger>
                <TabsTrigger value="sections">Secciones</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID del Estilo (único)</Label>
                    <Input {...form.register('id')} disabled={!!initialData && !isCloning} placeholder="ej. classic-v2" />
                    {form.formState.errors.id && <span className="text-sm text-red-500">{form.formState.errors.id.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre Público</Label>
                    <Input {...form.register('name')} placeholder="Classic V2" />
                    {form.formState.errors.name && <span className="text-sm text-red-500">{form.formState.errors.name.message}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Grupo de Estilo</Label>
                  <Select onValueChange={(v) => form.setValue('group', v as StyleGroup)} defaultValue={form.getValues('group')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="corporate">Corporativo</SelectItem>
                      <SelectItem value="high-ticket">High-Ticket</SelectItem>
                      <SelectItem value="promo">Promocional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea {...form.register('description')} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="visual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Layout Base</Label>
                  <Select onValueChange={(v) => form.setValue('layout', v as any)} defaultValue={form.getValues('layout')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="centered">Centrado</SelectItem>
                      <SelectItem value="split">Dividido (Split)</SelectItem>
                      <SelectItem value="full-width">Ancho Completo</SelectItem>
                      <SelectItem value="grid">Cuadrícula</SelectItem>
                      <SelectItem value="asymmetric">Asimétrico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                  <Label className="font-bold text-sm flex items-center gap-2">
                    <span className="w-6 h-[2px] bg-slate-300"></span> Tokens CSS
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(TOKEN_LABELS).map((key) => {
                      const tokenKey = key as keyof StyleTokens;
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs font-medium">{TOKEN_LABELS[tokenKey]}</Label>
                          {tokenKey === 'themeMode' ? (
                            <Select onValueChange={(v) => form.setValue(`tokens.themeMode`, v as any)} defaultValue={form.getValues('tokens.themeMode')}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="glass">Glass</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input {...form.register(`tokens.${tokenKey}`)} className="h-8 text-xs font-mono" placeholder={TOKEN_DESCRIPTIONS[tokenKey]} />
                          )}
                          <p className="text-[9px] text-slate-400">{TOKEN_DESCRIPTIONS[tokenKey]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Tabs defaultValue="palettes" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="palettes">Paletas de Color</TabsTrigger>
                    <TabsTrigger value="typography">Tipografías</TabsTrigger>
                  </TabsList>

                  <TabsContent value="palettes" className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                      <Label>Paletas de Color (5)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => appendPalette({ name: '', primary: '#000000', secondary: '#ffffff', accent: '#ff0000' })}>
                        + Paleta
                      </Button>
                    </div>
                    {paletteFields.map((field, i) => (
                      <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative">
                        <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removePalette(i)}>Eliminar</Button>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nombre</Label>
                            <Input {...form.register(`colorProposals.${i}.name`)} placeholder="Océano" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Primary</Label>
                              <div className="flex gap-1">
                                <input type="color" value={form.watch(`colorProposals.${i}.primary`)} onChange={(e) => form.setValue(`colorProposals.${i}.primary`, e.target.value)} className="w-8 h-8 p-0 border rounded cursor-pointer" />
                                <Input {...form.register(`colorProposals.${i}.primary`)} className="font-mono text-xs" placeholder="#000000" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Secondary</Label>
                              <div className="flex gap-1">
                                <input type="color" value={form.watch(`colorProposals.${i}.secondary`)} onChange={(e) => form.setValue(`colorProposals.${i}.secondary`, e.target.value)} className="w-8 h-8 p-0 border rounded cursor-pointer" />
                                <Input {...form.register(`colorProposals.${i}.secondary`)} className="font-mono text-xs" placeholder="#ffffff" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Accent</Label>
                              <div className="flex gap-1">
                                <input type="color" value={form.watch(`colorProposals.${i}.accent`)} onChange={(e) => form.setValue(`colorProposals.${i}.accent`, e.target.value)} className="w-8 h-8 p-0 border rounded cursor-pointer" />
                                <Input {...form.register(`colorProposals.${i}.accent`)} className="font-mono text-xs" placeholder="#ff0000" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="typography" className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                      <Label>Variantes de Tipografía (5)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => appendTypography({ name: '', headingScale: 1, bodyScale: 1, headingFont: 'Inter', bodyFont: 'Inter' })}>
                        + Variante
                      </Button>
                    </div>
                    {typoFields.map((field, i) => (
                      <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative">
                        <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removeTypography(i)}>Eliminar</Button>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Nombre</Label>
                            <Input {...form.register(`typography.${i}.name`)} placeholder="Moderna" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Heading Font</Label>
                              <Input {...form.register(`typography.${i}.headingFont`)} placeholder="Inter" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Body Font</Label>
                              <Input {...form.register(`typography.${i}.bodyFont`)} placeholder="Inter" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Heading Scale ({form.watch(`typography.${i}.headingScale`)}x)</Label>
                            <input type="range" min="0.5" max="2" step="0.05" value={form.watch(`typography.${i}.headingScale`)} onChange={(e) => form.setValue(`typography.${i}.headingScale`, parseFloat(e.target.value))} className="w-full" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Body Scale ({form.watch(`typography.${i}.bodyScale`)}x)</Label>
                            <input type="range" min="0.5" max="2" step="0.05" value={form.watch(`typography.${i}.bodyScale`)} onChange={(e) => form.setValue(`typography.${i}.bodyScale`, parseFloat(e.target.value))} className="w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Prompt Global de IA (Tono y Persona)</Label>
                  <p className="text-xs text-muted-foreground">Define QUIÉN habla y CÓMO habla en toda la landing page.</p>
                  <Textarea {...form.register('aiDirectives')} rows={8} className="font-mono text-sm" />
                  {form.formState.errors.aiDirectives && <span className="text-sm text-red-500">{form.formState.errors.aiDirectives.message}</span>}
                </div>
              </TabsContent>

              <TabsContent value="sections" className="space-y-4 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <Label>Secciones y Micro-Prompts</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendSection({ id: '', name: '', description: '', blueprint: '', required: false, isRepeatable: false, contentType: 'text' })}>
                    Agregar Sección
                  </Button>
                </div>
                <div className="space-y-4">
                  {sectionFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative">
                      <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removeSection(index)}>
                        Eliminar
                      </Button>
                      <div className="grid grid-cols-2 gap-4 mb-2 pr-12">
                        <Input {...form.register(`availableSections.${index}.id`)} placeholder="ID (ej. hero)" />
                        <Input {...form.register(`availableSections.${index}.name`)} placeholder="Nombre Público" />
                      </div>
                      <div className="grid gap-2 mb-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Prompt IA para Copywriting</Label>
                        <Textarea {...form.register(`availableSections.${index}.description`)} placeholder='Ej: Redacta un título persuasivo...' className="h-20 resize-none text-sm bg-indigo-50/30 border-indigo-100" />
                      </div>
                      <div className="grid gap-2 mb-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Estructura del Componente (Blueprint)</Label>
                        <Textarea {...form.register(`availableSections.${index}.blueprint`)} placeholder='Ej: Grilla de 3 tarjetas. Título arriba, icono centrado...' className="h-20 resize-none text-sm bg-emerald-50/30 border-emerald-100" />
                      </div>
                      <div className="flex items-center gap-6 mt-2 pt-4 border-t border-slate-100">
                        <Select onValueChange={(v) => form.setValue(`availableSections.${index}.contentType`, v as any)} defaultValue={field.contentType}>
                          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="image">Imagen</SelectItem>
                            <SelectItem value="mixed">Mixto</SelectItem>
                            <SelectItem value="interactive">Interactivo</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...form.register(`availableSections.${index}.required`)} />
                          Obligatoria
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...form.register(`availableSections.${index}.isRepeatable`)} />
                          Múltiples Instancias
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="brands" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <Label>Brands ({brandFields.length})</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendBrand({
                    name: '',
                    description: '',
                    tokens: {
                      componentRadius: '6px',
                      componentBorder: '1px solid var(--border)',
                      componentShadow: 'none',
                      componentBg: 'var(--surface)',
                      sectionPadding: '96px',
                      contentGap: '16px',
                      transitionDuration: '150ms',
                      themeMode: 'light',
                    },
                    typography: { name: 'Moderna', headingScale: 1.1, bodyScale: 1, headingFont: 'Inter', bodyFont: 'Inter' },
                    palette: { name: 'Base', primary: '#000000', secondary: '#ffffff', accent: '#ff0000' }
                  })}>
                    + Brand
                  </Button>
                </div>
                {brandFields.map((field, i) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative space-y-4">
                    <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removeBrand(i)}>Eliminar</Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Nombre del Brand</Label>
                        <Input {...form.register(`brands.${i}.name`)} placeholder="Ej: Profesional, Corporativo, Premium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Descripción</Label>
                        <Input {...form.register(`brands.${i}.description`)} placeholder="Ej: Limpio, confiable y balanceado" />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-sm flex items-center gap-2">
                          <span className="w-6 h-[2px] bg-slate-300"></span> Tokens
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.keys(TOKEN_LABELS).map((key) => {
                          const tokenKey = key as keyof StyleTokens;
                          return (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs font-medium">{TOKEN_LABELS[tokenKey]}</Label>
                              {tokenKey === 'themeMode' ? (
                                <Select onValueChange={(v) => form.setValue(`brands.${i}.tokens.${tokenKey}`, v as any)} defaultValue={form.watch(`brands.${i}.tokens.${tokenKey}`)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="glass">Glass</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input {...form.register(`brands.${i}.tokens.${tokenKey}`)} className="h-8 text-xs font-mono" placeholder={TOKEN_DESCRIPTIONS[tokenKey]} />
                              )}
                              <p className="text-[9px] text-slate-400">{TOKEN_DESCRIPTIONS[tokenKey]}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-sm flex items-center gap-2">
                          <span className="w-6 h-[2px] bg-slate-300"></span> Tipografía
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre</Label>
                          <Input {...form.register(`brands.${i}.typography.name`)} placeholder="Moderna" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Heading Font</Label>
                            <Input {...form.register(`brands.${i}.typography.headingFont`)} placeholder="Inter" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Body Font</Label>
                            <Input {...form.register(`brands.${i}.typography.bodyFont`)} placeholder="Inter" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Heading Scale ({form.watch(`brands.${i}.typography.headingScale`)}x)</Label>
                            <input type="range" min="0.5" max="2" step="0.05" value={form.watch(`brands.${i}.typography.headingScale`)} onChange={(e) => form.setValue(`brands.${i}.typography.headingScale`, parseFloat(e.target.value))} className="w-full" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Body Scale ({form.watch(`brands.${i}.typography.bodyScale`)}x)</Label>
                            <input type="range" min="0.5" max="2" step="0.05" value={form.watch(`brands.${i}.typography.bodyScale`)} onChange={(e) => form.setValue(`brands.${i}.typography.bodyScale`, parseFloat(e.target.value))} className="w-full" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Heading Font</Label>
                            <Input {...form.register(`brands.${i}.typography.headingFont`)} placeholder="Inter" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Body Font</Label>
                            <Input {...form.register(`brands.${i}.typography.bodyFont`)} placeholder="Inter" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-sm flex items-center gap-2">
                          <span className="w-6 h-[2px] bg-slate-300"></span> Paleta
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre</Label>
                          <Input {...form.register(`brands.${i}.palette.name`)} placeholder="Base" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Primary</Label>
                            <div className="flex gap-1">
                              <input type="color" value={form.watch(`brands.${i}.palette.primary`)} onChange={(e) => form.setValue(`brands.${i}.palette.primary`, e.target.value)} className="w-8 h-8 p-0 border rounded cursor-pointer" />
                              <Input {...form.register(`brands.${i}.palette.primary`)} className="font-mono text-xs" placeholder="#000000" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Secondary</Label>
                            <div className="flex gap-1">
                              <input type="color" value={form.watch(`brands.${i}.palette.secondary`)} onChange={(e) => form.setValue(`brands.${i}.palette.secondary`, e.target.value)} className="w-8 h-8 p-0 border rounded cursor-pointer" />
                              <Input {...form.register(`brands.${i}.palette.secondary`)} className="font-mono text-xs" placeholder="#ffffff" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Accent</Label>
                            <div className="flex gap-1">
                              <input type="color" value={form.watch(`brands.${i}.palette.accent`)} onChange={(e) => form.setValue(`brands.${i}.palette.accent`, e.target.value)} className="w-8 h-8 p-0 border rounded cursor-pointer" />
                              <Input {...form.register(`brands.${i}.palette.accent`)} className="font-mono text-xs" placeholder="#ff0000" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
</TabsContent>
              </Tabs>
            </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 mt-auto">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="style-form" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Estilo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
