'use client';

import { useState, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';

interface ImageEditorProps {
  url: string;
  onUpdate: (url: string) => void;
  label: string;
  courseId: string;
  channel: string;
  keywords?: string;
  aiPromptHint?: string;
}

export function ImageEditor({ 
  url, 
  onUpdate, 
  label,
  courseId,
  channel,
  keywords,
  aiPromptHint
}: ImageEditorProps) {
  const { storage } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const randomize = () => {
    const seed = Math.floor(Math.random() * 100000);
    const baseTags = ['business', 'learning', 'office', 'startup', 'student', 'success', 'meeting', 'workspace'];
    const randomTag = baseTags[Math.floor(Math.random() * baseTags.length)];
    onUpdate(`https://loremflickr.com/800/800/${randomTag},professional?lock=${seed}`);
  };

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    try {
      const baseKw = keywords?.split(',').slice(0, 4).join(', ') || 'education, online course, professional';
      const hint = aiPromptHint || label;
      const prompt = `High quality marketing photo for an online course about ${baseKw}. Context: ${hint}. Photorealistic, clean background, professional lighting, 4:3 aspect ratio. No text overlays.`;

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok || !data.imageDataUrl) {
        throw new Error(data.error || 'No se recibió imagen de la IA.');
      }

      const base64 = data.imageDataUrl.split(',')[1];
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const storagePath = `campaigns/${courseId}/${channel}/ai_${Date.now()}.jpg`;
      const sRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(sRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      onUpdate(downloadUrl);
      toast({ title: '¡Imagen generada con IA!', description: 'Guardada en Storage y lista para usar.' });
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
        <Input 
          value={url} 
          onChange={e => onUpdate(e.target.value)} 
          className="h-10 text-[10px] font-mono bg-slate-50 text-slate-900 border-none px-4"
          placeholder="URL de la imagen..."
        />
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 shrink-0 border-slate-200" 
          onClick={randomize}
          disabled={isBusy}
          title="Imagen aleatoria por temática"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 shrink-0 border-violet-200 text-violet-600 hover:bg-violet-50" 
          onClick={handleGenerateAi}
          disabled={isBusy}
          title="Generar imagen con IA"
          type="button"
        >
          {generatingAi ? <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> : <Sparkles className="h-4 w-4" />}
        </Button>
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
          Generando imagen con IA y guardando en Storage...
        </div>
      )}
      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-inner">
        {url ? (
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
