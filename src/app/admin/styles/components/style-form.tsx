'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LandingStyle, LandingStyleSection } from '@/lib/landing-styles';
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

const styleSchema = z.object({
  id: z.string().min(1, 'El ID es requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string(),
  thumbnail: z.string(),
  layout: z.enum(['centered', 'split', 'full-width', 'grid', 'asymmetric']),
  componentStyle: z.enum(['borders', 'shadows', 'minimal', 'defined', 'creative']),
  spacing: z.enum(['compact', 'balanced', 'generous', 'airy']),
  animations: z.enum(['none', 'minimal', 'hover', 'micro']),
  typography: z.array(typographySchema),
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
    id: isCloning ? '' : initialData.id // Vaciar el ID si estamos clonando
  } : {
    id: '',
    name: '',
    description: '',
    thumbnail: '/styles/placeholder.png',
    layout: 'centered',
    componentStyle: 'borders',
    spacing: 'balanced',
    animations: 'minimal',
    typography: [
      { name: 'Moderna', headingScale: 1.1, bodyScale: 1, headingFont: 'Inter', bodyFont: 'Inter' }
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

  const onSubmit = async (data: StyleFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      // Reconstruir defaultVisibility basado en required (simplificado para el form)
      const defaultVisibility: Record<string, boolean> = {};
      data.availableSections.forEach(sec => {
        defaultVisibility[sec.id] = sec.required;
      });

      const finalData: LandingStyle = {
        ...data,
        defaultVisibility
      };

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="visual">Diseño Visual</TabsTrigger>
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
                  <Label>Descripción</Label>
                  <Textarea {...form.register('description')} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="visual" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Estilo de Componentes</Label>
                    <Select onValueChange={(v) => form.setValue('componentStyle', v as any)} defaultValue={form.getValues('componentStyle')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borders">Bordes Duros</SelectItem>
                        <SelectItem value="shadows">Sombras Suaves</SelectItem>
                        <SelectItem value="minimal">Minimalista</SelectItem>
                        <SelectItem value="defined">Definido</SelectItem>
                        <SelectItem value="creative">Creativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Simplified visual controls for MVP */}
                <p className="text-sm text-muted-foreground italic mt-4">Nota: Opciones de Tipografía y Colores requieren configuración JSON avanzada en esta versión.</p>
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
