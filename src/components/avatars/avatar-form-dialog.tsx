"use client";

import * as React from "react";
import {
  Avatar,
  AvatarGender,
  AvatarImageSource,
  AvatarVoice,
  AvatarVoiceProvider,
  findVoiceById,
  getAvailableAccents,
  getAvailableGenders,
  getAvailableLanguages,
  getAvailableVoices,
} from "@/domain/avatars";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileAudio,
  FileCheck,
  Image as ImageIcon,
  Loader2,
  Mic,
  Play,
  Square,
  Sparkles,
  Upload,
  Volume2,
} from "lucide-react";

const CLONING_SPEECH_GUIDE = "Hola, mi nombre es [Nombre]. Te doy la bienvenida a mi espacio de aprendizaje y mentoría. En cada lección compartiremos estrategias prácticas, ideas claras y soluciones reales para impulsar tus resultados. Con constancia, enfoque y dedicación, cada paso cuenta para alcanzar tus metas. ¡Empecemos juntos hoy mismo!";

export interface AvatarFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar?: Partial<Avatar> | null;
  onSave: (avatarData: {
    id?: string;
    name: string;
    role?: string;
    gender: AvatarGender;
    language: string;
    accent: string;
    voiceProvider: AvatarVoiceProvider;
    voiceId: string;
    customVoiceUrl?: string;
    imageUrl: string;
    imageSource: AvatarImageSource;
    isDefault: boolean;
  }) => Promise<void> | void;
  /** Callback opcional si el llamador desea manejar la reproducción de audio externa */
  onPreviewVoice?: (voice: AvatarVoice) => void;
}

const PRESET_AI_STYLES = [
  { id: 'male_chroma', label: 'Mentor Ejecutivo', url: '/avatars/avatar_chroma_male.jpg' },
  { id: 'female_chroma', label: 'Educadora Formal', url: '/avatars/avatar_chroma_female.jpg' },
  { id: 'tech_chroma', label: 'Tech & Innovación', url: '/avatars/avatar_chroma_tech.jpg' },
  { id: 'latin_chroma', label: 'Emprendedor Casual', url: '/avatars/avatar_chroma_latin.jpg' },
];

