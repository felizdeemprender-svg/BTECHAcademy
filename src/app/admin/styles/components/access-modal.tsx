import { useState, useEffect } from 'react';
import { LandingStyle } from '@/lib/landing-styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';

interface AccessModalProps {
  styleData: LandingStyle | null;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_PLANS = [
  { id: 'free', label: 'Free', color: 'text-success bg-success/10 border-success/20' },
  { id: 'pro', label: 'Pro', color: 'text-primary bg-primary/10 border-primary/20' },
  { id: 'premium', label: 'Premium', color: 'text-warn bg-warn/10 border-warn/20' }
];

export default function AccessModal({ styleData, isOpen, onClose }: AccessModalProps) {
  const { firestore } = useFirebase();
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (styleData) {
      setSelectedPlans(styleData.allowedSubscriptions || []);
    }
  }, [styleData]);

  if (!styleData) return null;

  const handleToggle = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'landingStyles', styleData.id), {
        allowedSubscriptions: selectedPlans
      });
      onClose();
    } catch (e) {
      console.error('Error saving access', e);
      alert('Error al guardar los accesos');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mw-md">
        <DialogHeader>
          <DialogTitle>Administrar Accesos</DialogTitle>
          <DialogDescription>
            Selecciona qué suscripciones tienen acceso al estilo <strong>{styleData.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {AVAILABLE_PLANS.map(plan => (
            <div key={plan.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted transition-colors">
              <Checkbox 
                id={plan.id}
                checked={selectedPlans.includes(plan.id)}
                onCheckedChange={() => handleToggle(plan.id)}
              />
              <div className="grid gap-1.5 leading-none flex-1 cursor-pointer" onClick={() => handleToggle(plan.id)}>
                <label
                  htmlFor={plan.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Plan {plan.label}
                </label>
              </div>
              <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${plan.color}`}>
                {plan.label}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary">
            {isSaving ? 'Guardando...' : 'Guardar Accesos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
