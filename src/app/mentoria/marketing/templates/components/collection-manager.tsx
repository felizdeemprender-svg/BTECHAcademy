"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Eye,
  Mail,
  Instagram,
  Megaphone,
  LayoutTemplate,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { TemplateCollection } from "../types/template-types";
import { cn } from "@/lib/utils";

interface CollectionManagerProps {
  collections: TemplateCollection[] | null;
  isLoading: boolean;
  onCreateNew: () => void;
  onViewCollection: (id: string) => void;
  onDeleteCollection: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isAdmin?: boolean;
}

export function CollectionManager({
  collections,
  isLoading,
  onCreateNew,
  onViewCollection,
  onDeleteCollection,
  selectedId,
  setSelectedId,
  isAdmin = false,
}: CollectionManagerProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getCollectionIcon = (channel: string) => {
    switch (channel) {
      case "emails":
        return <Mail className="h-4 w-4" />;
      case "socials":
        return <Instagram className="h-4 w-4" />;
      case "ads":
        return <Megaphone className="h-4 w-4" />;
      case "landings":
        return <LayoutTemplate className="h-4 w-4" />;
      default:
        return <LayoutTemplate className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">Completado</Badge>
        );
      case "generating":
        return <Badge className="bg-blue-100 text-blue-800">Generando</Badge>;
      case "error":
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
    return Object.entries(collection.assets).reduce(
      (total: number, [channel, items]: [string, any]) => {
        if (channel === "socials") return total;
        return total + (Array.isArray(items) ? items.length : 0);
      },
      0,
    );
  };

  const getChannelBreakdown = (collection: TemplateCollection) => {
    if (!collection.assets) return {};

    const breakdown: Record<string, number> = {};
    Object.entries(collection.assets).forEach(([channel, templates]) => {
      if (channel === "socials") return;
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
      <div className="text-center py-20 bg-white/50 rounded-[2.5rem] border border-dashed border-primary/20 backdrop-blur-xl">
        <LayoutTemplate className="mx-auto h-16 w-16 text-muted-foreground/20 mb-6" />
        <h3 className="text-xl font-bold text-foreground mb-2">
          No hay colecciones
        </h3>
        <p className="text-muted-foreground mb-8 font-medium">
          Crea tu primera colección de templates de marketing
        </p>
        {isAdmin && (
          <Button
            onClick={onCreateNew}
            className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-12 px-8 gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5" />
            Crear Colección
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
          <LayoutTemplate className="h-6 w-6 text-muted-foreground" />{" "}
          Colecciones de Templates
        </h2>
        {isAdmin && (
          <Button
            onClick={onCreateNew}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-bold rounded-xl h-11 px-6 gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Colección
          </Button>
        )}
      </div>

      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="border-none">
                <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">
                  Colección Estratégica
                </TableHead>
                <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">
                  Volumen
                </TableHead>
                <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">
                  Estado
                </TableHead>
                <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow
                  key={collection.id}
                  className={cn(
                    "hover:bg-primary/5 transition-colors border-b border-border/30 group cursor-pointer",
                    selectedId === collection.id && "bg-primary/5",
                  )}
                  onClick={() => setSelectedId(collection.id)}
                >
                  <TableCell className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground text-sm">
                        {collection.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1 flex items-center gap-2">
                        {format(
                          collection.createdAt?.toDate?.() || new Date(),
                          "dd MMM yyyy",
                        )}
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span
                          className="truncate max-w-[300px]"
                          title={collection.directives || ""}
                        >
                          {collection.directives ||
                            "Sin instrucciones adicionales"}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="text-xs font-bold">
                        {getTotalTemplates(collection)} templates
                      </span>
                      <div className="flex gap-1">
                        {Object.entries(getChannelBreakdown(collection)).map(
                          ([channel, count]) => (
                            <div
                              key={channel}
                              className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold"
                              title={`${count} en ${channel}`}
                            >
                              {getCollectionIcon(channel)}
                              <span>{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(collection.status)}
                  </TableCell>
                  <TableCell className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCollection(collection.id);
                        }}
                        className="rounded-xl font-bold text-primary hover:bg-primary/10 gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Planos
                      </Button>

                      {isAdmin && (
                        confirmDeleteId === collection.id ? (
                          <div
                            className="flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] h-8 px-3 hover:bg-slate-100 rounded-lg font-bold"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                onDeleteCollection(collection.id);
                                setConfirmDeleteId(null);
                              }}
                              className="text-[10px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                            >
                              Confirmar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(collection.id);
                            }}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Eliminar colección"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
