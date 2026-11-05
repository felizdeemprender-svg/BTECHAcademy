'use client';

import { useState, useRef, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Sparkles, 
  Upload, 
  Trash2, 
  RefreshCw,
  Image as ImageIcon,
  Download,
  Wand2
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
  allowPromptEdit?: boolean;
  promptValue?: string;
  onPromptChange?: (prompt: string) => void;
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
  courseTitle,
  allowPromptEdit = false,
  promptValue,
  onPromptChange
}: ImageEditorProps) {
  const { profile } = useAuth();
  const { storage } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [suggestingPrompt, setSuggestingPrompt] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(promptValue || '');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (promptValue !== undefined && promptValue !== customPrompt) {
      setCustomPrompt(promptValue);
    }
  }, [promptValue]);

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



  const handleSuggestPrompt = async () => {
    setSuggestingPrompt(true);
    try {
      const baseContext = aiPromptHint || (description ? `Descripción: ${description}. ` : '') + (label || '');
      const userDraftHint = customPrompt.trim() ? ` Idea base del autor: ${customPrompt.trim()}.` : '';
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'prompt_only',
          keywords: keywords || '',
          courseTitle: courseTitle || keywords || '',
          contextHint: `${baseContext}${userDraftHint}`.trim(),
          channel,
          uid: profile?.uid,
          role: profile?.role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.generatedPrompt) {
        throw new Error(data?.error || 'No se pudo sugerir el prompt.');
      }
      setCustomPrompt(data.generatedPrompt);
      onPromptChange?.(data.generatedPrompt);
      setShowPromptEditor(true);
      toast({ title: 'Prompt sugerido listo', description: 'Podés revisarlo o editarlo antes de generar la imagen.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al sugerir prompt', description: err.message });
    } finally {
      setSuggestingPrompt(false);
    }
  };

  const handleGenerateAi = async (engine: 'free' | 'premium' = 'free', useCustomPrompt: boolean = false) => {
    setGeneratingAi(true);
    try {
      const promptToSend = useCustomPrompt && customPrompt.trim().length > 0 ? customPrompt.trim() : '';
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptToSend,
          keywords: keywords || '',
          courseTitle: courseTitle || keywords || '',
          contextHint: aiPromptHint || (description ? `Descripción: ${description}. ` : '') + (label || ''),
          engine,
          channel,
          uid: profile?.uid,
          role: profile?.role
        }),
      });

      const data = await res.json();
      if (!data || !res.ok || !data.imageDataUrl) {
        throw new Error(data?.error || 'No se recibió imagen de la IA o formato inválido.');
      }

      if (data.generatedPrompt) {
        setCustomPrompt(data.generatedPrompt);
        onPromptChange?.(data.generatedPrompt);
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

  const isBusy = uploading || generatingAi || suggestingPrompt;

  return (
    <div className="space-y-3">
      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center">
          {url && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 border-success/30 text-success hover:bg-success/10 gap-2 font-bold text-[10px] uppercase tracking-widest"
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
        {/* Botón adicional opcional: Ver / Editar Prompt de IA */}
        {allowPromptEdit && (
          <Button
            variant={showPromptEditor ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-10 px-3 shrink-0 gap-1.5 font-bold text-xs',
              showPromptEditor
                ? 'bg-primary text-primary-foreground'
                : 'border-primary/30 text-primary hover:bg-primary/10'
            )}
            onClick={() => setShowPromptEditor(prev => !prev)}
            disabled={isBusy}
            title="Configurar y editar el prompt visual de IA"
            type="button"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Prompt IA
          </Button>
        )}
        {/* Botón Free IA — siempre visible */}
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 shrink-0 border-border text-primary hover:bg-primary/10" 
          onClick={() => handleGenerateAi('free', Boolean(customPrompt.trim()))}
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
          className="h-10 w-10 shrink-0 border-primary/30 text-primary hover:bg-primary/15" 
          onClick={() => handleGenerateAi('premium', Boolean(customPrompt.trim()))}
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
          className="h-10 w-10 shrink-0 border-border" 
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

      {allowPromptEdit && showPromptEditor && (
        <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-foreground">Dirección Visual (Prompt de Portada)</p>
              <p className="text-[11px] text-muted-foreground">
                Pedile a la IA una propuesta basada en tu curso o escribí tu propia escena antes de renderizar.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              onClick={handleSuggestPrompt}
              disabled={isBusy}
            >
              {suggestingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Sugerir Prompt con IA
            </Button>
          </div>
          <Textarea
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
              onPromptChange?.(e.target.value);
            }}
            placeholder="Describí la escena, atmósfera, objetos e iluminación que querés en la portada (o tocá 'Sugerir Prompt con IA')..."
            className="min-h-[88px] bg-white text-xs font-medium"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-4 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white"
              onClick={() => handleGenerateAi('premium', true)}
              disabled={isBusy || !customPrompt.trim()}
            >
              {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generar Portada con este Prompt
            </Button>
          </div>
        </div>
      )}
      {generatingAi && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse px-1">
          <Sparkles className="h-3 w-3" />
          Procesando con Motor IA Inteligente...
        </div>
      )}
      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-muted bg-muted">
        {(url && typeof url === 'string') ? (
          <Image src={url} alt="Preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-border gap-2">
            <ImageIcon className="h-8 w-8 opacity-20" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Sin imagen</span>
          </div>
        )}
      </div>
    </div>
  );
}
