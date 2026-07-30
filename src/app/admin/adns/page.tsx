'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  Eye,
  FileCode,
  Plus,
  Rocket,
  ShieldCheck,
  Video,
  ChevronRight,
  Trash2,
  Upload,
  Info,
  Clock,
  ListChecks,
  Play
} from 'lucide-react';

interface ADN {
  id: string;
  name: string;
  version: string;
  target_format: string;
  engine_requirements: {
    ffmpeg_build: string;
    features: string[];
  };
  status: 'verified' | 'pending' | 'error';
  isModular?: boolean;
}

interface AdnSummary {
  name: string;
  description: string;
  totalSlices: number;
  narrative: string[];
  hasHook: boolean;
  hasCTA: boolean;
  totalDuration: number;
}

export default function AdminAdnsPage() {
  const { toast } = useToast();
  const [adns, setAdns] = useState<ADN[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Detalle
  const [selectedAdnSummary, setSelectedAdnSummary] = useState<AdnSummary | null>(null);
  const [currentAdnId, setCurrentAdnId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isFullMode, setIsFullMode] = useState(false);
  const [isSmokeTesting, setIsSmokeTesting] = useState<string | null>(null);
  const [smokeTestPreviewUrl, setSmokeTestPreviewUrl] = useState<string | null>(null);

  // Eliminación
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdns();
  }, []);

  const handleSmokeTest = async (format: string, isFull: boolean = false) => {
    if (!currentAdnId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay un ADN seleccionado para la prueba.' });
      return;
    }

    setIsSmokeTesting(isFull ? 'FULL' : format);
    console.log(`[SmokeTest] Iniciando ${isFull ? 'render completo' : 'certificación'} para: ${currentAdnId} en ${format}`);
    try {
      const response = await fetch('/api/admin/adns/smoke-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adnId: currentAdnId, format, isFull })
      });
      const data = await response.json();
      
      if (data.success) {
        setSmokeTestPreviewUrl(data.previewUrl);
        toast({
          title: isFull ? `¡Render Completo Listo!` : `¡Certificado en ${format}!`,
          description: isFull ? `Se han procesado todas las escenas.` : `El render de 3s se completó con éxito.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: `Fallo en Formato ${format}`,
          description: `Error FFmpeg: ${data.error}`,
          className: "max-h-[400px] overflow-y-auto"
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Crítico',
        description: 'No se pudo contactar con el motor de renderizado.',
      });
    } finally {
      setIsSmokeTesting(null);
    }
  };

  const fetchAdns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/adns');
      const data = await response.json();
      if (data.success) {
        const enrichedAdns = data.adns.map((adn: any) => ({
          ...adn,
          status: adn.engine_requirements ? 'verified' : 'pending'
        }));
        setAdns(enrichedAdns);
      }
    } catch (error) {
      console.error('Error fetching ADNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/adns/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Carga Exitosa',
          description: data.message,
        });
        setIsCreateOpen(false);
        setSelectedFile(null);
        fetchAdns();
      } else {
        // Mostrar errores detallados si existen
        const detailMsg = data.details ? `\n• ${data.details.join('\n• ')}` : '';
        toast({
          variant: 'destructive',
          title: 'Fallo en Validación',
          description: data.error + detailMsg,
          className: "max-h-[400px] overflow-y-auto"
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de Red',
        description: 'No se pudo subir el archivo.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async (adnId: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/admin/adns/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adnId })
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: data.isHealthy ? 'Verificación Exitosa' : 'Atención Requerida',
          variant: data.isHealthy ? 'default' : 'destructive',
          description: data.isHealthy 
            ? `El ADN ${adnId} es compatible con el motor de producción.`
            : `Se encontraron problemas técnicos en la estructura.`,
        });
        fetchAdns();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleViewDetail = async (adnId: string) => {
    setLoadingDetail(true);
    setIsDetailOpen(true);
    setCurrentAdnId(adnId);
    setSmokeTestPreviewUrl(null); // Reset preview when opening new detail
    try {
      const response = await fetch('/api/admin/adns/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adnId })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedAdnSummary(data.summary);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el detalle del Blueprint.' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const response = await fetch('/api/admin/adns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adnId: confirmDeleteId })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'ADN Eliminado', description: 'La carpeta ha sido removida del sistema.' });
        setConfirmDeleteId(null);
        fetchAdns();
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el ADN.' });
    }
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-500 text-white border-none gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><CheckCircle className="h-3.5 w-3.5" /> Verificado</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><XCircle className="h-3.5 w-3.5" /> Error</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><AlertTriangle className="h-3.5 w-3.5" /> Pendiente</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col gap-2 border-b border-border/30 pb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight flex items-center gap-3">
              <Rocket className="h-8 w-8 text-emerald-500" /> Gestión de ADNs Maestros
            </h1>
            <div className="flex gap-3">
              <Button onClick={fetchAdns} variant="outline" className="rounded-xl h-11 px-6 font-bold gap-2 border-2">
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Sincronizar
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-bold rounded-xl h-11 px-6 gap-2">
                <Plus className="h-5 w-5" /> Nueva Carga
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
          <CardHeader className="bg-primary/5 px-10 py-8 border-b border-border/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-headline font-bold text-primary flex items-center gap-2">
                <Video className="h-6 w-6 text-emerald-500" /> Catálogo de Motores de Producción
              </CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filtrar por nombre o ID..." 
                  className="pl-10 rounded-xl bg-white/80 border-none shadow-inner h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none">
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-black">ADN / Master</TableHead>
                  <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-black text-center">Estado</TableHead>
                  <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-black text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adns.map((adn) => (
                  <TableRow key={adn.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                    <TableCell className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-base tracking-tight">{adn.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">ID: {adn.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(adn.status)}</TableCell>
                    <TableCell className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl font-bold gap-2 text-primary hover:bg-primary/10" onClick={() => handleVerify(adn.id)}>
                          <ShieldCheck className="h-4 w-4 text-emerald-500" /> Verificar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-blue-500 hover:bg-blue-50 rounded-xl" onClick={() => handleViewDetail(adn.id)}>
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:bg-slate-100 rounded-xl">
                          <Upload className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl" onClick={() => setConfirmDeleteId(adn.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal: Detalle de Blueprint */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="mw-2xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
                <Info className="h-8 w-8 text-blue-500" /> Resumen del Blueprint
              </DialogTitle>
            </DialogHeader>
            {loadingDetail ? (
              <div className="py-20 text-center animate-pulse">Analizando estructura narrativa...</div>
            ) : selectedAdnSummary && (
              <div className="space-y-8 py-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Slices</p>
                    <p className="text-3xl font-bold">{selectedAdnSummary.totalSlices}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duración Est.</p>
                    <p className="text-3xl font-bold">{selectedAdnSummary.totalDuration}s</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <ListChecks className="h-4 w-4" /> Secuencia Narrativa
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAdnSummary.narrative.map((label, i) => (
                      <Badge key={i} variant="outline" className="px-3 py-1 rounded-xl font-bold border-2 capitalize">
                        {i+1}. {label.toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Badge className={cn("rounded-xl px-4 py-2 font-bold", selectedAdnSummary.hasHook ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                    {selectedAdnSummary.hasHook ? "✓ Gancho Detectado" : "✗ Sin Gancho"}
                  </Badge>
                  <Badge className={cn("rounded-xl px-4 py-2 font-bold", selectedAdnSummary.hasCTA ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                    {selectedAdnSummary.hasCTA ? "✓ CTA Detectado" : "✗ Sin CTA"}
                  </Badge>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-emerald-500" /> Certificación de Motor
                    </p>
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                      <Button 
                        variant={!isFullMode ? "secondary" : "ghost"} 
                        size="sm" 
                        className={cn("h-7 px-3 rounded-lg text-[9px] uppercase font-black transition-all", !isFullMode ? "shadow-sm bg-white text-emerald-600" : "text-slate-500")}
                        onClick={() => setIsFullMode(false)}
                      >
                        Rápido (3s)
                      </Button>
                      <Button 
                        variant={isFullMode ? "secondary" : "ghost"} 
                        size="sm" 
                        className={cn("h-7 px-3 rounded-lg text-[9px] uppercase font-black transition-all", isFullMode ? "shadow-sm bg-white text-emerald-600" : "text-slate-500")}
                        onClick={() => setIsFullMode(true)}
                      >
                        Completo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {['9:16', '1:1', '16:9', '4:5'].map((fmt) => (
                      <Button 
                        key={fmt}
                        variant="outline"
                        className={cn(
                          "h-16 rounded-2xl border-2 flex flex-col gap-1 transition-all",
                          isSmokeTesting === (isFullMode ? 'FULL' : fmt) ? "border-emerald-500 bg-emerald-50 shadow-inner" : "hover:border-emerald-500 hover:bg-emerald-50"
                        )}
                        onClick={() => handleSmokeTest(fmt, isFullMode)}
                        disabled={!!isSmokeTesting}
                      >
                        {isSmokeTesting === (isFullMode ? 'FULL' : fmt) ? (
                          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                        ) : (
                          <>
                            <span className="text-lg font-bold">{fmt}</span>
                            <span className="text-[9px] uppercase font-black opacity-40">
                              {isFullMode ? 'Render' : 'Probar'}
                            </span>
                          </>
                        )}
                      </Button>
                    ))}
                  </div>

                  {isSmokeTesting && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-2xl flex items-center gap-4 animate-pulse border border-slate-800 shadow-xl">
                      <div className="relative">
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping absolute -top-1 -right-1" />
                        <Rocket className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-xs font-bold">
                          {isFullMode ? 'Ejecutando renderizado completo' : 'Certificando motor'} en {isSmokeTesting === 'FULL' ? 'todas las escenas' : isSmokeTesting}...
                        </p>
                        <p className="text-emerald-500/60 text-[9px] uppercase font-black tracking-widest">FFmpeg 6.1: {isFullMode ? 'Producción' : 'Smoke Test'}</p>
                      </div>
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  )}

                  <div className="mt-6 flex flex-col items-center gap-2">
                    <p className="text-[10px] text-muted-foreground italic text-center">
                      {isFullMode 
                        ? "* El renderizado completo procesa todas las escenas del ADN maestro."
                        : "* La certificación genera un clip de 3s para validar integridad visual y técnica."
                      }
                    </p>
                  </div>

                  {smokeTestPreviewUrl && (
                    <div className="mt-8 space-y-4 animate-in zoom-in-95 duration-300">
                      <p className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Video className="h-4 w-4 text-emerald-500" /> Resultado de la Certificación
                      </p>
                      <div className="relative rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-black aspect-[9/16] max-h-[400px] mx-auto">
                        <video 
                          src={smokeTestPreviewUrl} 
                          controls 
                          autoPlay 
                          loop
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary"
                          onClick={() => setSmokeTestPreviewUrl(null)}
                        >
                          Cerrar Vista Previa
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal: Confirmación Eliminación */}
        <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
          <DialogContent className="mw-md text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-2 text-center w-full">¿Eliminar ADN Maestro?</DialogTitle>
            </DialogHeader>
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 mt-4">
              <Trash2 className="h-10 w-10" />
            </div>
            <p className="text-muted-foreground mb-8">Esta acción es irreversible y eliminará todos los archivos de la carpeta <span className="font-mono font-bold text-rose-600">{confirmDeleteId}</span>.</p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button className="flex-1 h-12 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Confirmar Borrado</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Nueva Carga (ZIP) */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="mw-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Upload className="text-emerald-500" /> Cargar ADN Maestro
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mb-8">
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center hover:border-emerald-500/50 transition-colors bg-slate-50/50">
                <Input 
                  id="adn-zip"
                  type="file" 
                  accept=".zip"
                  className="hidden" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="adn-zip" className="cursor-pointer space-y-4 block">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto">
                    <FileCode className={cn("h-8 w-8", selectedFile ? "text-emerald-500" : "text-slate-400")} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{selectedFile ? selectedFile.name : 'Seleccionar archivo .zip'}</p>
                    <p className="text-[10px] uppercase font-black tracking-tighter text-muted-foreground">
                      Debe contener los 7 archivos .json maestros
                    </p>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="bg-emerald-50 p-4 rounded-2xl flex items-start gap-3 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-900">Listo para validar</p>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      El sistema verificará la integridad de la estructura modular antes de realizar el despliegue.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg disabled:opacity-50"
            >
              {isUploading ? 'Validando y Desplegando...' : 'Iniciar Carga Segura'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
