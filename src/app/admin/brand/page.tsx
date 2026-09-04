'use client';


import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Upload, Check, FileJson, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminBrandPage() {
  const db = useFirestore();
  const { profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [brandData, setBrandData] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const brandsRef = useMemoFirebase(() => doc(db, 'config', 'brands'), [db]);
  const { data: brandsDoc } = useDoc(brandsRef);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast({ title: 'Formato inválido', description: 'Solo .json', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.fastoria) {
          toast({ title: 'Estructura inválida', description: 'Falta nodo "fastoria"', variant: 'destructive' });
          return;
        }
        setBrandData(parsed);
        toast({ title: 'Archivo cargado', description: `${file.name} — ${Object.keys(parsed.fastoria).length} categorías` });
      } catch {
        toast({ title: 'Error de parsing', description: 'JSON inválido', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!profile?.roles.includes('admin') || !brandData) return;
    setLoading(true);
    try {
      const t = brandData.fastoria;
      const tokenCount = countTokens(t);
      const items: any[] = brandsDoc?.items || [];
      const activeId: string | null = brandsDoc?.activeId || null;

      const newItem = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: fileName.replace('.json', ''),
        tokens: brandData,
        logoType: t.theme?.['logo-selected']?.$value || 'arc',
        themeType: t.theme?.active?.$value || 'institucional',
        createdAt: new Date().toISOString(),
        updatedBy: profile.uid,
        colorCount: Object.keys(t.color || {}).length,
        tokenCount
      };

      items.push(newItem);

      await setDoc(brandsRef, { items, activeId }, { merge: false });

      toast({ title: 'Brand kit importado', description: 'Aparece en la grilla. Activá el que quieras desde ahí.' });

      setTimeout(() => router.push('/admin/theme'), 800);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: brandsRef.path, operation: 'update', requestResourceData: { tokens: brandData }
      }));
      toast({ title: 'Error al guardar', description: e.message || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Importar Brand Kit</h1>
            <p className="text-muted-foreground text-lg font-medium">Subí un <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">brand-tokens.json</code> (DTCG/W3C). Se agrega inactivo a la grilla.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/theme')} className="gap-2">
            Ir a la grilla
          </Button>
        </header>

        {!brandData ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">Arrastrá tu archivo acá o hacé clic</p>
                <p className="text-sm text-muted-foreground mt-1">brand-tokens.json · DTCG/W3C Design Tokens</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-3">
                <FileJson className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-bold text-sm">{fileName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {Object.keys(brandData.fastoria).length} categorías · {countTokens(brandData.fastoria)} tokens
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setBrandData(null); setFileName(''); }}>
                Cambiar archivo
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {renderTokenPreview(brandData.fastoria)}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => { setBrandData(null); setFileName(''); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {loading ? 'Guardando...' : 'Guardar en grilla (inactivo)'}
              </Button>
            </div>
          </div>
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
