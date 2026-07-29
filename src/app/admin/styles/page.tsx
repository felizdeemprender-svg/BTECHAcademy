'use client';

import { useState } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { LandingStyle } from '@/lib/landing-styles';
import { Button } from '@/components/ui/button';
import { Info, Trash2, Copy, Eye } from 'lucide-react';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import StyleDetails from './components/style-details';
import AccessModal from './components/access-modal';
import Link from 'next/link';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Palette, Lock } from 'lucide-react';

export default function AdminStylesPage() {
  const { firestore } = useFirebase();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [activeStyle, setActiveStyle] = useState<LandingStyle | null>(null);
  
  const stylesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'landingStyles')) : null, [firestore]);
  const { data: styles, isLoading: loading, error } = useCollection<LandingStyle>(stylesQuery);

  const handleViewDetails = (style: LandingStyle) => {
    setActiveStyle(style);
    setIsDetailsOpen(true);
  };

  const handleManageAccess = (style: LandingStyle) => {
    setActiveStyle(style);
    setIsAccessModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm('¿Estás seguro de eliminar este estilo? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(firestore, 'landingStyles', id));
    } catch (e) {
      console.error('Error al eliminar', e);
      alert('Error al eliminar estilo');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10 max-w-7xl mx-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estilos de Landing</h1>
            <p className="text-slate-500 font-medium">Visualiza los estilos disponibles. Los estilos son inmutables y son creados mediante ingeniería inversa.</p>
          </div>
        </header>

        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold py-4 px-6 text-slate-500 text-[10px] uppercase tracking-widest">Estilo</TableHead>
                  <TableHead className="font-bold py-4 text-slate-500 text-[10px] uppercase tracking-widest text-center">Configuración</TableHead>
                  <TableHead className="font-bold py-4 px-6 text-slate-500 text-[10px] uppercase tracking-widest text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 animate-pulse text-slate-400">Cargando estilos...</TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 text-rose-500">Error: {error.message}</TableCell></TableRow>
                ) : styles?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 italic text-slate-400">No hay estilos configurados. Ejecuta el seeder para cargar las plantillas base.</TableCell></TableRow>
                ) : styles?.map((style) => (
                  <TableRow key={style.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          {style.thumbnail ? (
                            <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                          ) : (
                            <Palette className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-900 leading-tight">{style.name}</p>
                            {style.allowedSubscriptions?.map(plan => (
                              <Badge key={plan} variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0 h-4 
                                ${plan === 'premium' ? 'bg-amber-50 text-amber-600 border-amber-200' : ''}
                                ${plan === 'pro' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}
                                ${plan === 'free' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                              `}>
                                {plan}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 font-medium line-clamp-1">{style.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-slate-200 text-slate-600 bg-slate-50">
                            Layout: {style.layout}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-slate-200 text-slate-600 bg-slate-50">
                            Comp: {style.componentStyle}
                          </Badge>
                        </div>
                        <p className="text-[8px] font-bold text-primary uppercase mt-1">
                          Secciones: {style.availableSections?.length || 0}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link href={`/preview-style/${style.id}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-indigo-50" title="Ver Ejemplo Fiel">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-50" 
                          onClick={() => handleManageAccess(style)}
                          title="Gestionar Accesos"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10" 
                          onClick={() => handleViewDetails(style)}
                          title="Ver Detalles"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50" 
                          onClick={() => handleDelete(style.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {isDetailsOpen && activeStyle && (
          <StyleDetails
            styleData={activeStyle}
            onClose={() => setIsDetailsOpen(false)}
          />
        )}

        <AccessModal 
          isOpen={isAccessModalOpen} 
          onClose={() => setIsAccessModalOpen(false)} 
          styleData={activeStyle} 
        />
      </div>
    </DashboardLayout>
  );
}