export function AvatarFormDialog({
  open,
  onOpenChange,
  avatar,
  onSave,
  onPreviewVoice,
}: AvatarFormDialogProps) {
  const { user } = useAuth();
  // Estado de Identidad
  const [name, setName] = React.useState(avatar?.name || "");
  const [role, setRole] = React.useState(avatar?.role || "Mentor / Presentador");
  const [isDefault, setIsDefault] = React.useState(avatar?.isDefault ?? false);

  // Estado de Imagen / Rostro
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [imageSource, setImageSource] = React.useState<AvatarImageSource>(
    avatar?.imageSource || 'upload'
  );
  const [imageUrl, setImageUrl] = React.useState(avatar?.imageUrl || "");
  const [imagePreview, setImagePreview] = React.useState<string | null>(avatar?.imageUrl || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Estado de Voz & Cascada de Dependencias
  const [voiceProvider, setVoiceProvider] = React.useState<AvatarVoiceProvider>(
    avatar?.voiceProvider || 'edge-tts'
  );
  const [customVoiceUrl, setCustomVoiceUrl] = React.useState(avatar?.customVoiceUrl || "");

  // 1. Sexo
  const [gender, setGender] = React.useState<AvatarGender>(avatar?.gender || "male");
  // 2. Idioma
  const [language, setLanguage] = React.useState<string>(avatar?.language || "es");
  // 3. Acento
  const [accent, setAccent] = React.useState<string>(avatar?.accent || "AR");
  // 4. Voz id
  const [voiceId, setVoiceId] = React.useState<string>(avatar?.voiceId || "es-AR-TomasNeural");

  // Estado de Audio Preview
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Estado para Clonación de Voz Real
  const [copiedSpeech, setCopiedSpeech] = React.useState(false);
  const [clonedFileName, setClonedFileName] = React.useState<string | null>(null);
  const [clonedFileSize, setClonedFileSize] = React.useState<string | null>(null);
  const [clonedDuration, setClonedDuration] = React.useState<number | null>(null);
  const [clonedWarnings, setClonedWarnings] = React.useState<string[]>([]);
  const [isPlayingClonedAudio, setIsPlayingClonedAudio] = React.useState(false);
  const clonedAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = React.useRef<HTMLInputElement>(null);

  // Reiniciar formulario al abrir con o sin datos previos
  React.useEffect(() => {
    if (open) {
      setName(avatar?.name || "");
      setRole(avatar?.role || "Mentor / Presentador");
      setIsDefault(avatar?.isDefault ?? false);
      setImageSource(avatar?.imageSource || "upload");
      setImageUrl(avatar?.imageUrl || "");
      setImagePreview(avatar?.imageUrl || null);
      setVoiceProvider(avatar?.voiceProvider || "edge-tts");
      setCustomVoiceUrl(avatar?.customVoiceUrl || "");
      setGender(avatar?.gender || "male");
      setLanguage(avatar?.language || "es");
      setAccent(avatar?.accent || "AR");
      setVoiceId(avatar?.voiceId || "es-AR-TomasNeural");
      setIsPlayingAudio(false);
      setIsPlayingClonedAudio(false);
      setClonedFileName(null);
      setClonedFileSize(null);
      setClonedDuration(null);
      setClonedWarnings([]);
    } else {
      // Detener audio al cerrar modal
      stopAudioPlayback();
    }
  }, [open, avatar]);

  // Manejar parada de audio seguro
  const stopAudioPlayback = React.useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (clonedAudioRef.current) {
      clonedAudioRef.current.pause();
      clonedAudioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setIsPlayingClonedAudio(false);
  }, []);

  // Listas derivadas de la cascada
  const availableGenders = React.useMemo(() => getAvailableGenders(), []);

  const availableLanguages = React.useMemo(
    () => getAvailableLanguages(gender),
    [gender]
  );

  const availableAccents = React.useMemo(
    () => getAvailableAccents(gender, language),
    [gender, language]
  );

  const availableVoices = React.useMemo(
    () => getAvailableVoices(gender, language, accent),
    [gender, language, accent]
  );

  const currentVoiceObj = React.useMemo(
    () => findVoiceById(voiceId) || availableVoices[0],
    [voiceId, availableVoices]
  );

  // Sincronizar cascada cuando cambia el sexo
  const handleGenderChange = (newGender: AvatarGender) => {
    setGender(newGender);
    const validLanguages = getAvailableLanguages(newGender);
    const nextLang = validLanguages.some((l) => l.value === language)
      ? language
      : validLanguages[0]?.value || "es";
    setLanguage(nextLang);

    const validAccents = getAvailableAccents(newGender, nextLang);
    const nextAccent = validAccents.some((a) => a.value === accent)
      ? accent
      : validAccents[0]?.value || "AR";
    setAccent(nextAccent);

    const validVoices = getAvailableVoices(newGender, nextLang, nextAccent);
    if (validVoices.length > 0) {
      setVoiceId(validVoices[0].id);
    }
    stopAudioPlayback();
  };

  // Sincronizar cascada cuando cambia el idioma
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const validAccents = getAvailableAccents(gender, newLang);
    const nextAccent = validAccents.some((a) => a.value === accent)
      ? accent
      : validAccents[0]?.value || "AR";
    setAccent(nextAccent);

    const validVoices = getAvailableVoices(gender, newLang, nextAccent);
    if (validVoices.length > 0) {
      setVoiceId(validVoices[0].id);
    }
    stopAudioPlayback();
  };

  // Sincronizar cascada cuando cambia el acento
  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    const validVoices = getAvailableVoices(gender, language, newAccent);
    if (validVoices.length > 0) {
      setVoiceId(validVoices[0].id);
    }
    stopAudioPlayback();
  };

  // Preescucha de la voz real (Edge-TTS Streaming)
  const handleTogglePreviewAudio = () => {
    if (isPlayingAudio) {
      stopAudioPlayback();
      return;
    }

    if (!currentVoiceObj) return;

    if (onPreviewVoice) {
      onPreviewVoice(currentVoiceObj);
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlayingAudio(true);
      const previewUrl = `/api/tts/preview?voiceId=${encodeURIComponent(currentVoiceObj.id)}&text=${encodeURIComponent(currentVoiceObj.sampleText)}`;
      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        setIsPlayingAudio(false);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(currentVoiceObj.sampleText);
          utterance.onstart = () => setIsPlayingAudio(true);
          utterance.onend = () => setIsPlayingAudio(false);
          utterance.onerror = () => setIsPlayingAudio(false);
          window.speechSynthesis.speak(utterance);
        }
      };

      audio.play().catch(() => {
        setIsPlayingAudio(false);
      });
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // Manejo de carga de archivo de imagen
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vista previa inmediata con base64 local
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setImageUrl(base64);
    };
    reader.readAsDataURL(file);

    // Subida asíncrona a Firebase Storage si hay usuario autenticado
    if (user) {
      try {
        setIsUploadingImage(true);
        const token = await user.getIdToken();
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/avatars/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.imageUrl) {
            setImageUrl(json.imageUrl);
            setImagePreview(json.imageUrl);
          }
        }
      } catch (err) {
        console.warn('[AvatarFormDialog] Error en subida a storage, usando fallback local:', err);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  // Manejo de carga de archivo de audio para clonación
  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const warnings: string[] = [];
    const validExtensions = ['.mp3', '.wav', '.m4a'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt && !file.type.startsWith('audio/')) {
      warnings.push('Formato incompatible: se requiere un archivo .mp3, .wav o .m4a.');
    }

    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      warnings.push(`El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB (el límite es 15 MB).`);
    }

    setClonedFileName(file.name);
    setClonedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);

    const objectUrl = URL.createObjectURL(file);
    const audioObj = new Audio(objectUrl);
    audioObj.onloadedmetadata = () => {
      const dur = Math.round(audioObj.duration);
      setClonedDuration(dur);
      if (dur < 8) {
        warnings.push(`Duración: ${dur}s. Es muy corto (mínimo 15 segundos recomendados para clonación).`);
      } else if (dur > 90) {
        warnings.push(`Duración: ${dur}s. Es muy largo (se recomiendan entre 15s y 45s).`);
      }
      setClonedWarnings([...warnings]);
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomVoiceUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Copiar guión al portapapeles
  const handleCopySpeech = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const personalizedSpeech = CLONING_SPEECH_GUIDE.replace('[Nombre]', name.trim() || 'tu nombre');
      navigator.clipboard.writeText(personalizedSpeech);
      setCopiedSpeech(true);
      setTimeout(() => setCopiedSpeech(false), 2000);
    }
  };

  // Reproducir/detener muestra subida de voz clonada
  const handleTogglePlayClonedAudio = () => {
    if (isPlayingClonedAudio) {
      if (clonedAudioRef.current) {
        clonedAudioRef.current.pause();
        clonedAudioRef.current.currentTime = 0;
      }
      setIsPlayingClonedAudio(false);
      return;
    }

    if (!customVoiceUrl) return;

    try {
      if (clonedAudioRef.current) {
        clonedAudioRef.current.pause();
      }
      const audio = new Audio(customVoiceUrl);
      clonedAudioRef.current = audio;
      setIsPlayingClonedAudio(true);
      audio.onended = () => setIsPlayingClonedAudio(false);
      audio.onerror = () => setIsPlayingClonedAudio(false);
      audio.play().catch(() => setIsPlayingClonedAudio(false));
    } catch {
      setIsPlayingClonedAudio(false);
    }
  };

  // Guardar formulario
  const handleSubmit = async () => {
    if (!name.trim()) {
      throw new Error("Por favor ingresa un nombre para el avatar.");
    }
    if (!imageUrl.trim()) {
      throw new Error("Por favor proporciona una imagen o selecciona un rostro para el avatar.");
    }
    if (voiceProvider === "edge-tts" && !voiceId) {
      throw new Error("Por favor selecciona una voz para el avatar.");
    }
    if (voiceProvider === "cloned") {
      if (!customVoiceUrl) {
        throw new Error("Por favor sube una grabación de tu voz en formato MP3 o WAV.");
      }
      if (clonedWarnings.some(w => w.includes('incompatible') || w.includes('límite es 15 MB'))) {
        throw new Error("El archivo de audio no cumple con las condiciones técnicas obligatorias.");
      }
    }

    await onSave({
      id: avatar?.id,
      name: name.trim(),
      role: role.trim() || "Mentor / Presentador",
      gender,
      language,
      accent,
      voiceProvider,
      voiceId: voiceProvider === "cloned" ? "cloned-custom" : voiceId,
      customVoiceUrl: voiceProvider === "cloned" ? customVoiceUrl : undefined,
      imageUrl: imageUrl.trim(),
      imageSource,
      isDefault,
    });

    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopAudioPlayback();
        onOpenChange(v);
      }}
      title={avatar?.id ? "Editar Avatar" : "Nuevo Avatar de Marca"}
      description="Configura el rostro y la voz sintética o clonada que representarán tus contenidos."
      icon={<Bot className="h-6 w-6" />}
      maxWidth="sm:max-w-4xl max-w-full"
      submitLabel={avatar?.id ? "Actualizar Avatar" : "Guardar Avatar"}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
        {/* ── COLUMNA 1: ROSTRO & IDENTIDAD ── */}
        <div className="space-y-5 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm tracking-tight text-foreground">
                Identidad y Rostro
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Paso 1
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="avatar-name" className="text-xs font-medium text-foreground">
                Nombre del Avatar *
              </Label>
              <Input
                id="avatar-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Martín - Presentador Tech"
                className="mt-1 h-9"
              />
            </div>

            <div>
              <Label htmlFor="avatar-role" className="text-xs font-medium text-foreground">
                Rol o Contexto
              </Label>
              <Input
                id="avatar-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ej. Instructor de Cursos / Videos de Ventas"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          {/* Origen de Imagen */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-foreground">Imagen del Rostro *</Label>
            <Tabs
              value={imageSource}
              onValueChange={(v) => setImageSource(v as 'upload' | 'ai-generated')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
                <TabsTrigger value="upload" className="text-xs">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Subir Foto
                </TabsTrigger>
                <TabsTrigger value="ai-generated" className="text-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Presets / URL
                </TabsTrigger>
              </TabsList>

              {/* Subir archivo */}
              <TabsContent value="upload" className="mt-3 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                  className="cursor-pointer border border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center transition-colors bg-muted/20 hover:bg-muted/30"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="h-6 w-6 mx-auto text-primary mb-1 animate-spin" />
                      <p className="text-xs font-medium text-foreground">
                        Subiendo imagen a Firebase Storage...
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Optimizando resolución y CDN
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-medium text-foreground">
                        Hacé clic para seleccionar una foto de tu rostro
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        JPG, PNG o WEBP (máx. 5MB)
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>


              {/* Presets IA o URL */}
              <TabsContent value="ai-generated" className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_AI_STYLES.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => {
                        setImageUrl(preset.url);
                        setImagePreview(preset.url);
                      }}
                      className={`text-left p-2 rounded-md border text-xs transition-all flex items-center gap-2 ${
                        imageUrl === preset.url
                          ? "border-primary bg-primary/10 font-semibold"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <Label htmlFor="image-url" className="text-[11px] text-muted-foreground">
                    O pega una URL directa de imagen:
                  </Label>
                  <Input
                    id="image-url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://..."
                    className="mt-1 h-8 text-xs font-mono"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Preview visual del rostro */}
            {imagePreview && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                <img
                  src={imagePreview}
                  alt="Avatar preview"
                  className="w-14 h-14 rounded-md object-cover border border-border"
                />
                <div className="text-xs space-y-0.5 flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {name || "Vista previa del rostro"}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Imagen cargada correctamente
                  </p>
                </div>
              </div>
            )}

            {/* Guía de encuadre para Lip-Sync y Chroma Key FFmpeg */}
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Fondo Verde (Chroma Key #00FF00) para FFmpeg:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong className="text-foreground">Fondo verde puro:</strong> Obligatorio para que FFmpeg recorte la silueta y superponga el presentador sobre cualquier fondo o diapositiva de tus clases.</li>
                <li><strong className="text-foreground">Encuadre frontal:</strong> Mirada directa a cámara con hombros visibles.</li>
                <li><strong className="text-foreground">Boca cerrada y neutra:</strong> Fundamental para que el modelo sincronice los labios sin artefactos.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── COLUMNA 2: VOZ & AUDIO ── */}
        <div className="space-y-5 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm tracking-tight text-foreground">
                Configuración de Voz
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Paso 2
            </Badge>
          </div>

          {/* Selector de Proveedor de Voz */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-foreground">Modo de Voz</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVoiceProvider("edge-tts")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  voiceProvider === "edge-tts"
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  <span>Voz Sintética (TTS)</span>
                </div>
                <p className="text-[10px] font-normal text-muted-foreground mt-0.5">
                  14 voces neurales gratis
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVoiceProvider("cloned")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  voiceProvider === "cloned"
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Mic className="h-3.5 w-3.5 text-primary" />
                  <span>Voz Real (Clonada)</span>
                </div>
                <p className="text-[10px] font-normal text-muted-foreground mt-0.5">
                  Audio propio para clonación
                </p>
              </button>
            </div>
          </div>

          {/* CASO A: Cascada de Selección para Voz Sintética */}
          {voiceProvider === "edge-tts" ? (
            <div className="space-y-3.5">
              {/* 1. Sexo / Género */}
              <div>
                <Label className="text-xs font-medium text-foreground">
                  1. Sexo del Presentador
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {availableGenders.map((g) => (
                    <Button
                      key={g.value}
                      type="button"
                      variant={gender === g.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleGenderChange(g.value)}
                      className="h-8 text-xs font-medium"
                    >
                      {g.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 2. Idioma */}
              <div>
                <Label htmlFor="voice-lang" className="text-xs font-medium text-foreground">
                  2. Idioma
                </Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="voice-lang" className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Seleccionar idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Acento / País */}
              <div>
                <Label htmlFor="voice-accent" className="text-xs font-medium text-foreground">
                  3. Acento y Región
                </Label>
                <Select value={accent} onValueChange={handleAccentChange}>
                  <SelectTrigger id="voice-accent" className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Seleccionar acento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccents.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">
                        {a.flag} {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Voz Específica */}
              <div>
                <Label htmlFor="voice-id" className="text-xs font-medium text-foreground">
                  4. Voz Asignada
                </Label>
                <Select
                  value={voiceId}
                  onValueChange={(val) => {
                    setVoiceId(val);
                    stopAudioPlayback();
                  }}
                >
                  <SelectTrigger id="voice-id" className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Seleccionar voz" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        <span className="font-semibold">{v.name}</span> — {v.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Caja de Muestra y Botón de Preescucha */}
              {currentVoiceObj && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{currentVoiceObj.flag}</span>
                      <span>{currentVoiceObj.name} ({currentVoiceObj.accentName})</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Edge-TTS Neural
                    </Badge>
                  </div>

                  <p className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 py-0.5">
                    "{currentVoiceObj.sampleText}"
                  </p>

                  <Button
                    type="button"
                    variant={isPlayingAudio ? "destructive" : "secondary"}
                    size="sm"
                    onClick={handleTogglePreviewAudio}
                    className="w-full h-8 text-xs font-semibold gap-1.5 mt-1"
                  >
                    {isPlayingAudio ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current" />
                        Detener Muestra
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Escuchar Muestra de Voz
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* CASO B: Voz Real (Clonada) */
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-3.5">
              {/* 1. Guión de Calibración Fonética */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Guión de Calibración para Leer
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySpeech}
                    className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    {copiedSpeech ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Guión</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-2.5 rounded-md border border-border bg-background/80 text-xs leading-relaxed text-foreground select-all font-sans italic">
                  "{CLONING_SPEECH_GUIDE.replace('[Nombre]', name.trim() || 'tu nombre')}"
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary/70" />
                    <span>Lectura: ~25 a 35 seg</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mic className="h-3 w-3 text-primary/70" />
                    <span>Sin eco ni música</span>
                  </div>
                </div>
              </div>

              {/* 2. Subida de Archivo MP3 / WAV */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold text-foreground">
                  Subir Muestra Grabada (.mp3, .wav) *
                </Label>

                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/m4a,audio/x-m4a,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={handleAudioFileSelect}
                />

                {!clonedFileName && !customVoiceUrl ? (
                  <div
                    onClick={() => audioFileInputRef.current?.click()}
                    className="cursor-pointer border border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center transition-colors bg-background/50 hover:bg-background/80"
                  >
                    <FileAudio className="h-7 w-7 mx-auto text-primary mb-1.5 opacity-80" />
                    <p className="text-xs font-semibold text-foreground">
                      Hacé clic para cargar tu archivo de audio
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      MP3, WAV o M4A (máx. 15MB, recomendado 15s a 45s)
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <div className="text-xs truncate">
                          <p className="font-semibold text-foreground truncate">
                            {clonedFileName || "Muestra de voz cargada"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {clonedFileSize ? `${clonedFileSize} • ` : ""}{clonedDuration ? `${clonedDuration}s de duración` : "Audio válido"}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Cambiar
                      </Button>
                    </div>

                    {/* Reproductor de muestra */}
                    {customVoiceUrl && (
                      <Button
                        type="button"
                        variant={isPlayingClonedAudio ? "destructive" : "secondary"}
                        size="sm"
                        onClick={handleTogglePlayClonedAudio}
                        className="w-full h-8 text-xs font-semibold gap-1.5"
                      >
                        {isPlayingClonedAudio ? (
                          <>
                            <Square className="h-3.5 w-3.5 fill-current" />
                            Detener Grabación
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Escuchar Mi Grabación
                          </>
                        )}
                      </Button>
                    )}

                    {/* Validación y advertencias */}
                    {clonedWarnings.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {clonedWarnings.map((warn, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>¡Grabación óptima lista para clonación neural!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN GLOBAL: AVATAR POR DEFECTO ── */}
      <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card mt-2">
        <div className="space-y-0.5 pr-4">
          <Label htmlFor="is-default-switch" className="text-xs font-semibold text-foreground cursor-pointer">
            Establecer como Avatar Principal
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Este avatar se seleccionará automáticamente en campañas de marketing y clases de cursos.
          </p>
        </div>
        <Switch
          id="is-default-switch"
          checked={isDefault}
          onCheckedChange={setIsDefault}
        />
      </div>
    </FormDialog>
  );
}
