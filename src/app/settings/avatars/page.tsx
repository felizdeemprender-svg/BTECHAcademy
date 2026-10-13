'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarGender, findVoiceById } from '@/domain/avatars';
import { AvatarCard, AvatarFormDialog } from '@/components/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Sparkles,
  Search,
  Volume2,
  Users,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

// Avatares predeterminados iniciales si la cuenta aún no tiene creados (Con fondo verde para croma FFmpeg)
const INITIAL_DEFAULT_AVATARS: Avatar[] = [
  {
    id: 'avatar-tomas-ar',
    name: 'Tomás — Presentador Tech',
    role: 'Instructor y Anuncios de Marketing',
    gender: 'male',
    language: 'es',
    accent: 'AR',
    voiceProvider: 'edge-tts',
    voiceId: 'es-AR-TomasNeural',
    imageUrl: '/avatars/avatar_chroma_male.jpg',
    imageSource: 'ai-generated',
    isDefault: true,
  },
  {
    id: 'avatar-elena-ar',
    name: 'Elena — Educadora',
    role: 'Clases Teóricas y Bienvenidas',
    gender: 'female',
    language: 'es',
    accent: 'AR',
    voiceProvider: 'edge-tts',
    voiceId: 'es-AR-ElenaNeural',
    imageUrl: '/avatars/avatar_chroma_female.jpg',
    imageSource: 'ai-generated',
    isDefault: false,
  },
  {
    id: 'avatar-jorge-mx',
    name: 'Jorge — Comercial',
    role: 'Campañas de Prospección y Ventas',
    gender: 'male',
    language: 'es',
    accent: 'MX',
    voiceProvider: 'edge-tts',
    voiceId: 'es-MX-JorgeNeural',
    imageUrl: '/avatars/avatar_chroma_latin.jpg',
    imageSource: 'ai-generated',
    isDefault: false,
  },
];

