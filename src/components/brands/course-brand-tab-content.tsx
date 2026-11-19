'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Palette,
  Upload,
  Trash2,
  Plus,
  Download,
  Edit2,
  Save,
  Check,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { parseBrandFile, brandsToDTCG, DEFAULT_BRAND_TOKENS } from '@/lib/landing-styles/dtcg';
import { resolveProfileBrand } from '@/lib/landing-styles';
import { ALLOWED_WEB_FONTS } from '@/lib/landing-styles/fonts';
import type { StyleBrand } from '@/lib/landing-styles';

interface CourseBrandTabContentProps {
  /** Logo institucional o específico del curso */
  logoUrl?: string;
  onLogoChange?: (newUrl: string) => void;
  onLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  uploadingLogo?: boolean;

  /** Nombre del brand actualmente seleccionado en el curso */
  selectedBrandName?: string;
  /** Callback al elegir un brand */
  onSelectBrand: (brand: StyleBrand) => void;

  /** Color primario resultante */
  primaryColor?: string;
  /** Callback para cambio manual de color primario */
  onPrimaryColorChange?: (color: string) => void;

  /** Opcional: descripción personalizada para el header */
  headerDescription?: string;
}

export function CourseBrandTabContent({
  logoUrl = '',
  onLogoChange,
  onLogoUpload,
  uploadingLogo = false,
  selectedBrandName,
  onSelectBrand,
  primaryColor,
  onPrimaryColorChange,
  headerDescription = 'Personaliza la identidad visual y la marca institucional para este programa.',
}: CourseBrandTabContentProps) {
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const db = useFirestore();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const brandFileInputRef = useRef<HTMLInputElement>(null);

  // Lista local de brands para reflejar inmediatamente creaciones/ediciones/eliminaciones
  const [brands, setBrands] = useState<StyleBrand[]>([]);
  const [activeProfileBrandName, setActiveProfileBrandName] = useState<string>('');

  // Estado del modal de crear / editar brand
  const [brandEditorOpen, setBrandEditorOpen] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState({
    originalName: '',
    name: '',
    primary: '#3B2D86',
    secondary: '#8B5CF6',
    accent: '#D8B4FE',
    headingFont: 'Inter',
    bodyFont: 'Inter'
  });

  // Sincronizar brands desde el perfil del usuario autenticado
  useEffect(() => {
    if (profile?.profile) {
      const userBrands: StyleBrand[] = Array.isArray(profile.profile.brands) ? profile.profile.brands : [];
      setBrands(userBrands);
      setActiveProfileBrandName(profile.profile.activeBrandName || (userBrands[0]?.name ?? ''));
    }
  }, [profile]);

  // Persistir actualización de brands del tutor en Firestore (`users/{uid}`)
  const persistUserBrands = async (updatedBrands: StyleBrand[], newActiveBrandName?: string) => {
    if (!user?.uid || !db) return;
    setSavingBrand(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatePayload: Record<string, any> = {
        'profile.brands': updatedBrands,
        updatedAt: serverTimestamp()
      };
      if (newActiveBrandName !== undefined) {
        updatePayload['profile.activeBrandName'] = newActiveBrandName;
      }
      await updateDoc(userRef, updatePayload);
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al sincronizar marcas del perfil',
        description: err?.message || 'No se pudo guardar la marca en tu perfil.'
      });
    } finally {
      setSavingBrand(false);
    }
  };

  const handleOpenBrandEditor = (brand?: StyleBrand) => {
    if (brand) {
      setBrandForm({
        originalName: brand.name,
        name: brand.name,
        primary: brand.palette?.primary || '#3B2D86',
        secondary: brand.palette?.secondary || '#8B5CF6',
        accent: brand.palette?.accent || '#D8B4FE',
        headingFont: brand.typography?.headingFont || 'Inter',
        bodyFont: brand.typography?.bodyFont || 'Inter'
      });
    } else {
      setBrandForm({
        originalName: '',
        name: '',
        primary: '#3B2D86',
        secondary: '#8B5CF6',
        accent: '#D8B4FE',
        headingFont: 'Inter',
        bodyFont: 'Inter'
      });
    }
    setBrandEditorOpen(true);
  };

  const handleSaveBrandEditor = async () => {
    if (!brandForm.name.trim()) {
      toast({ variant: 'destructive', title: 'La marca debe tener un nombre' });
      return;
    }

    if (
      brandForm.name !== brandForm.originalName &&
      brands.some(b => b.name.toLowerCase() === brandForm.name.trim().toLowerCase())
    ) {
      toast({ variant: 'destructive', title: 'Ya existe una marca con ese nombre' });
      return;
    }

    const newBrand: StyleBrand = {
      name: brandForm.name.trim(),
      description: 'Brand creado en el editor visual',
      palette: {
        primary: brandForm.primary,
        secondary: brandForm.secondary,
        accent: brandForm.accent,
        name: brandForm.name.trim()
      },
      typography: {
        headingFont: brandForm.headingFont.trim() || 'Inter',
        bodyFont: brandForm.bodyFont.trim() || 'Inter',
        headingScale: 1.1,
        bodyScale: 1,
        name: brandForm.name.trim()
      },
      tokens: { ...DEFAULT_BRAND_TOKENS }
    };

    let updatedBrands = [...brands];
    let nextActiveName = activeProfileBrandName;

    if (brandForm.originalName) {
      updatedBrands = updatedBrands.map(b => b.name === brandForm.originalName ? newBrand : b);
      if (activeProfileBrandName === brandForm.originalName) {
        nextActiveName = newBrand.name;
      }
    } else {
      updatedBrands.push(newBrand);
      if (!nextActiveName) {
        nextActiveName = newBrand.name;
      }
    }

    setBrands(updatedBrands);
    setActiveProfileBrandName(nextActiveName);
    setBrandEditorOpen(false);

    // Auto-seleccionar la marca creada o editada para el curso actual
    onSelectBrand(newBrand);

    await persistUserBrands(updatedBrands, nextActiveName);
    toast({ title: brandForm.originalName ? 'Marca actualizada con éxito' : 'Nueva marca creada y aplicada' });
  };

  const handleRemoveBrand = async (brandName: string) => {
    const updatedBrands = brands.filter(b => b.name !== brandName);
    let nextActive = activeProfileBrandName;
    if (activeProfileBrandName === brandName) {
      nextActive = updatedBrands[0]?.name || '';
    }
    setBrands(updatedBrands);
    setActiveProfileBrandName(nextActive);

    // Si la marca eliminada era la seleccionada en el curso, fallback a la primera disponible o activa
    if (selectedBrandName === brandName && updatedBrands.length > 0) {
      onSelectBrand(updatedBrands[0]);
    }

    await persistUserBrands(updatedBrands, nextActive);
    toast({ title: 'Marca eliminada de tu perfil' });
  };

  const handleDownloadBrand = (brand: StyleBrand) => {
    const json = brandsToDTCG([brand]);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.name.toLowerCase().replace(/\s+/g, '-')}-tokens.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const template = {
      "$schema": "https://design-tokens.github.io/community-group/format/",
      "mi-marca-personal": {
        "$description": "Design tokens de marca. Completa los valores HEX y fuentes.",
        "color": {
          "primary": { "$type": "color", "$value": "#760464", "$description": "Color principal" },
          "secondary": { "$type": "color", "$value": "#b288b9", "$description": "Color secundario" },
          "accent": { "$type": "color", "$value": "#d3bba8", "$description": "Color de acento" }
        },
        "typography": {
          "headingFont": { "$type": "fontFamily", "$value": "Mulish", "$description": "Tipografía para títulos" },
          "bodyFont": { "$type": "fontFamily", "$value": "Lato", "$description": "Tipografía para cuerpo" }
        }
      }
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-brand.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBrandFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = parseBrandFile(String(reader.result || ''));
        if (result.errors.length > 0) {
          toast({ variant: 'destructive', title: 'Archivo inválido', description: result.errors[0] });
          return;
        }
        const existing = new Set(brands.map(b => b.name.toLowerCase()));
        const newBrands = result.brands.filter(b => !existing.has(b.name.toLowerCase()));
        if (newBrands.length === 0) {
          toast({ title: 'Sin cambios', description: 'Esa marca ya se encuentra registrada en tu perfil.' });
          return;
        }
        const updated = [...brands, ...newBrands];
        const nextActive = activeProfileBrandName || newBrands[0].name;
        setBrands(updated);
        setActiveProfileBrandName(nextActive);

        // Seleccionar la primera marca importada
        onSelectBrand(newBrands[0]);

        await persistUserBrands(updated, nextActive);
        toast({ title: `${newBrands.length} marca(s) importada(s)` });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error de lectura', description: err?.message || 'JSON inválido' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Determinar marca seleccionada actual
  const currentBrand = brands.find(b => b.name === selectedBrandName) ||
    brands.find(b => b.name === activeProfileBrandName) ||
    brands[0] ||
    null;

  const currentPrimaryColor = primaryColor || currentBrand?.palette?.primary || profile?.profile?.branding?.primaryColor || '#3B2D86';

  return (
    <div className="space-y-10">
      {/* 1. SECCIÓN LOGO */}
      <div className="space-y-4">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logo Institucional del Curso</Label>
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-3xl bg-secondary/20 flex items-center justify-center relative overflow-hidden border-4 border-white shadow-sm">
            {logoUrl && typeof logoUrl === 'string' ? (
              <Image
                src={logoUrl}
                alt="Logo del programa"
                fill
                sizes="128px"
                className="object-contain p-4"
                unoptimized
                data-ai-hint="course logo"
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="rounded-2xl font-bold h-12 px-8 border-2"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              {logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
            </Button>
            {logoUrl && onLogoChange && (
              <Button
                variant="ghost"
                className="rounded-2xl font-bold h-12 px-8 text-destructive hover:bg-destructive/10"
                onClick={() => onLogoChange('')}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Logo
              </Button>
            )}
          </div>
          {onLogoUpload && (
            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={onLogoUpload} />
          )}
        </div>
      </div>

      {/* 2. SECCIÓN BRANDS (MIS MARCAS / PERFIL) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Mis brands (marcas del tutor)
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona una marca existente o crea una nueva para aplicar su paleta y tipografía a este curso.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="rounded-full font-bold shadow-md h-9 px-4"
              onClick={() => handleOpenBrandEditor()}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Crear Brand
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full font-bold h-9 px-3"
              onClick={handleDownloadTemplate}
              title="Descargar plantilla base"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full font-bold h-9 px-3"
              onClick={() => brandFileInputRef.current?.click()}
              title="Importar archivo JSON"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <input
            type="file"
            ref={brandFileInputRef}
            className="hidden"
            accept=".json,application/json"
            onChange={handleBrandFile}
          />
        </div>

        {brands.length === 0 ? (
          <div className="bg-secondary/10 p-8 rounded-2xl flex flex-col gap-4 text-center items-center justify-center border-2 border-dashed">
            <Palette className="h-10 w-10 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">No tienes brands registrados aún</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Crea tu primera marca con el botón superior para definir los colores primario, secundario y de acento de tus cursos.
              </p>
            </div>
            <Button className="rounded-xl font-bold mt-2" onClick={() => handleOpenBrandEditor()}>
              <Plus className="h-4 w-4 mr-2" /> Crear Primer Brand
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {brands.map((brand) => {
              const isSelected = selectedBrandName ? selectedBrandName === brand.name : activeProfileBrandName === brand.name;
              const isProfileActive = activeProfileBrandName === brand.name;
              return (
                <div
                  key={brand.name}
                  className={cn(
                    "border-2 rounded-xl p-4 transition-all flex flex-col justify-between cursor-pointer",
                    isSelected
                      ? "border-success bg-success/5 shadow-sm ring-2 ring-success/20"
                      : "border-border bg-white hover:border-primary/50"
                  )}
                  onClick={() => onSelectBrand(brand)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex -space-x-1.5">
                        <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-30" style={{ backgroundColor: brand.palette?.primary || '#3B2D86' }} />
                        <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-20" style={{ backgroundColor: brand.palette?.secondary || '#8B5CF6' }} />
                        <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm z-10" style={{ backgroundColor: brand.palette?.accent || '#D8B4FE' }} />
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectBrand(brand)}
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 transition-colors mr-1",
                            isSelected
                              ? "bg-success text-white cursor-default"
                              : "bg-muted text-muted-foreground hover:bg-success/15 hover:text-success"
                          )}
                        >
                          {isSelected ? 'Activo en curso' : 'Seleccionar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenBrandEditor(brand)}
                          className="text-[10px] font-black text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Editar brand"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadBrand(brand)}
                          className="text-[10px] font-black text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Descargar tokens"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveBrand(brand.name)}
                          className="text-[10px] font-black text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Eliminar brand"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <p className="font-bold text-sm text-foreground">{brand.name}</p>
                      {isProfileActive && (
                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          Perfil
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{brand.description || 'Marca registrada'}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-2 truncate">
                      {brand.typography?.headingFont || 'Inter'} · {brand.palette?.primary || '#3B2D86'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detalle del brand seleccionado para el curso */}
        <div className="space-y-3 pt-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Paleta Resultante para este Curso
          </Label>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative shrink-0">
                <input
                  type="color"
                  value={currentPrimaryColor}
                  onChange={e => onPrimaryColorChange && onPrimaryColorChange(e.target.value)}
                  className="w-12 h-12 rounded-xl p-0 border-none cursor-pointer overflow-hidden ring-4 ring-white shadow"
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-base font-mono font-bold text-foreground">{currentPrimaryColor}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentBrand ? `Color primario vinculado a "${currentBrand.name}".` : 'Color primario personalizado.'}
                </p>
              </div>
            </div>
            {currentBrand && (
              <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto text-xs text-muted-foreground">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest block text-muted-foreground/70">Secundario</span>
                  <div className="flex items-center gap-1.5 font-mono font-medium">
                    <span className="w-3.5 h-3.5 rounded-full border shadow-xs" style={{ backgroundColor: currentBrand.palette?.secondary || '#8B5CF6' }} />
                    {currentBrand.palette?.secondary || '#8B5CF6'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest block text-muted-foreground/70">Acento</span>
                  <div className="flex items-center gap-1.5 font-mono font-medium">
                    <span className="w-3.5 h-3.5 rounded-full border shadow-xs" style={{ backgroundColor: currentBrand.palette?.accent || '#D8B4FE' }} />
                    {currentBrand.palette?.accent || '#D8B4FE'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR BRAND */}
      <Dialog open={brandEditorOpen} onOpenChange={setBrandEditorOpen}>
        <DialogContent className="sm:max-w-md p-6 border-2 border-border shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-widest text-primary">
              {brandForm.originalName ? 'Editar Brand' : 'Crear Brand'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura los colores base y fuentes para tu marca. Se guardará en tu perfil y se aplicará a este curso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nombre del Brand</Label>
              <Input
                value={brandForm.name}
                onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                className="bg-muted/50 h-12 rounded-xl border-border"
                placeholder="Ej. Mi Marca Premium"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Primary</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="color"
                    value={brandForm.primary}
                    onChange={e => setBrandForm({ ...brandForm, primary: e.target.value })}
                    className="h-10 w-full p-1 rounded-lg border-2 cursor-pointer"
                  />
                  <Input
                    value={brandForm.primary}
                    onChange={e => setBrandForm({ ...brandForm, primary: e.target.value })}
                    className="h-8 text-xs font-mono px-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Secondary</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="color"
                    value={brandForm.secondary}
                    onChange={e => setBrandForm({ ...brandForm, secondary: e.target.value })}
                    className="h-10 w-full p-1 rounded-lg border-2 cursor-pointer"
                  />
                  <Input
                    value={brandForm.secondary}
                    onChange={e => setBrandForm({ ...brandForm, secondary: e.target.value })}
                    className="h-8 text-xs font-mono px-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Accent</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="color"
                    value={brandForm.accent}
                    onChange={e => setBrandForm({ ...brandForm, accent: e.target.value })}
                    className="h-10 w-full p-1 rounded-lg border-2 cursor-pointer"
                  />
                  <Input
                    value={brandForm.accent}
                    onChange={e => setBrandForm({ ...brandForm, accent: e.target.value })}
                    className="h-8 text-xs font-mono px-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tipografía Títulos</Label>
                <Select
                  value={brandForm.headingFont}
                  onValueChange={val => setBrandForm({ ...brandForm, headingFont: val })}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border">
                    <SelectValue placeholder="Selecciona una fuente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ALLOWED_WEB_FONTS.map(f => (
                      <SelectItem key={f.name} value={f.name}>
                        <span style={{ fontFamily: f.name }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tipografía Cuerpo</Label>
                <Select
                  value={brandForm.bodyFont}
                  onValueChange={val => setBrandForm({ ...brandForm, bodyFont: val })}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border">
                    <SelectValue placeholder="Selecciona una fuente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ALLOWED_WEB_FONTS.map(f => (
                      <SelectItem key={f.name} value={f.name}>
                        <span style={{ fontFamily: f.name }}>{f.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl font-bold h-12 px-6"
              onClick={() => setBrandEditorOpen(false)}
              disabled={savingBrand}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl font-bold h-12 px-8"
              onClick={handleSaveBrandEditor}
              disabled={savingBrand}
            >
              {savingBrand ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

