'use client';


import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Upload, FileJson, Loader2, Trash2, 
  Star, Clock, Eye, Plus, AlertTriangle
} from 'lucide-react';

interface BrandItem {
  id: string;
  name: string;
  tokens: any;
  logoType: string;
  themeType: string;
  createdAt?: any;
  updatedBy?: string;
  colorCount: number;
  tokenCount: number;
}

export default function AdminThemePage() {
  const db = useFirestore();
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewData, setPreviewData] = useState<{ file: File; parsed: any } | null>(null);

  const brandsRef = useMemoFirebase(() => doc(db, 'config', 'brands'), [db]);
  const { data: brandsDoc } = useDoc(brandsRef);

  const brands: BrandItem[] = brandsDoc?.items || [];
  const activeId: string | null = brandsDoc?.activeId || null;

  const activeBrand = brands.find(b => b.id === activeId) || null;

  const parseFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast({ title: 'Formato inválido', description: 'Solo .json', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed?.fastoria) {
          toast({ title: 'Estructura inválida', description: 'Falta nodo "fastoria"', variant: 'destructive' });
          return;
        }
        setPreviewData({ file, parsed });
      } catch {
        toast({ title: 'Error de parsing', description: 'El archivo no es JSON válido', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const confirmImport = async () => {
    if (!profile?.roles.includes('admin') || !previewData) return;
    setImporting(true);
    try {
      const { file, parsed } = previewData;
      const t = parsed.fastoria;
      const colorCount = Object.keys(t.color || {}).length;
      const tokenCount = countTokens(t);
      const newBrand: BrandItem = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name.replace('.json', ''),
        tokens: parsed,
        logoType: t.theme?.['logo-selected']?.$value || 'arc',
        themeType: t.theme?.active?.$value || 'institucional',
        createdAt: new Date().toISOString(),
        updatedBy: profile?.uid,
        colorCount,
        tokenCount
      };

      const updatedItems = [...brands, newBrand];
      await setDoc(brandsRef, { items: updatedItems, activeId }, { merge: false });
      toast({ title: 'Importado', description: `${newBrand.name} — ${tokenCount} tokens. Activá desde la grilla.` });
      setPreviewData(null);
    } catch (e: any) {
      const msg = e.message || '';
      const friendly = msg.includes('permission') || msg.includes('denied') || msg.includes('Unauthorized')
        ? 'No tenés permisos de escritura en config/. Tu email no está en la whitelist de Firestore rules.'
        : msg || 'No se pudo guardar';
      toast({ title: 'Error de guardado', description: friendly, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!profile?.roles.includes('admin')) return;
    setLoading(true);
    try {
      await setDoc(brandsRef, { activeId: id }, { merge: true });
      toast({ title: 'Brand kit activado', description: 'Los tokens se aplican a toda la plataforma.' });
    } catch (e: any) {
      const msg = e.message || '';
      const friendly = msg.includes('permission') || msg.includes('denied') || msg.includes('Unauthorized')
        ? 'No tenés permisos de escritura en config/. Tu email no está en la whitelist de Firestore rules.'
        : msg || 'No se pudo activar';
      toast({ title: 'Error de activación', description: friendly, variant: 'destructive' });
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: brandsRef.path, operation: 'update', requestResourceData: { activeId: id }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile?.roles.includes('admin')) return;
    if (id === activeId) {
      toast({ title: 'No se puede eliminar', description: 'Desactivá este brand kit primero', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const updatedItems = brands.filter(b => b.id !== id);
      await setDoc(brandsRef, { items: updatedItems }, { merge: true });
      toast({ title: 'Eliminado', description: 'Brand kit eliminado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Brand Kits</h1>
            <p className="text-muted-foreground text-lg font-medium">Importá, activá y gestioná tus identidades visuales. Solo un brand kit puede estar activo a la vez.</p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {importing ? 'Importando...' : 'Importar brand kit'}
            </Button>
          </div>
        </header>

        {previewData ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-3">
                <FileJson className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-bold text-sm">{previewData.file.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {Object.keys(previewData.parsed.fastoria).length} categorías · {countTokens(previewData.parsed.fastoria)} tokens
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewData(null)}>
                Cancelar
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {renderTokenPreview(previewData.parsed.fastoria)}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewData(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {importing ? 'Importando...' : 'Guardar en grilla (inactivo)'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all",
                dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">Arrastrá tu brand-tokens.json acá</p>
                  <p className="text-sm text-muted-foreground mt-1">O hacé clic para seleccionar el archivo</p>
                </div>
              </div>
            </div>

            {brands.length > 0 && (
              <div className="grid gap-4">
                {brands.map((brand) => {
                  const isActive = brand.id === activeId;
                  return (
                    <div
                      key={brand.id}
                      className={cn(
                        "rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all",
                        isActive
                          ? "border-primary/30 bg-primary/5 shadow-lg ring-1 ring-primary/10"
                          : "border-border bg-card hover:border-muted-foreground/20"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>
                          <FileJson className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold truncate">{brand.name}</p>
                            {isActive && (
                              <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                                Activo
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                            <span>Logo: <span className="font-mono font-bold">{brand.logoType}</span></span>
                            <span>Premisa: <span className="font-mono font-bold">{brand.themeType}</span></span>
                            <span>{brand.colorCount} colores</span>
                            <span>{brand.tokenCount} tokens</span>
                            {brand.createdAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(brand.createdAt?.toDate?.() || brand.createdAt).toLocaleDateString?.() || 'reciente'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivate(brand.id)}
                            disabled={loading}
                            className="gap-2"
                          >
                            <Star className="h-3.5 w-3.5" /> Activar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled className="gap-2 text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-primary text-primary" /> Activo
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(brand.id)}
                          disabled={loading || isActive}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeBrand && (
              <div className="bg-muted/30 rounded-2xl p-6 border">
                <h2 className="font-bold flex items-center gap-2 mb-4">
                  <Eye className="h-4 w-4 text-primary" /> Vista previa del brand kit activo
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {renderColorSwatches(activeBrand.tokens.fastoria.color || {})}
                </div>
              </div>
            )}

            {!brands.length && (
              <div className="bg-warn/10 border border-warn/20 rounded-2xl p-5 flex items-center gap-3 text-sm text-warn">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>No hay brand kits importados. Importá un archivo <code className="font-mono font-bold bg-warn/15 px-1 rounded">brand-tokens.json</code> en formato DTCG/W3C para empezar.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function countTokens(obj: any): number {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (obj[key]?.$value !== undefined) count++;
    else if (typeof obj[key] === 'object') count += countTokens(obj[key]);
  }
  return count;
}

function renderTokenPreview(obj: any, path = ''): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const currentPath = path ? `${path}.${key}` : key;
    if (val?.$value !== undefined) {
      const displayValue = typeof val.$value === 'object' ? JSON.stringify(val.$value).slice(0, 60) : String(val.$value);
      elements.push(
        <div key={currentPath} className="bg-card border rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold truncate">{currentPath}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-2 shrink-0">{val.$type || 'unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            {val.$type === 'color' && typeof val.$value === 'string' && (
              <span className="w-5 h-5 rounded shrink-0 border" style={{ background: val.$value }} />
            )}
            <span className="text-xs font-mono text-muted-foreground truncate">{displayValue}</span>
          </div>
        </div>
      );
    } else if (typeof val === 'object') {
      elements.push(...renderTokenPreview(val, currentPath));
    }
  }
  return elements;
}

function renderColorSwatches(colors: Record<string, any>) {
  return Object.entries(colors).map(([name, val]) => {
    const color = val?.$value || '';
    return (
      <div key={name} className="space-y-1">
        <div className="h-10 rounded-lg border" style={{ background: color }} />
        <p className="text-[10px] font-mono font-bold truncate text-muted-foreground">{name}</p>
        <p className="text-[9px] font-mono text-muted-foreground/60 truncate">{color}</p>
      </div>
    );
  });
}