export default function AvatarsDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Carga inicial (LocalStorage con fallback a INITIAL_DEFAULT_AVATARS)
  useEffect(() => {
    try {
      const storageKey = user?.uid ? `fastoria_avatars_${user.uid}` : 'fastoria_avatars_guest';
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvatars(parsed);
          return;
        }
      }
      setAvatars(INITIAL_DEFAULT_AVATARS);
    } catch {
      setAvatars(INITIAL_DEFAULT_AVATARS);
    }
  }, [user?.uid]);

  // Guardar en almacenamiento local
  const persistAvatars = (nextList: Avatar[]) => {
    setAvatars(nextList);
    try {
      const storageKey = user?.uid ? `fastoria_avatars_${user.uid}` : 'fastoria_avatars_guest';
      localStorage.setItem(storageKey, JSON.stringify(nextList));
    } catch (err) {
      console.warn('No se pudo persistir en localStorage:', err);
    }
  };

  // Crear o actualizar avatar
  const handleSaveAvatar = async (data: Partial<Avatar>) => {
    let nextList: Avatar[] = [];

    if (data.id) {
      // Actualizar existente
      nextList = avatars.map((item) => {
        if (item.id === data.id) {
          const updated: Avatar = {
            ...item,
            ...data,
            name: data.name || item.name,
            role: data.role || item.role,
            gender: data.gender || item.gender,
            language: data.language || item.language,
            accent: data.accent || item.accent,
            voiceProvider: data.voiceProvider || item.voiceProvider,
            voiceId: data.voiceId || item.voiceId,
            imageUrl: data.imageUrl || item.imageUrl,
            imageSource: data.imageSource || item.imageSource,
            isDefault: data.isDefault ?? item.isDefault,
            updatedAt: new Date(),
          };
          return updated;
        }
        // Si este nuevo se marca como default, desmarcar los otros
        if (data.isDefault) {
          return { ...item, isDefault: false };
        }
        return item;
      });
      toast({
        title: 'Avatar actualizado',
        description: `Los cambios para "${data.name}" se guardaron correctamente.`,
      });
    } else {
      // Crear nuevo
      const newAvatar: Avatar = {
        id: `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: user?.uid,
        name: data.name || 'Nuevo Avatar',
        role: data.role || 'Mentor / Presentador',
        gender: data.gender || 'male',
        language: data.language || 'es',
        accent: data.accent || 'AR',
        voiceProvider: data.voiceProvider || 'edge-tts',
        voiceId: data.voiceId || 'es-AR-TomasNeural',
        customVoiceUrl: data.customVoiceUrl,
        imageUrl: data.imageUrl || '',
        imageSource: data.imageSource || 'upload',
        isDefault: Boolean(data.isDefault || avatars.length === 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (newAvatar.isDefault) {
        nextList = avatars.map((a) => ({ ...a, isDefault: false }));
        nextList.unshift(newAvatar);
      } else {
        nextList = [newAvatar, ...avatars];
      }

      toast({
        title: 'Avatar creado con éxito',
        description: `"${newAvatar.name}" ya está disponible para tus clases y campañas.`,
      });
    }

    persistAvatars(nextList);
    setSelectedAvatar(null);
  };

  // Eliminar avatar
  const handleDeleteAvatar = (target: Avatar) => {
    if (avatars.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'No permitido',
        description: 'Debes mantener al menos un avatar en tu cuenta.',
      });
      return;
    }

    const nextList = avatars.filter((a) => a.id !== target.id);
    // Si borró el default, asignar el primero como default
    if (target.isDefault && nextList.length > 0) {
      nextList[0].isDefault = true;
    }

    persistAvatars(nextList);
    toast({
      title: 'Avatar eliminado',
      description: `"${target.name}" ha sido eliminado.`,
    });
  };

  // Abrir modal de edición
  const handleEditAvatar = (target: Avatar) => {
    setSelectedAvatar(target);
    setIsDialogOpen(true);
  };

  // Abrir modal de creación
  const handleCreateNew = () => {
    setSelectedAvatar(null);
    setIsDialogOpen(true);
  };

  // Filtros de búsqueda
  const filteredAvatars = avatars.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.role && a.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.voiceId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGender =
      genderFilter === 'all' ? true : a.gender === genderFilter;

    return matchesSearch && matchesGender;
  });

  const defaultAvatar = avatars.find((a) => a.isDefault) || avatars[0];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-6 w-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-headline">
                Avatares de Marca
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Configurá los rostros y las voces para la producción automatizada de clases, videos y campañas de marketing.
            </p>
          </div>

          <Button
            onClick={handleCreateNew}
            className="h-10 px-4 font-semibold gap-2 shadow-none"
          >
            <Plus className="h-4 w-4" />
            Nuevo Avatar
          </Button>
        </div>

        {/* Métricas / Resumen Superior */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total de Avatares</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{avatars.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Disponibles en tu cuenta</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Avatar Principal Activo</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-foreground truncate mt-2">
              {defaultAvatar?.name || 'Ninguno'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Usado por defecto en campañas
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Motor de Voz</span>
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm font-bold text-foreground">Edge-TTS Neural</p>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-medium">
                100% Gratis
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sin límite de caracteres</p>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar avatar por nombre, rol o voz..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant={genderFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenderFilter('all')}
              className="h-8 text-xs font-medium"
            >
              Todos
            </Button>
            <Button
              variant={genderFilter === 'male' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenderFilter('male')}
              className="h-8 text-xs font-medium"
            >
              Masculinos
            </Button>
            <Button
              variant={genderFilter === 'female' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenderFilter('female')}
              className="h-8 text-xs font-medium"
            >
              Femeninos
            </Button>
          </div>
        </div>

        {/* Grid de Avatares */}
        {filteredAvatars.length === 0 ? (
          <div className="text-center py-16 rounded-lg border border-dashed border-border bg-card/50">
            <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-foreground text-sm">No se encontraron avatares</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No hay avatares que coincidan con la búsqueda. Puedes limpiar los filtros o crear un nuevo avatar.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setGenderFilter('all');
              }}
              className="mt-4 text-xs font-medium"
            >
              Restablecer Filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAvatars.map((item) => (
              <AvatarCard
                key={item.id}
                avatar={item}
                onEdit={handleEditAvatar}
                onDelete={handleDeleteAvatar}
              />
            ))}
          </div>
        )}

        {/* Modal ABM de Creación / Edición */}
        <AvatarFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedAvatar(null);
          }}
          avatar={selectedAvatar}
          onSave={handleSaveAvatar}
        />
      </div>
    </DashboardLayout>
  );
}
