'use client';

import { useState, type ChangeEvent } from 'react';
import { LandingStyle, STYLE_GROUP_LABELS, STYLE_GROUP_COLORS, StyleGroup, StyleBrand } from '@/lib/landing-styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, FileText, CheckCircle2, CopyPlus, Palette, ChevronDown, ChevronUp, Upload, Download, Loader2, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { parseBrandFile, brandsToDTCG } from '@/lib/landing-styles/dtcg';
import type { BrandParseResult } from '@/lib/landing-styles/dtcg';
import { BrandVisual } from '@/components/landing/brand-visual';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface StyleDetailsProps {
  styleData: LandingStyle;
  onClose: () => void;
}

const BRAND_JSON_EXAMPLE = `{
  "$schema": "https://design-tokens.github.io/community-group/format/draft/draft.json",
  "Profesional": {
    "$description": "Limpio, confiable y balanceado",
    "color": {
      "primary": { "$value": "#1E40AF", "$type": "color" },
      "secondary": { "$value": "#F1F5F9", "$type": "color" },
      "accent": { "$value": "#F59E0B", "$type": "color" }
    },
    "typography": {
      "heading-font": { "$value": "Inter", "$type": "fontFamily" },
      "heading-scale": { "$value": 1.1, "$type": "number" },
      "body-font": { "$value": "Inter", "$type": "fontFamily" },
      "body-scale": { "$value": 1, "$type": "number" }
    },
    "components": {
      "radius": { "$value": "6px", "$type": "dimension" },
      "border": { "$value": "1px solid var(--border)", "$type": "border" },
      "shadow": { "$value": "none", "$type": "shadow" },
      "background": { "$value": "var(--surface)", "$type": "color" }
    },
    "layout": {
      "section-padding": { "$value": "96px", "$type": "dimension" },
      "content-gap": { "$value": "16px", "$type": "dimension" },
      "transition-duration": { "$value": "150ms", "$type": "duration" }
    },
    "theme": {
      "mode": { "$value": "light", "$type": "string" }
    }
  }
}`;

