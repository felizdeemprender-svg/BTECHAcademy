
'use client';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  Send, 
  Upload, 
  FileText, 
  CheckCircle2, 
  BrainCircuit, 
  X, 
  Loader2,
  Trophy,
  History,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Convierte cualquier formato de fecha de Firestore a Date de forma segura */
function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

interface TaskModalsProps {
  isResponseOpen: boolean;
  setIsResponseOpen: (o: boolean) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (o: boolean) => void;
  selectedTask: any;
  answer: string;
  setAnswer: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  loading: boolean;
  onSubmit: (task: any) => void;
}

export function TaskModals({
  isResponseOpen, setIsResponseOpen,
  isDetailOpen, setIsDetailOpen,
  selectedTask,
  answer, setAnswer,
  file, setFile,
  loading,
  onSubmit
}: TaskModalsProps) {
  if (!selectedTask) return null;

  return (
    <>
      {/* Modal: Responder Desafío */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent className="mw-2xl">
          <DialogHeader className="text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Zap className="text-primary h-6 w-6" /></div>
            <DialogTitle className="text-xl md:text-2xl font-bold">Completar Desafío</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Tu respuesta será analizada por nuestra IA para brindarte feedback inmediato.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="bg-muted/30 p-5 border-l-4 border-accent">
              <Label className="text-[10px] font-bold uppercase text-accent mb-1 block">Consigna del Mentor</Label>
              <p className="text-sm font-medium text-foreground leading-relaxed italic">"{selectedTask.description}"</p>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Tu Desarrollo</Label>
              <Textarea 
                value={answer} 
                onChange={e => setAnswer(e.target.value)}
                placeholder="Escribe tu análisis o respuesta aquí..."
                className="min-h-[150px] md:min-h-[180px] rounded-2xl p-4 md:p-6 text-sm md:text-base border-none bg-secondary/10 focus-visible:ring-accent"
              />
            </div>

            {selectedTask.allowFileUpload && (
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Material de Respaldo (PDF)</Label>
                <div className="p-6 border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-2 relative hover:bg-muted/10 transition-colors group">
                  <input 
                    type="file" 
                    accept=".pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><FileText className="h-5 w-5" /></div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{file.name}</p></div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive z-10"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/40 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-muted-foreground">Click para subir archivo adjunto</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button 
                onClick={() => onSubmit(selectedTask)} 
                disabled={loading || !answer.trim()} 
                className="w-full h-14 rounded-2xl text-lg font-bold bg-accent hover:bg-accent/90"
              >
                {loading ? <><Loader2 className="animate-spin mr-2" /> Evaluando...</> : <><Send className="mr-2" /> Enviar para Evaluación</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de Historial */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="mw-2xl">
          <DialogHeader className="text-left">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Trophy className="text-primary h-6 w-6" /></div>
              <div className="text-right">
                <span className="text-3xl md:text-4xl font-black">{selectedTask.score}%</span>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Resultado IA</p>
              </div>
            </div>
            <DialogTitle className="text-xl md:text-2xl font-bold">{selectedTask.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Desafío completado y evaluado por el motor Fastoria AI.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-success rounded-full" />
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Retroalimentación Estratégica</Label>
              </div>
              <div className="bg-success/10/50 p-6 rounded-2xl border border-success/15 relative overflow-hidden">
                <BrainCircuit className="absolute -right-4 -top-4 h-24 w-24 opacity-5 text-success" />
                <p className="text-sm md:text-base italic text-success leading-relaxed font-medium relative z-10">
                  "{selectedTask.aiFeedback}"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Tu Respuesta Original</Label>
              <div className="bg-muted/20 p-5 rounded-2xl border">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{selectedTask.answer}</p>
                {selectedTask.fileUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-xl text-[10px] font-bold gap-2 mt-6 border-success/20 text-success hover:bg-success/10" 
                    onClick={() => window.open(selectedTask.fileUrl, '_blank')}
                  >
                    <FileText className="h-4 w-4" /> Descargar Documento Enviado
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Completado el</span>
                  <span className="text-xs font-bold">{(() => { const d = toDate(selectedTask.completedAt); return d ? d.toLocaleDateString() : '-'; })()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-success" />
                <span className="text-[10px] font-bold text-success uppercase">Evaluación Finalizada</span>
              </div>
            </div>

            <Button onClick={() => setIsDetailOpen(false)} variant="outline" className="w-full h-12 rounded-xl font-bold">
              Cerrar Detalle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
