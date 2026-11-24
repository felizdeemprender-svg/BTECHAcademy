'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LandingSelectorDialogProps {
  state: { variant: any; index: number; channel: any } | null;
  landings: any[];
  onClose: () => void;
  onSelect: (variant: any, index: number, channel: any, landingIdx: number) => void;
}

export function LandingSelectorDialog({
  state,
  landings,
  onClose,
  onSelect,
}: LandingSelectorDialogProps) {
  return (
    <Dialog open={!!state} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-md w-full p-6 bg-white border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground uppercase tracking-widest">Elegir Base de Venta</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tienes varias Landings generadas. Selecciona de cual de ellas quieres extraer la logica de ventas (titulos, beneficios) para guiar la IA al generar este contenido.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          {landings?.map((l: any, i: number) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1 justify-start border-border text-left hover:bg-muted/50 transition-colors"
              onClick={() => {
                if (state) {
                  onSelect(state.variant, state.index, state.channel, i);
                }
              }}
            >
              <span className="font-bold text-foreground text-sm uppercase tracking-wider">{l.marketingName || `Variante ${i + 1}`}</span>
              <span className="text-xs text-muted-foreground line-clamp-1 italic">{l.headline}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