export default function StyleDetails({ styleData, onClose }: StyleDetailsProps) {
  const { firestore } = useFirebase();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<BrandParseResult | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<StyleBrand | null>(null);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);
  const [deleteBrandError, setDeleteBrandError] = useState<string | null>(null);

  const handleDeleteBrand = async () => {
    if (!firestore || !brandToDelete) return;
    setIsDeletingBrand(true);
    setDeleteBrandError(null);
    try {
      const remaining = (styleData.brands || []).filter((b) => b.name !== brandToDelete.name);
      await updateDoc(doc(firestore, 'landingStyles', styleData.id), {
        brands: remaining,
      });
      setBrandToDelete(null);
    } catch (e: any) {
      setDeleteBrandError(`Error al eliminar el brand: ${e?.message || 'desconocido'}`);
    } finally {
      setIsDeletingBrand(false);
    }
  };

  const openImportDialog = () => {
    setImportError(null);
    setImportedFileName(null);
    setParseResult(null);
    setIsImportOpen(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedFileName(file.name);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setParseResult(parseBrandFile(text));
    };
    reader.onerror = () => {
      setImportError('No se pudo leer el archivo seleccionado.');
      setParseResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!firestore || !parseResult || parseResult.brands.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      await updateDoc(doc(firestore, 'landingStyles', styleData.id), {
        brands: arrayUnion(...parseResult.brands),
      });
      setIsImportOpen(false);
    } catch (e: any) {
      setImportError(`Error al guardar: ${e?.message || 'desconocido'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportDTCG = () => {
    if (!styleData.brands || styleData.brands.length === 0) return;
    const slug = styleData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const blob = new Blob([brandsToDTCG(styleData.brands)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-brand-tokens.tokens.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mw-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-white border shadow-sm flex items-center justify-center shrink-0 overflow-hidden relative">
              {styleData.thumbnail ? (
                <img
                  src={styleData.thumbnail}
                  alt={styleData.name}
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : null}
              <Palette className="w-8 h-8 text-border" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                Estilo: {styleData.name}
                <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 h-5 ${STYLE_GROUP_COLORS[styleData.group as StyleGroup] || 'bg-muted text-muted-foreground border-border'}`}>
                  {STYLE_GROUP_LABELS[styleData.group as StyleGroup] || styleData.group}
                </Badge>
                <div className="flex gap-1 ml-2">
                  {styleData.allowedSubscriptions?.map(plan => (
                    <Badge key={plan} variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 h-5 
                      ${plan === 'premium' ? 'bg-warn text-white border-warn' : ''}
                      ${plan === 'pro' ? 'bg-primary text-white border-primary' : ''}
                      ${plan === 'free' ? 'bg-success/10 text-success border-success/20' : ''}
                    `}>
                      {plan}
                    </Badge>
                  ))}
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm mt-1 text-muted-foreground">
                {styleData.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="ai" className="font-bold flex gap-2"><Bot className="h-4 w-4" /> Prompt General (IA)</TabsTrigger>
              <TabsTrigger value="sections" className="font-bold flex gap-2"><FileText className="h-4 w-4" /> Secciones & Prompts</TabsTrigger>
              <TabsTrigger value="brands" className="font-bold flex gap-2"><Palette className="h-4 w-4" /> Brands</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 tracking-widest">¿Quién habla y cómo se expresa?</h3>
                <div className="bg-foreground text-muted p-6 rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {styleData.aiDirectives || 'No hay directivas globales configuradas para este estilo.'}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sections" className="space-y-3">
              <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 tracking-widest">Secciones disponibles ({styleData.availableSections?.length || 0})</h3>
              <div className="space-y-2">
                {styleData.availableSections?.map((section) => {
                  const isExpanded = expandedSection === section.id;
                  return (
                    <div key={section.id} className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">{section.name}</h4>
                          <Badge variant="outline" className="bg-muted uppercase text-[9px] tracking-widest font-black border-border shrink-0">
                            {section.id}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="font-bold text-[10px] capitalize">
                            {section.contentType}
                          </Badge>
                          {section.required && (
                            <Badge className="bg-success/15 text-success hover:bg-success/15 border-none font-bold text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Obligatoria
                            </Badge>
                          )}
                          {section.isRepeatable && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-bold text-[10px] gap-1">
                              <CopyPlus className="h-3 w-3" /> Multi
                            </Badge>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="bg-primary/10/50 p-3 rounded-lg border border-primary/15/50">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Prompt Específico de la Sección</p>
                            <p className="text-xs text-foreground font-medium italic leading-relaxed">
                              "{section.description || 'Sin prompt específico.'}"
                            </p>
                          </div>
                          <div className="bg-success/10/50 p-3 rounded-lg border border-success/15/50">
                            <p className="text-[10px] font-bold text-success uppercase tracking-widest mb-1">Estructura Visual (Blueprint)</p>
                            <p className="text-xs text-foreground font-medium leading-relaxed">
                              {section.blueprint || 'Sin estructura definida.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="brands" className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">
                  Brands ({styleData.brands?.length || 0})
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="font-bold gap-1.5" disabled={!styleData.brands || styleData.brands.length === 0} onClick={handleExportDTCG}>
                    <Download className="h-3.5 w-3.5" /> Exportar DTCG
                  </Button>
                  <Button variant="outline" size="sm" className="font-bold gap-1.5" onClick={openImportDialog}>
                    <Upload className="h-3.5 w-3.5" /> Importar brand
                  </Button>
                </div>
              </div>
              {styleData.brands && styleData.brands.length > 0 ? (
                <BrandVisual
                  brands={styleData.brands}
                  onDelete={(brand) => {
                    setDeleteBrandError(null);
                    setBrandToDelete(brand);
                  }}
                  emptyMessage="Este estilo no tiene brands configurados. Usá «Importar brand» para cargar uno o más brands desde un archivo JSON."
                />
              ) : (
                <div className="text-center py-10 bg-muted rounded-xl border border-muted">
                  <Palette className="h-10 w-10 text-border mx-auto mb-3" />
                  <p className="text-muted-foreground">Este estilo no tiene brands configurados</p>
                  <p className="text-sm text-muted-foreground mt-1">Usá "Importar brand" para cargar uno o más brands desde un archivo JSON.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
          <Button variant="outline" onClick={onClose} className="font-bold">Cerrar</Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={isImportOpen} onOpenChange={(open) => !open && !isImporting && setIsImportOpen(false)}>
        <DialogContent className="mw-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-lg font-bold text-foreground">Importar Brand — {styleData.name}</DialogTitle>
            <DialogDescription>
              Cargá un archivo JSON de brands: formato estándar DTCG/W3C (Design Tokens) o el formato propio del sistema. Se importan tal cual; los campos desconocidos se ignoran.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
            <div className="bg-warn/10/70 border border-warn/20 rounded-xl p-3 text-xs text-warn space-y-1">
              <p className="font-bold text-foreground">Requisitos mínimos por brand</p>
              <p>Para que el brand sea usable (y no se cargue basura), cada brand debe incluir:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><span className="font-mono">name</span> (nombre)</li>
                <li>Paleta con <span className="font-mono">primary</span>, <span className="font-mono">secondary</span> y <span className="font-mono">accent</span> en formato válido (#hex, <span className="font-mono">hsl()</span>/<span className="font-mono">rgb()</span> o <span className="font-mono">var(--...)</span>)</li>
                <li>Tipografía con <span className="font-mono">heading-font</span> y <span className="font-mono">body-font</span></li>
              </ul>
              <p>Los brands que no cumplan se listan como errores y no se importan.</p>
            </div>

            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1.5">
              <p className="font-bold text-blue-900">Formato DTCG/W3C (Design Tokens)</p>
              <p><span className="font-mono font-bold">.json</span> estándar: cada grupo raíz (sin <span className="font-mono">$</span>) es un brand. Acepta <span className="font-mono">$schema</span> opcional y tokens con <span className="font-mono">$value</span>/<span className="font-mono">$type</span>.</p>
              <p>Detecta automáticamente <span className="font-mono font-bold">color</span>, <span className="font-mono font-bold">typography</span>, <span className="font-mono font-bold">components</span>, <span className="font-mono font-bold">layout</span> y <span className="font-mono font-bold">theme</span>. Mapea a los tokens del sistema.</p>
              <p className="font-bold text-blue-900 pt-1">Formato propio del sistema (fallback)</p>
              <p>También acepta el formato interno: <span className="font-mono font-bold">name</span> (obligatorio), <span className="font-mono font-bold">description</span>, <span className="font-mono font-bold">tokens</span>, <span className="font-mono font-bold">typography</span> y <span className="font-mono font-bold">palette</span>.</p>
              <p className="text-blue-700">Los campos desconocidos (ej. iconos) se ignoran. Los tokens CSS faltantes (radio, sombra, espaciado, etc.) se completan con los valores por defecto del sistema; la paleta y la tipografía deben venir en el archivo.</p>
            </div>

            <div className="bg-foreground text-muted rounded-xl p-4 font-mono text-[11px] leading-relaxed whitespace-pre overflow-x-auto">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Ejemplo de formato</p>
              {BRAND_JSON_EXAMPLE}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted px-4 py-4 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Upload className="h-4 w-4" />
                  {importedFileName ? `Reemplazar archivo: ${importedFileName}` : 'Seleccionar archivo JSON'}
                </span>
                <input type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {importedFileName && parseResult && (
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Archivo: {importedFileName}</p>
                {parseResult.brands.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {parseResult.brands.map((brand, i) => (
                      <Badge key={i} variant="outline" className="bg-success/10 text-success border-success/20 font-bold">
                        {brand.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {parseResult.errors.length > 0 && (
                  <div className="bg-danger/10 border border-danger/15 rounded-lg p-3 space-y-1">
                    {parseResult.errors.map((err, i) => (
                      <p key={i} className="text-xs font-semibold text-danger">✕ {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importError && (
              <p className="text-sm font-bold text-danger">{importError}</p>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={isImporting}>Cancelar</Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !parseResult || parseResult.brands.length === 0}
            >
              {isImporting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importando...</> : `Importar ${parseResult && parseResult.brands.length > 0 ? `${parseResult.brands.length} brand${parseResult.brands.length > 1 ? 's' : ''}` : 'brands'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!brandToDelete}
        onOpenChange={(open) => {
          if (!isDeletingBrand && !open) setBrandToDelete(null);
        }}
        title={`Eliminar brand "${brandToDelete?.name || ''}"`}
        description={deleteBrandError || 'Esta acción elimina el brand del estilo y no se puede deshacer. Las landings que ya lo usan mantienen sus tokens congelados.'}
        icon={<Trash2 className="h-6 w-6" />}
        iconClassName="bg-danger/10 text-danger"
        confirmLabel="Eliminar"
        variant="destructive"
        loading={isDeletingBrand}
        onConfirm={handleDeleteBrand}
      />
    </Dialog>
  );
}
