'use client';

import { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { LandingStyle } from '@/lib/landing-styles';
import { Button } from '@/components/ui/button';
import { Info, Trash2, Copy, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import StyleDetails from './components/style-details';
import AccessModal from './components/access-modal';
import Link from 'next/link';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Palette, Lock, Tags } from 'lucide-react';
import { STYLE_GROUP_LABELS, STYLE_GROUP_COLORS, StyleGroup } from '@/lib/landing-styles';

export default function AdminStylesPage() {
  const { firestore } = useFirebase();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const stylesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'landingStyles')) : null, [firestore]);
  const { data: styles, isLoading: loading, error } = useCollection<LandingStyle>(stylesQuery);

  const activeStyle = useMemo(
    () => styles?.find(s => s.id === activeStyleId) || null,
    [styles, activeStyleId]
  );

  const handleViewDetails = (style: LandingStyle) => {
    setActiveStyleId(style.id);
    setIsDetailsOpen(true);
  };

  const handleManageAccess = (style: LandingStyle) => {
    setActiveStyleId(style.id);
    setIsAccessModalOpen(true);
  };

  const handleSync = async () => {
    if (!confirm('¿Sincronizar los estilos desde el sistema? Esto sobreescribe los documentos de Firestore con las definiciones del código (incluye los brands por defecto).')) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/seed-styles');
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message);
      } else {
        setSyncMessage(`Error: ${data.error || 'desconocido'}`);
      }
    } catch (e) {
      setSyncMessage('Error al sincronizar: no se pudo conectar con la API.');
    } finally {
      setIsSyncing(false);
    }
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
            <h1 className="text-2xl font-bold text-foreground">Estilos de Landing</h1>
            <p className="text-muted-foreground font-medium">Visualiza los estilos disponibles. Los estilos son inmutables y son creados mediante ingeniería inversa.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {syncMessage && (
              <p className="text-xs font-bold text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {syncMessage}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="font-bold gap-2"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar estilos del sistema'}
            </Button>
          </div>
        </header>

        <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="p-0">
            <Table>
              <TableHeader className="bg-muted/80 border-b">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold py-4 px-6 text-muted-foreground text-[10px] uppercase tracking-widest">Estilo</TableHead>
                  <TableHead className="font-bold py-4 text-muted-foreground text-[10px] uppercase tracking-widest text-center">Configuración</TableHead>
                  <TableHead className="font-bold py-4 px-6 text-muted-foreground text-[10px] uppercase tracking-widest text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 animate-pulse text-muted-foreground">Cargando estilos...</TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 text-danger">Error: {error.message}</TableCell></TableRow>
                ) : styles?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 italic text-muted-foreground">No hay estilos configurados. Ejecuta el seeder para cargar las plantillas base.</TableCell></TableRow>
                ) : styles?.map((style) => (
                  <TableRow key={style.id} className="hover:bg-muted/50 transition-colors border-b border-muted last:border-0">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 relative">
                          {style.thumbnail ? (
                            <img
                              src={style.thumbnail}
                              alt={style.name}
                              className="w-full h-full object-cover relative z-10"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                          <Palette className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-foreground leading-tight">{style.name}</p>
                            <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0 h-4 ${(STYLE_GROUP_COLORS[style.group as StyleGroup] || 'bg-muted text-muted-foreground border-border')}`}>
                              {STYLE_GROUP_LABELS[style.group as StyleGroup] || style.group}
                            </Badge>
                            {style.allowedSubscriptions?.map(plan => (
                              <Badge key={plan} variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0 h-4 
                                ${plan === 'premium' ? 'bg-warn/10 text-warn border-warn/20' : ''}
                                ${plan === 'pro' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                                ${plan === 'free' ? 'bg-success/10 text-success border-success/20' : ''}
                              `}>
                                {plan}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium line-clamp-1">{style.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-border text-muted-foreground bg-muted">
                            Layout: {style.layout}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-border text-muted-foreground bg-muted">
                            Modo: {style.tokens?.themeMode || 'light'}
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
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" title="Ver Ejemplo Fiel">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-warn hover:bg-warn/10" 
                          onClick={() => handleManageAccess(style)}
                          title="Gestionar Accesos"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" 
                          onClick={() => handleViewDetails(style)}
                          title="Ver Detalles"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-danger hover:bg-danger/10" 
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
