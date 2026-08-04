'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Loader2, 
  Trash2,
  Download,
  Scroll,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PdfProductionPanelProps {
  asset: any;
  sIdx: number;
  onGeneratePdf: (s: any, sIdx: number) => void;
  onDeletePdf: (sIdx: number) => void;
  isGenerating: boolean;
}

export function PdfProductionPanel({
  asset: s,
  sIdx,
  onGeneratePdf,
  onDeletePdf,
  isGenerating
}: PdfProductionPanelProps) {
  
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();
  const pdfUrl = s.production_notes?.pdf_url;

  return (
    <div className="p-8 rounded-lg border-2 border-dashed space-y-8 bg-foreground/40 backdrop-blur-md" 
         style={{ borderColor: isGenerating ? '#10b981' : 'rgba(255,255,255,0.05)' }}>

      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
          <BookOpen className="h-6 w-6 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Producción de Documento LinkedIn</h3>
          <p className="text-xs text-muted-foreground">Este formato se exportará como un PDF optimizado para lectura.</p>
        </div>
      </div>

      {/* Resumen del Contenido */}
      <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
        <Label className="text-[10px] font-black uppercase text-success/60 tracking-widest flex items-center gap-2">
          <Scroll className="h-3 w-3" /> Estructura del Documento
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-foreground/50 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Páginas</p>
            <p className="text-xl font-black text-white">{s.slides?.length || 0}</p>
          </div>
          <div className="p-3 bg-foreground/50 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Formato</p>
            <p className="text-xs font-black text-success">PDF Nativo</p>
          </div>
          <div className="p-3 bg-foreground/50 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Audio</p>
            <p className="text-xs font-bold text-muted-foreground">N/A</p>
          </div>
          <div className="p-3 bg-foreground/50 rounded-xl border border-white/5 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Lectura</p>
            <p className="text-xs font-bold text-border">Manual</p>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      {!pdfUrl ? (
        <Button 
          className="w-full h-16 rounded-2xl bg-success hover:bg-success text-white font-black uppercase tracking-widest text-sm gap-3 transition-all active:scale-95 disabled:opacity-50"
          onClick={() => onGeneratePdf(s, sIdx)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="h-6 w-6 animate-spin" /> Maquetando PDF...</>
          ) : (
            <><FileText className="h-6 w-6" /> Generar Documento PDF</>
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Button 
              className="flex-1 h-16 rounded-2xl bg-success hover:bg-success text-white font-black uppercase tracking-widest text-sm gap-3 transition-all active:scale-95"
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              <Download className="h-6 w-6" /> Descargar PDF Final
            </Button>
            <Button 
              className="flex-1 h-16 rounded-2xl bg-foreground hover:bg-foreground text-white font-black uppercase tracking-widest text-sm gap-3 border border-white/5 transition-all active:scale-95"
              onClick={() => onGeneratePdf(s, sIdx)}
            >
              Regenerar
            </Button>
            <Button 
              variant="outline"
              className={cn(
                "w-16 h-16 rounded-2xl border-2 transition-all active:scale-95",
                showConfirm 
                  ? "bg-danger border-danger text-white hover:bg-danger" 
                  : "border-danger/20 text-danger/40 hover:bg-danger/10"
              )}
              onClick={() => {
                if (showConfirm) {
                  onDeletePdf(sIdx);
                  setShowConfirm(false);
                } else {
                  setShowConfirm(true);
                  setTimeout(() => setShowConfirm(false), 3000);
                }
              }}
            >
              {showConfirm ? <Trash2 className="h-6 w-6 animate-pulse" /> : <Trash2 className="h-6 w-6" />}
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground font-medium">
            * El PDF se generará combinando el diseño visual de cada placa con el texto educativo extendido.
          </p>
        </div>
      )}
    </div>
  );
}
