'use client';

import { useState, useRef, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Sparkles, 
  Upload, 
  Trash2, 
  RefreshCw,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-context';
import { cn } from '@/lib/utils';

interface ImageEditorProps {
  url: string;
  onUpdate: (url: string) => void;
  label: string;
  courseId: string;
  channel: string;
  keywords?: string;
  description?: string;
  aiPromptHint?: string;
  courseTitle?: string;
}

export function ImageEditor({ 
  url, 
  onUpdate, 
  label,
  courseId,
  channel,
  keywords,
  description,
  aiPromptHint,
  courseTitle
}: ImageEditorProps) {
  const { profile } = useAuth();
  const { storage } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [filters, setFilters] = useState('');

  useEffect(() => {
    // legacy cleanup ignored
  }, [url, keywords]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storagePath = `campaigns/${courseId}/${channel}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(sRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      onUpdate(downloadUrl);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error al subir la imagen' });
    } finally {
      setUploading(false);
    }
  };



  const handleGenerateAi = async (engine: 'free' | 'premium' = 'free') => {
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: '',
          keywords: keywords || '',
          courseTitle: courseTitle || '',
          contextHint: aiPromptHint || (description ? `Descripción: ${description}. ` : '') + (label || ''),
          engine,
          channel
        }),
      });

      const data = await res.json();
      if (!data || !res.ok || !data.imageDataUrl) {
        throw new Error(data?.error || 'No se recibió imagen de la IA o formato inválido.');
      }

      // DEBUG: Mostrar el prompt generado por Gemini para verificar
      if (data.generatedPrompt) {
        toast({ title: 'Prompt Generado (Debug)', description: data.generatedPrompt, duration: 8000 });
      }

      // Subir a Firebase Storage para no exceder el límite de 1MB de Firestore (Data URI)
      toast({ title: 'Subiendo a la nube...', description: 'Optimizando la imagen generada...' });
      const storagePath = `campaigns/${courseId}/${channel}/ai_${Date.now()}.jpg`;
      const sRef = ref(storage, storagePath);
      await uploadString(sRef, data.imageDataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(sRef);

      onUpdate?.(downloadUrl);
      
      toast({ title: 'Imagen de IA lista', description: 'La imagen ha sido subida y está lista para guardarse.' });
    } catch (err: any) {
      console.error('[AI Image]', err);
      toast({ variant: 'destructive', title: 'Error de generación IA', description: err.message });
    } finally {
      setGeneratingAi(false);
    }
  };

  const isBusy = uploading || generatingAi;

  return (
    <div className="space-y-3">
      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center">
          {url && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 border-emerald-300 text-emerald-600 hover:bg-emerald-50 gap-2 font-bold text-[10px] uppercase tracking-widest"
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = `imagen_generada_${Date.now()}.jpg`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              title="Descargar imagen a tu computadora"
              type="button"
            >
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          )}
        </div>
        {/* Botón Free IA — siempre visible */}
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 shrink-0 border-slate-200 text-violet-500 hover:bg-violet-50" 
          onClick={() => handleGenerateAi('free')}
          disabled={isBusy}
          title="Regenerar con IA Free (Gemini)"
          type="button"
        >
          {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        {/* Botón Pro IA — para usuarios premium */}
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 shrink-0 border-violet-300 text-violet-600 hover:bg-violet-100" 
          onClick={() => handleGenerateAi('premium')}
          disabled={isBusy}
          title="Generar con IA Premium"
          type="button"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        {/* Botón subir imagen local */}
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 shrink-0 border-slate-200" 
          onClick={() => fileRef.current?.click()}
          disabled={isBusy}
          title="Subir imagen local"
          type="button"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4" />}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10" 
          onClick={() => onUpdate('')}
          disabled={isBusy}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
      </div>
      {generatingAi && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-violet-500 animate-pulse px-1">
          <Sparkles className="h-3 w-3" />
          Procesando con Motor IA Inteligente...
        </div>
      )}
      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50">
        {(url && typeof url === 'string') ? (
          <Image src={url} alt="Preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-2">
            <ImageIcon className="h-8 w-8 opacity-20" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Sin imagen</span>
          </div>
        )}
      </div>
    </div>
  );
}
