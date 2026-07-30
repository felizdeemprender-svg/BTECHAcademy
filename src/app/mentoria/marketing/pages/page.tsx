'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirebase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, getDoc, orderBy } from 'firebase/firestore';
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
  Layout,
  Mail,
  Instagram,
  Megaphone,
  Download,
  MoreVertical,
  FileEdit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function SalesPagesDashboardPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();



  const pagesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawPages, isLoading } = useCollection(pagesQuery);

  const pages = useMemo(() => {
    if (!rawPages) return null;
    return [...rawPages]
      .filter(p => p.type !== 'landing_only')
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [rawPages]);

  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { storage } = useFirebase();

  const handleCopyLink = (id: string, variant: number) => {
    const url = `${window.location.origin}/v/${id}?v=${variant}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Enlace Copiado', description: `URL de variante ${variant + 1} lista para compartir.` });
  };

  const handleDelete = async (e: React.BaseSyntheticEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Sistema de confirmación en UI (evita bloqueos de confirm() nativo)
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Auto-cancelar confirmación tras 3 segundos
      setTimeout(() => setConfirmDeleteId(current => current === id ? null : current), 3000);
      toast({ title: '¿Confirmar borrado?', description: 'Pulsa de nuevo para eliminar permanentemente.' });
      return;
    }

    setConfirmDeleteId(null);
    setDeletingIds(prev => ({ ...prev, [id]: true }));

    try {
      toast({ title: 'Borrando...', description: 'Analizando y eliminando activos asociados.' });
      const pageRef = doc(db, 'salesPages', id);
      const snap = await getDoc(pageRef);

      // 🔑 IMPORTANTE: La limpieza de assets (Storage/Drive) es "best effort".
      // Si falla, NO debe bloquear el borrado real del documento en Firestore.
      if (snap.exists()) {
        const data = snap.data();
        const driveIds: string[] = [];
        const storageUrls: string[] = [];

        // 1. Escaneo Recursivo de activos
        const scan = (item: any) => {
          if (!item) return;
          if (typeof item === 'string') {
            if (item.includes('firebasestorage.googleapis.com')) storageUrls.push(item);
          } else if (Array.isArray(item)) {
            item.forEach(scan);
          } else if (typeof item === 'object') {
            if (item.video_drive_id) driveIds.push(item.video_drive_id);
            if (item.carousel_drive_ids) driveIds.push(...item.carousel_drive_ids);
            Object.values(item).forEach(scan);
          }
        };
        scan(data);

        // 2. Borrado de Google Drive (best effort — no bloquea el delete principal)
        const accessToken = localStorage.getItem('google_access_token');
        if (driveIds.length > 0 && accessToken) {
          for (const dId of driveIds) {
            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${dId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });
            } catch (e) { console.warn("[Delete] Fallo al borrar en Drive (ignorado):", dId); }
          }
        }

        // 3. Borrado de Firebase Storage (best effort — no bloquea el delete principal)
        const uniqueUrls = Array.from(new Set(storageUrls));
        for (const url of uniqueUrls) {
          try { await deleteObject(ref(storage, url)); } catch (e) { console.warn("[Delete] Fallo al borrar en Storage (ignorado):", url); }
        }

        // 4. Limpiar carpeta de exportaciones (best effort)
        const exportKeys = ['emailsExportUrl', 'socialExportUrl', 'adsExportUrl'];
        if (data.exportUrls) {
          for (const key of exportKeys) {
            const url = data.exportUrls[key];
            if (url) {
              try { await deleteObject(ref(storage, url)); } catch (e) { /* ignorado */ }
            }
          }
        }
      }
    } catch (assetCleanupError: any) {
      // ⚠️ Si falla la limpieza de assets, lo logueamos pero CONTINUAMOS con el borrado del doc
      console.warn("[Delete] Error en limpieza de assets (se continuará con el borrado):", assetCleanupError);
    }

    // 🗑️ El borrado real de Firestore está SIEMPRE garantizado en su propio try/catch
    try {
      const pageRef = doc(db, 'salesPages', id);
      await deleteDoc(pageRef);
      toast({ title: 'Pack eliminado', description: 'Todos los datos han sido borrados con éxito.' });
    } catch (e: any) {
      console.error("[Delete] Error al borrar en Firestore:", e);
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
              <Megaphone className="h-8 w-8 text-emerald-500" /> Productor de Campañas ADN
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              Gestiona el contenido omnicanal, guiones y videos generados con el Motor V2
            </p>
          </div>
          <Button 
            onClick={() => router.push('/mentoria/marketing/pages/build')} 
            className="h-14 px-8 rounded-2xl font-bold shadow-xl flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Crear Nueva Campaña
          </Button>
        </div>

        <Card className="bg-white/50 backdrop-blur-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">
                    Campaña Generada
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
                        <h3 className="text-xl font-bold text-slate-600">Sin contenido generado</h3>
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
                          {page.createdAt?.toDate ? format(page.createdAt.toDate(), 'dd MMM yyyy') : '-'}
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="truncate max-w-[300px]">Pack Multicanal</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <div className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold" title="Emails"><Mail className="h-3.5 w-3.5" /></div>
                        <div className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold" title="Socials"><Instagram className="h-3.5 w-3.5" /></div>
                        <div className="flex items-center gap-1 text-[9px] bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded font-bold" title="Ads"><Megaphone className="h-3.5 w-3.5" /></div>
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
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/mentoria/marketing/pages/build?id=${page.id}`)} className="rounded-xl font-bold text-primary hover:bg-primary/10 gap-2">
                          <FileEdit className="h-4 w-4" /> Editar Pack
                        </Button>
                        {confirmDeleteId === page.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-[10px] h-8 px-3 hover:bg-slate-100 rounded-lg font-bold">
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={(e) => handleDelete(e, page.id)} className="text-[10px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold">
                              Confirmar
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={(e) => handleDelete(e, page.id)} className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg" disabled={deletingIds[page.id]}>
                            {deletingIds[page.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
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
    </DashboardLayout>
  );
}
