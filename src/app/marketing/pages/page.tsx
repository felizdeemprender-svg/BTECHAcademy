'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirebase, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Copy,
  Loader2,
  ExternalLink,
  FileBox,
  Mail,
  Instagram,
  Megaphone,
  Download,
  MoreVertical,
  FileEdit,
  Video,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useApiSalesPages } from '@/hooks/use-api-sales-pages';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function SalesPagesDashboardPage() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();



  const isAdmin = profile?.roles?.includes('admin');
  const { data: rawPages, isLoading, refetch: refetchPages } = useApiSalesPages({
    type: 'all',
    mentorId: isAdmin ? undefined : profile?.uid,
    skip: !profile?.uid
  });

  const pages = useMemo(() => {
    if (!rawPages) return null;
    return [...rawPages]
      .filter(p => p.type === 'campaign_pack' || p.type === 'campaign_videos')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [rawPages]);

  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingIds[id]) return;
    
    // Alerta de borrado
    if (!window.confirm("ATENCIÓN: Esto eliminará permanentemente este pack de videos y contenidos generados. ¿Deseas continuar?")) {
      return;
    }

    setDeletingIds(prev => ({ ...prev, [id]: true }));
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/sales-pages?pageId=${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast({ title: 'Landing eliminada', description: 'La landing ha sido borrada con éxito.' });
      refetchPages();
    } catch (e: any) {
      console.error("[Delete] Error al borrar en API:", e);
      toast({ variant: 'destructive', title: 'Error al borrar', description: e.message || "Error de red o permisos." });
    } finally {
      setDeletingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-success" /> Fábrica de Contenidos ADN
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              Genera packs multimedia, videos y creativos para tus redes sociales.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => router.push('/marketing/pages/build')} 
              variant="outline"
              className="h-14 px-8 rounded-2xl font-bold flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/5 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <FileEdit className="h-5 w-5" /> Nuevo Contenido
            </Button>
          </div>
        </div>

        <Card className="bg-white/50 backdrop-blur-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">
                    Pack Multimedia / Contenido
                  </TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">
                    Canales
                  </TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">
                    Exportación Rápida
                  </TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" /></TableCell></TableRow>
                ) : pages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center border-b-0">
                      <div className="flex flex-col items-center justify-center space-y-4 py-12">
                        <FileBox className="h-16 w-16 text-muted-foreground/30" />
                        <h3 className="text-xl font-bold text-muted-foreground">Sin contenido generado</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">Comienza tu primera campaña omnicanal.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pages?.map((page) => (
                  <TableRow key={page.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                    <TableCell className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{page.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase mt-1 flex items-center gap-2">
                          {page.createdAt ? format(new Date(page.createdAt), 'dd MMM yyyy') : '-'}
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          {page.campaignStatus === 'processing' ? (
                            <span className="flex items-center gap-1 text-primary animate-pulse font-bold">
                              <Loader2 className="h-3 w-3 animate-spin" /> Creando Auto-Campaña...
                            </span>
                          ) : (
                            <span className="truncate max-w-[300px]">Pack Multicanal</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <div className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold" title="Emails"><Mail className="h-3.5 w-3.5" /></div>
                        <div className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold" title="Socials"><Instagram className="h-3.5 w-3.5" /></div>
                        <div className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold" title="Ads"><Megaphone className="h-3.5 w-3.5" /></div>
                        {(() => {
                          let hasVideos = false;
                          const sections = (page as any).content?.sections || (page as any).aiContent?.sections || [];
                          for (const sec of sections) {
                            if (sec.scenes) {
                              for (const scene of sec.scenes) {
                                if (scene.production_notes?.video_url) {
                                  hasVideos = true;
                                  break;
                                }
                              }
                            }
                            if (hasVideos) break;
                          }
                          return hasVideos ? (
                            <div className="flex items-center gap-1 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold" title="Videos listos"><Video className="h-3.5 w-3.5" /></div>
                          ) : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-lg shadow-sm" onClick={() => window.open(page.exportUrls?.emailsExportUrl, '_blank')} title="Ver exportación de Emails">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-lg shadow-sm" onClick={() => window.open(page.exportUrls?.socialExportUrl, '_blank')} title="Ver exportación de Redes Sociales">
                          <Instagram className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-lg shadow-sm" onClick={() => window.open(page.exportUrls?.adsExportUrl, '_blank')} title="Ver exportación de Ads">
                          <Megaphone className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-3 items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/10">
                              <MoreVertical className="h-4 w-4 text-primary" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={() => router.push(`/marketing/pages/build?id=${page.id}`)} className="font-bold text-primary gap-2 cursor-pointer">
                              <FileEdit className="h-4 w-4" /> Editar Pack
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDelete(e, page.id)} disabled={deletingIds[page.id]} className="font-bold text-danger gap-2 cursor-pointer focus:bg-danger/10 focus:text-danger">
                              {deletingIds[page.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              Eliminar Contenido
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>


    </DashboardLayout>
  );
}
