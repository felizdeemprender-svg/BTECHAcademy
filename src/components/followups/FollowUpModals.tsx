
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
import { FileUploadArea } from '@/components/ui/file-upload-area';
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
  Save,
  BrainCircuit,
  FileCheck,
  Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  masterFile?: File | null;
  setMasterFile?: (f: File | null) => void;
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
  masterFile, setMasterFile,
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
            <DialogTitle className="text-xl md:text-2xl font-bold">Nueva Mentoría</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Define el alcance del programa académico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Modalidad</Label>
                <Tabs value={formData.type || 'individual'} onValueChange={v => setFormData({...formData, type: v as 'individual' | 'group'})} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="individual">1 a 1</TabsTrigger>
                    <TabsTrigger value="group">Grupal (Grupo)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {(formData.type === 'individual' || !formData.type) && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alumno de la Mentoría</Label>
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
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nombre de la Mentoría</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Mentoría Mentores Expertos" className=""  size="lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Objetivo del Programa</Label>
              <Textarea value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} placeholder="¿Qué esperamos lograr?" size="lg" className="min-h-[100px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                Materiales de la Mentoría
              </Label>
              <FileUploadArea 
                multiple={true}
                onChange={(e) => {
                   const files = Array.from(e.target.files || []);
                   if (!files.length) return;
                   if (!guideFile) {
                     setGuideFile(files[0]);
                     if (files[1] && setMasterFile && formData.type === 'group') setMasterFile(files[1]);
                   } else if (!masterFile && setMasterFile && formData.type === 'group') {
                     setMasterFile(files[0]);
                   } else {
                     setGuideFile(files[0]);
                   }
                }}
                title="Cargar Materiales"
                description="Máx. 2 archivos (Guía y Maestro). PDF, DOCX o TXT."
                className="p-6 rounded-2xl mb-4 bg-muted/5 border-dashed border-2 hover:bg-muted/10 transition-colors"
              />
              <div className="space-y-2 mt-4">
                {masterFile && (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-primary/5 border-primary shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary text-white">
                        <BrainCircuit className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-sm truncate max-w-[150px] sm:max-w-[300px]">{masterFile.name}</p>
                        <Badge className="bg-primary text-[10px] h-5 px-2">Maestro</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setMasterFile?.(null)} className="text-destructive h-8 w-8"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
                {guideFile && (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-sm truncate max-w-[150px] sm:max-w-[300px]">{guideFile.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {formData.type === 'group' && setMasterFile && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          const temp = masterFile;
                          setMasterFile(guideFile);
                          setGuideFile(temp || null);
                        }} className="text-xs font-bold h-8 hidden sm:flex"><Star className="h-3 w-3 mr-1" /> Marcar Maestro</Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setGuideFile(null)} className="text-destructive h-8 w-8"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
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
              <Button 
                onClick={onCreate} 
                disabled={loading || !formData.title || (formData.type !== 'group' && (isManualInvite ? !inviteEmail : !formData.studentId))} 
                className="w-full h-14 rounded-2xl text-lg font-bold"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Iniciar Mentoría
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
            <DialogTitle className="text-xl md:text-2xl font-bold">Editar Mentoría</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Ajusta los parámetros del programa académico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nombre de la Mentoría</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className=""  size="lg" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Objetivo del Programa</Label>
              <Textarea value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} size="lg" className="min-h-[100px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                Materiales de la Mentoría
              </Label>
              <FileUploadArea 
                multiple={true}
                onChange={(e) => {
                   const files = Array.from(e.target.files || []);
                   if (!files.length) return;
                   if (!guideFile && !selectedFollowUp?.planGuideUrl) {
                     setGuideFile(files[0]);
                     if (files[1] && setMasterFile && formData.type === 'group') setMasterFile(files[1]);
                   } else if (!masterFile && (!selectedFollowUp?.masterFileUrl) && setMasterFile && formData.type === 'group') {
                     setMasterFile(files[0]);
                   } else {
                     setGuideFile(files[0]);
                   }
                }}
                title="Cargar Materiales"
                description="Máx. 2 archivos (Guía y Maestro). PDF, DOCX o TXT."
                className="p-6 rounded-2xl mb-4 bg-muted/5 border-dashed border-2 hover:bg-muted/10 transition-colors"
              />
              <div className="space-y-2 mt-4">
                {(masterFile || selectedFollowUp?.masterFileUrl) && (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-primary/5 border-primary shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary text-white">
                        <BrainCircuit className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-sm truncate max-w-[150px] sm:max-w-[300px]">{masterFile ? masterFile.name : 'Maestro actual'}</p>
                        <Badge className="bg-primary text-[10px] h-5 px-2">Maestro</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!masterFile && selectedFollowUp?.masterFileUrl && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(selectedFollowUp.masterFileUrl, '_blank')} className="text-[10px] font-bold h-8 hidden sm:flex">Ver</Button>
                      )}
                      {masterFile && (
                        <Button variant="ghost" size="icon" onClick={() => setMasterFile?.(null)} className="text-destructive h-8 w-8"><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                )}
                {(guideFile || selectedFollowUp?.planGuideUrl) && (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-sm truncate max-w-[150px] sm:max-w-[300px]">{guideFile ? guideFile.name : 'Guía actual'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {formData.type === 'group' && setMasterFile && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (guideFile) {
                            const temp = masterFile;
                            setMasterFile(guideFile);
                            setGuideFile(temp || null);
                          }
                        }} className="text-xs font-bold h-8 hidden sm:flex" disabled={!guideFile}><Star className="h-3 w-3 mr-1" /> Marcar Maestro</Button>
                      )}
                      {!guideFile && selectedFollowUp?.planGuideUrl && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(selectedFollowUp.planGuideUrl, '_blank')} className="text-[10px] font-bold h-8 hidden sm:flex">Ver</Button>
                      )}
                      {guideFile && (
                        <Button variant="ghost" size="icon" onClick={() => setGuideFile(null)} className="text-destructive h-8 w-8"><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
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
            <DialogTitle className="text-2xl font-bold mb-2">¿Eliminar Mentoría?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminarán permanentemente todas las sesiones, tareas y progresos asociados a esta mentoría.
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
