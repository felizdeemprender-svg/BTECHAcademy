'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Music, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface AudioUploaderProps {
  pageId: string;
  onUploadComplete: (data: { url: string; duration: number; filename: string }) => void;
  currentAudioUrl?: string;
}

export function AudioUploader({ pageId, onUploadComplete, currentAudioUrl }: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<{ duration: number; filename: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Por favor, selecciona un archivo de audio (MP3, WAV, etc.)'
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // 1. Obtener duración del audio locally
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      
      const duration = await new Promise<number>((resolve) => {
        audio.onloadedmetadata = () => {
          resolve(audio.duration);
          URL.revokeObjectURL(objectUrl);
        };
      });

      // 2. Inicializar Firebase Storage
      const { storage } = initializeFirebase();
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `sales_pages/${pageId}/audio/${filename}`);

      // 3. Subir archivo
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
          toast({
            variant: 'destructive',
            title: 'Error de subida',
            description: 'No se pudo subir el archivo de audio.'
          });
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setUploading(false);
          setMetadata({ duration, filename });
          onUploadComplete({ url: downloadUrl, duration, filename });
          toast({
            title: 'Audio sincronizado',
            description: 'La música ha sido cargada y procesada correctamente.'
          });
        }
      );
    } catch (err) {
      console.error("Audio processing error:", err);
      setUploading(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Banda Sonora Personalizada</p>
            <p className="text-[10px] font-bold text-slate-500 italic">Sincronización automática con la duración del video</p>
          </div>
        </div>
        
        {!uploading && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-xl bg-white text-slate-950 hover:bg-slate-200 transition-all h-10 px-6 font-black text-[10px] uppercase tracking-wider shadow-lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {currentAudioUrl ? 'Cambiar Audio' : 'Subir MP3'}
          </Button>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="audio/*"
        onChange={handleFileSelect}
      />

      {uploading && (
        <div className="space-y-2 animate-in fade-in">
          <div className="flex justify-between text-[10px] font-black uppercase">
            <span className="text-violet-400 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Subiendo Assets...
            </span>
            <span className="text-white">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/10" />
        </div>
      )}

      {currentAudioUrl && !uploading && (
        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/10 animate-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white truncate">Audio Sincronizado</p>
            <audio src={currentAudioUrl} controls className="h-6 w-full mt-1 accent-violet-500 invert brightness-200" />
          </div>
        </div>
      )}

      {!currentAudioUrl && !uploading && (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-amber-500/20 border-dashed">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <p className="text-[10px] font-medium text-amber-500/80">No hay música asignada. El video se generará sin audio o con un loop genérico.</p>
        </div>
      )}
    </div>
  );
}
