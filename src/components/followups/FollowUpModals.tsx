
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ClipboardList, 
  Users, 
  UserPlus, 
  Upload, 
  FileText, 
  X, 
  Pencil, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Trash2,
  Save
} from 'lucide-react';
import { useState } from 'react';

interface FollowUpModalsProps {
  isCreateOpen: boolean;
  setIsCreateOpen: (o: boolean) => void;
  isEditOpen: boolean;
  setIsEditOpen: (o: boolean) => void;
  isDeleteOpen: boolean;
  setIsDeleteOpen: (o: boolean) => void;
  formData: any;
  setFormData: (d: any) => void;
  students: any[];
  isManualInvite: boolean;
  setIsManualInvite: (v: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  guideFile: File | null;
  setGuideFile: (f: File | null) => void;
  loading: boolean;
  onCreate: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  selectedFollowUp: any;
}

export function FollowUpModals({
  isCreateOpen, setIsCreateOpen,
  isEditOpen, setIsEditOpen,
  isDeleteOpen, setIsDeleteOpen,
  formData, setFormData,
  students,
  isManualInvite, setIsManualInvite,
  inviteEmail, setInviteEmail,
  guideFile, setGuideFile,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  selectedFollowUp
}: FollowUpModalsProps) {
  return (
    <>
      {/* Dialog: Create */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><ClipboardList className="text-primary h-6 w-6" /></div>
            <DialogTitle className="text-xl md:text-2xl font-bold">Nuevo Seguimiento Académico</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Define el alcance del acompañamiento para el alumno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Modalidad</Label>
                <Tabs value={formData.type || 'individual'} onValueChange={v => setFormData({...formData, type: v as 'individual' | 'group'})} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="individual">1 a 1</TabsTrigger>
                    <TabsTrigger value="group">Grupal (Cohorte)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {(formData.type === 'individual' || !formData.type) && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alumno del Seguimiento</Label>
                <Tabs value={isManualInvite ? 'manual' : 'select'} onValueChange={v => setIsManualInvite(v === 'manual')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="select" className="gap-2"><Users className="h-4 w-4" /> Seleccionar</TabsTrigger>
                    <TabsTrigger value="manual" className="gap-2"><UserPlus className="h-4 w-4" /> Nuevo Correo</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="select" className="m-0 animate-in fade-in">
                    <Select onValueChange={id => setFormData({...formData, studentId: id})} value={formData.studentId}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Elegir estudiante de la lista..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground italic">No se encontraron alumnos disponibles.</div>
                        ) : students.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex flex-col text-left">
                              <span className="font-bold">{s.displayName}</span>
                              <span className="text-[10px] opacity-60">{s.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                  
                  <TabsContent value="manual" className="m-0 animate-in fade-in">
                    <div className="space-y-2">
                      <Input 
                        type="email" 
                        placeholder="ejemplo@correo.com" 
                        value={inviteEmail} 
                        onChange={e => setInviteEmail(e.target.value)} 
                        className="border-2" 
                       size="lg" />
                      <p className="text-[9px] text-muted-foreground ml-1 font-medium italic">
                        Si el alumno no está asociado a un curso previo, se dará de alta su perfil automáticamente.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nombre del Seguimiento</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Mentoría Mentores Expertos" className=""  size="lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Objetivo del Programa</Label>
              <Textarea value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} placeholder="¿Qué esperamos lograr?" size="lg" className="min-h-[100px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                {formData.type === 'group' ? 'Archivo Maestro (PDF / Syllabus)' : 'Guía del Plan (PDF / Imagen)'}
              </Label>
              <div className="p-6 border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-2 relative hover:bg-muted/10 transition-colors group">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={e => setGuideFile(e.target.files?.[0] || null)}
                />
                {guideFile ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{guideFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">Documento listo</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive shrink-0 relative z-10"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGuideFile(null); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/40 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-muted-foreground">Click para subir la guía institucional</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nº Sesiones</Label>
                <Input type="number" value={formData.totalSessions} onChange={e => setFormData({...formData, totalSessions: parseInt(e.target.value) || 0})} className=""  size="lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Inicio</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className=""  size="lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fin Estimado</Label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className=""  size="lg" />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={onCreate} disabled={loading || (!isManualInvite && !formData.studentId) || (isManualInvite && !inviteEmail)} className="w-full h-14 rounded-2xl text-lg font-bold">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Iniciar Seguimiento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="mw-2xl">
          <DialogHeader className="text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Pencil className="text-primary h-6 w-6" /></div>
            <DialogTitle className="text-xl md:text-2xl font-bold">Editar Seguimiento</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Ajusta los parámetros del programa académico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nombre del Seguimiento</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className=""  size="lg" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Objetivo del Programa</Label>
              <Textarea value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} size="lg" className="min-h-[100px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Actualizar Guía del Plan (Opcional)</Label>
              <div className="p-6 border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-2 relative hover:bg-muted/10 transition-colors group">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setGuideFile(e.target.files?.[0] || null)} />
                {guideFile ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><FileText className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{guideFile.name}</p></div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGuideFile(null); }} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive z-10"><X className="h-4 w-4" /></Button>
                  </div>
                ) : selectedFollowUp?.planGuideUrl ? (
                  <div className="flex items-center justify-between w-full p-2 bg-success/10 rounded-xl border border-success/15">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-success" />
                      <span className="text-xs font-bold text-success">Guía actual cargada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.open(selectedFollowUp.planGuideUrl, '_blank')} className="text-[10px] h-7 font-bold">Ver</Button>
                      <p className="text-[10px] text-muted-foreground italic">Sube un nuevo archivo para reemplazar</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/40 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-muted-foreground">Subir nueva versión del plan</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Inicio</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className=""  size="lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fin Estimado</Label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className=""  size="lg" />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={onUpdate} disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg bg-primary">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Guardar Cambios
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="mw-md overflow-hidden text-center">
          <DialogHeader>
            <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center text-danger mx-auto mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">¿Eliminar Seguimiento?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed mb-8">
              Esta acción borrará el programa y todas sus sesiones asociadas. 
              <br/><strong>Nota:</strong> Solo se permite borrar si no existen tareas o compromisos registrados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancelar</Button>
            <Button 
              onClick={onDelete} 
              disabled={loading} 
              variant="destructive" 
              className="flex-1 h-12 rounded-xl font-bold shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2" />} Confirmar Borrado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
