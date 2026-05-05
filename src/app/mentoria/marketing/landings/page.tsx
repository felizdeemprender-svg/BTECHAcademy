'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirebase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Loader2, 
  ExternalLink,
  Layout,
  MoreVertical,
  FileEdit,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function SalesLandingsDashboardPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const pagesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    // Por ahora listamos todas las salesPages, luego podemos filtrar por un flag si es necesario
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawPages, isLoading } = useCollection(pagesQuery);

  const pages = useMemo(() => {
    if (!rawPages) return null;
    return [...rawPages].sort((a, b) => {
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

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(current => current === id ? null : current), 3000);
      toast({ title: '¿Confirmar borrado?', description: 'Pulsa de nuevo para eliminar permanentemente.' });
      return;
    }
    
    setConfirmDeleteId(null);
    setDeletingIds(prev => ({ ...prev, [id]: true }));
    
    try {
      const pageRef = doc(db, 'salesPages', id);
      // ... Lógica de borrado simplificada o completa igual que la original
      await deleteDoc(pageRef);
      toast({ title: 'Landing eliminada', description: 'Los datos han sido borrados con éxito.' });
    } catch (e: any) {
      console.error("[Delete Error]", e);
      toast({ variant: 'destructive', title: 'Error al borrar', description: e.message });
    } finally {
      setDeletingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Landings de Venta</h1>
            <p className="text-muted-foreground text-lg font-medium">Gestiona las páginas de venta independientes para tus cursos.</p>
          </div>
          <Button 
            onClick={() => router.push('/mentoria/marketing/landings/build')} 
            className="h-14 px-8 rounded-2xl font-bold shadow-xl flex items-center gap-2 bg-accent hover:bg-accent/90 transition-all"
          >
            <Plus className="h-5 w-5" /> Nueva Landing de Venta
          </Button>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-72 bg-muted animate-pulse rounded-[2.5rem]" />)
          ) : pages?.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-secondary/10 rounded-[3rem] border-2 border-dashed">
              <Layout className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-600">No hay landings creadas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Crea tu primera página de venta independiente para empezar a comercializar.</p>
              </div>
              <Button onClick={() => router.push('/mentoria/marketing/landings/build')} variant="link" className="font-bold text-accent mt-4">Crear Landing ahora</Button>
            </div>
          ) : pages?.map((page) => (
            <Card key={page.id} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all duration-500 flex flex-col">
              <div className="p-8 space-y-6 flex-1">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                    Landing Pack (x3)
                  </Badge>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{page.createdAt?.toDate ? format(page.createdAt.toDate(), 'dd/MM/yyyy') : '-'}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">{page.title}</h3>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <DollarSign className="h-4 w-4" />
                    <span>{page.price ? page.price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : 'Consultar'}</span>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  {[0, 1, 2].map(v => {
                    const landing = (page.aiContent as any)?.landings?.[v];
                    const label = landing?.marketingName || `Variante ${v + 1}`;
                    return (
                      <div key={v} className="flex gap-2">
                        <Button 
                          onClick={() => window.open(`/v/${page.id}?v=${v}`, '_blank')} 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-bold text-[10px] uppercase gap-2 border-slate-200 bg-white hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3 w-3" /> {label}
                        </Button>
                        <Button 
                          onClick={() => handleCopyLink(page.id, v)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl border"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                <p className="text-[10px] font-bold text-muted-foreground">ID: {page.id.substring(0, 8)}...</p>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50"
                    onClick={(e) => handleDelete(e, page.id)}
                  >
                    {deletingIds[page.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-slate-400"
                    onClick={() => router.push(`/mentoria/marketing/landings/build?id=${page.id}`)}
                  >
                    <FileEdit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
