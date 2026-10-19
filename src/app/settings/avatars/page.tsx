'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Avatar, INITIAL_DEFAULT_AVATARS } from '@/domain/avatars';
import { AvatarCard, AvatarFormDialog } from '@/components/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Search,
  Volume2,
  Users,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function AvatarsDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Cargar avatares desde Firestore API
  const fetchAvatars = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/avatars', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvatars(json.data);
      } else {
        setAvatars(INITIAL_DEFAULT_AVATARS);
      }
    } catch (err: any) {
      console.warn('Error sincronizando avatares con Firestore:', err);
      toast({
        variant: 'destructive',
        title: 'Error de sincronización',
        description: 'No se pudieron recuperar los avatares desde Firestore. Mostrando presets locales.',
      });
      setAvatars((prev) => (prev.length > 0 ? prev : INITIAL_DEFAULT_AVATARS));
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAvatars();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      setAvatars(INITIAL_DEFAULT_AVATARS);
    }
  }, [user, authLoading, fetchAvatars]);

  // Guardar (crear o actualizar) en Firestore
  const handleSaveAvatar = async (data: Partial<Avatar>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sesión requerida',
        description: 'Debes iniciar sesión para persistir los avatares.',
      });
      return;
    }

    try {
      const token = await user.getIdToken();
      const method = data.id ? 'PUT' : 'POST';
      const res = await fetch('/api/avatars', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar el avatar');
      }

      toast({
        title: data.id ? 'Avatar actualizado' : 'Avatar creado con éxito',
        description: `"${json.data?.name || data.name}" quedó guardado en Firestore.`,
      });

      await fetchAvatars();
      setSelectedAvatar(null);
    } catch (err: any) {
      console.error('Error guardando avatar:', err);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message || 'Ocurrió un error inesperado al guardar.',
      });
    }
  };

  // Fijar avatar como predeterminado
  const handleSetDefault = async (target: Avatar) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/avatars', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...target,
          isDefault: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo actualizar el avatar principal');
      }

      toast({
        title: 'Avatar principal actualizado',
        description: `"${target.name}" ahora es el avatar predeterminado de tu marca.`,
      });

      await fetchAvatars();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'No se pudo actualizar el avatar principal.',
      });
    }
  };

  // Eliminar avatar
  const handleDeleteAvatar = async (target: Avatar) => {
    if (avatars.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'No permitido',
        description: 'Debes mantener al menos un avatar en tu cuenta.',
      });
      return;
    }

    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/avatars?id=${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo eliminar el avatar');
      }

      toast({
        title: 'Avatar eliminado',
        description: `"${target.name}" ha sido eliminado de Firestore.`,
      });

      await fetchAvatars();
    } catch (err: any) {
      console.error('Error eliminando avatar:', err);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: err.message || 'No se pudo eliminar el avatar.',
      });
    }
  };

  const handleEditAvatar = (target: Avatar) => {
    setSelectedAvatar(target);
    setIsDialogOpen(true);
  };

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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAvatars}
              disabled={isLoading}
              className="h-10 px-3 text-xs gap-1.5"
              title="Recargar desde Firestore"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button
              onClick={handleCreateNew}
              className="h-10 px-4 font-semibold gap-2 shadow-none"
            >
              <Plus className="h-4 w-4" />
              Nuevo Avatar
            </Button>
          </div>
        </div>

        {/* Métricas / Resumen Superior */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total de Avatares</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{avatars.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sincronizados en Firestore</p>
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
              Usado por defecto en videos y campañas
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-border bg-card/40">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-medium text-foreground">Sincronizando avatares con Firestore...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Cargando identidades y voces de tu cuenta</p>
          </div>
        ) : filteredAvatars.length === 0 ? (
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
                onSetDefault={handleSetDefault}
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
