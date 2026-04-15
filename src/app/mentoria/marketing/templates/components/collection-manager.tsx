'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Mail, 
  Instagram, 
  Megaphone, 
  LayoutTemplate,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { TemplateCollection } from '../types/template-types';
import { cn } from '@/lib/utils';

interface CollectionManagerProps {
  collections: TemplateCollection[] | null;
  isLoading: boolean;
  onCreateNew: () => void;
  onViewCollection: (id: string) => void;
  onDeleteCollection: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export function CollectionManager({
  collections,
  isLoading,
  onCreateNew,
  onViewCollection,
  onDeleteCollection,
  selectedId,
  setSelectedId
}: CollectionManagerProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getCollectionIcon = (channel: string) => {
    switch (channel) {
      case 'emails': return <Mail className="h-4 w-4" />;
      case 'socials': return <Instagram className="h-4 w-4" />;
      case 'ads': return <Megaphone className="h-4 w-4" />;
      case 'landings': return <LayoutTemplate className="h-4 w-4" />;
      default: return <LayoutTemplate className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'generating':
        return <Badge className="bg-blue-100 text-blue-800">Generando</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>;
    }
  };

  const getChannelCount = (collection: TemplateCollection) => {
    if (!collection.assets) return 0;
    return Object.values(collection.assets).filter(Boolean).length;
  };

  const getTotalTemplates = (collection: TemplateCollection) => {
    if (!collection.assets) return 0;
    return Object.values(collection.assets).reduce((total: number, channel: any) => {
      return total + (Array.isArray(channel) ? channel.length : 0);
    }, 0);
  };

  const getChannelBreakdown = (collection: TemplateCollection) => {
    if (!collection.assets) return {};
    
    const breakdown: Record<string, number> = {};
    Object.entries(collection.assets).forEach(([channel, templates]) => {
      if (Array.isArray(templates)) {
        breakdown[channel] = templates.length;
      }
    });
    return breakdown;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-12">
        <LayoutTemplate className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay colecciones</h3>
        <p className="text-gray-500 mb-6">Crea tu primera colección de templates de marketing</p>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Crear Colección
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Colecciones de Templates</h2>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Colección
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Card 
            key={collection.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedId === collection.id && "ring-2 ring-blue-500 shadow-md"
            )}
            onClick={() => setSelectedId(collection.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{collection.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {format(collection.createdAt?.toDate?.() || new Date(), 'dd MMM yyyy')}
                  </CardDescription>
                </div>
                {getStatusBadge(collection.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{getTotalTemplates(collection)} templates</span>
                  <span>•</span>
                  <span>{getChannelCount(collection)} canales</span>
                </div>
                {getStatusBadge(collection.status)}
              </div>

              {/* Breakdown de canales */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(getChannelBreakdown(collection)).map(([channel, count]) => (
                  <div key={channel} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                    {getCollectionIcon(channel)}
                    <span>{count}</span>
                  </div>
                ))}
              </div>

              {collection.directives && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {collection.directives}
                </p>
              )}

              {/* Vista previa visual */}
              {collection.assets && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {Object.entries(collection.assets).slice(0, 4).map(([channel, templates]) => (
                    templates && templates.length > 0 && (
                      <div key={channel} className="text-center">
                        <div className="w-full h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded flex items-center justify-center">
                          {getCollectionIcon(channel)}
                        </div>
                        <p className="text-xs mt-1 capitalize">{channel}</p>
                      </div>
                    )
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewCollection(collection.id);
                  }}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Planos
                </Button>

                {confirmDeleteId === collection.id ? (
                  // Panel de confirmación inline (reemplaza confirm() bloqueado por Next.js)
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        onDeleteCollection(collection.id);
                        setConfirmDeleteId(null);
                      }}
                      className="text-xs px-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sí, eliminar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(collection.id);
                    }}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
