'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid), orderBy('createdAt', 'desc'));
  }, [db, profile?.uid]);
  const { data: pages, isLoading } = useCollection(pagesQuery);

  const handleCopyLink = (id: string, variant: number) => {
    const url = `${window.location.origin}/v/${id}?v=${variant}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Enlace Copiado', description: `URL de variante ${variant + 1} lista para compartir.` });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'salesPages', id));
      toast({ title: 'Contenido eliminado' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al borrar' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Generación de Contenido</h1>
            <p className="text-muted-foreground text-lg font-medium">Accede a las 3 rutas estratégicas generadas para cada lanzamiento.</p>
          </div>
          <Button 
            onClick={() => router.push('/mentoria/marketing/pages/build')} 
            className="h-14 px-8 rounded-2xl font-bold shadow-xl flex items-center gap-2 bg-accent hover:bg-accent/90 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Nueva Generación Unificada
          </Button>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-72 bg-muted animate-pulse rounded-[2.5rem]" />)
          ) : pages?.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-secondary/10 rounded-[3rem] border-2 border-dashed">
              <FileBox className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-600">Sin contenido generado</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Fusiona un programa con un blueprint para generar tus 3 rutas de lanzamiento.</p>
              </div>
              <Button onClick={() => router.push('/mentoria/marketing/build')} variant="link" className="font-bold text-accent mt-4">Comenzar ahora</Button>
            </div>
          ) : pages?.map((page) => (
            <Card key={page.id} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-2xl transition-all duration-500 flex flex-col">
              <div className="p-8 space-y-6 flex-1">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                    Pack Multicanal (x3)
                  </Badge>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{page.createdAt?.toDate ? format(page.createdAt.toDate(), 'dd/MM/yyyy') : '-'}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">{page.title}</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <Layout className="h-3.5 w-3.5 text-blue-500" />
                    <Mail className="h-3.5 w-3.5 text-emerald-500" />
                    <Instagram className="h-3.5 w-3.5 text-rose-500" />
                    <Megaphone className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Landings de Lanzamiento:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[0, 1, 2].map(v => {
                      const landing = (page.aiContent as any)?.landings?.[v];
                      const label = landing?.marketingName || `Variante ${v + 1}`;
                      return (
                        <div key={v} className="flex gap-2">
                          <Button 
                            onClick={() => window.open(`/v/${page.id}?v=${v}`, '_blank')} 
                            variant="outline" 
                            className="flex-1 h-9 rounded-xl font-bold text-[10px] uppercase gap-2 border-slate-200 bg-white hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3 w-3" /> {label}
                          </Button>
                          <Button 
                            onClick={() => handleCopyLink(page.id, v)} 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-9 text-[9px] font-bold uppercase rounded-lg shadow-sm" 
                    onClick={() => window.open(page.exportUrls?.emailsExportUrl, '_blank')}
                  >
                    <Mail className="h-3 w-3 mr-1" /> Emails
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-9 text-[9px] font-bold uppercase rounded-lg shadow-sm" 
                    onClick={() => window.open(page.exportUrls?.socialExportUrl, '_blank')}
                  >
                    <Instagram className="h-3 w-3 mr-1" /> Social
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-9 text-[9px] font-bold uppercase rounded-lg shadow-sm" 
                    onClick={() => window.open(page.exportUrls?.adsExportUrl, '_blank')}
                  >
                    <Megaphone className="h-3 w-3 mr-1" /> Ads
                  </Button>
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs font-bold">
                      <DropdownMenuItem onClick={() => router.push(`/mentoria/marketing/pages/build?id=${page.id}`)}>
                        <FileEdit className="h-3.5 w-3.5 mr-2" /> Editar Pack
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(page.id)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar Pack
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
