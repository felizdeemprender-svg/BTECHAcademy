'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Plus, Clock, MessageSquare, Play, Pause, Trash2, Edit2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function BuilderPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState('global'); // global, courses, landings
  const [triggerType, setTriggerType] = useState('inactivity');
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para los medios de envío
  const [channels, setChannels] = useState({
    whatsapp: true,
    email: false
  });

  // Estado para múltiples acciones
  const [actions, setActions] = useState([
    { id: 1, type: 'dynamic_message', config: '' }
  ]);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/automations/rules');
      const json = await res.json();
      if (json.success) {
        setRules(json.data);
      }
    } catch (e) {
      console.error("Error cargando reglas", e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChannel = (channel: 'whatsapp' | 'email') => {
    setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const addAction = () => {
    setActions([...actions, { id: Date.now(), type: 'tag', config: '' }]);
  };

  const removeAction = (id: number) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const updateActionType = (id: number, type: string) => {
    setActions(actions.map(a => a.id === id ? { ...a, type } : a));
  };

  const handleScopeChange = (newScope: string) => {
    setScope(newScope);
    if (newScope === 'global') setTriggerType('inactivity');
    if (newScope === 'courses') setTriggerType('course_completion');
    if (newScope === 'landings') setTriggerType('landing_registration');
    if (newScope === 'tasks') setTriggerType('task_assigned');
    if (newScope === 'followups') setTriggerType('session_scheduled');
  };

  const getDefaultPrompt = (trigger: string) => {
    switch(trigger) {
      case 'inactivity': return 'Actúa como un mentor amable. Escribe un mensaje corto por WhatsApp a [Nombre_Alumno] notando que no ingresa hace [Dias_Inactivo] días. Pregúntale si necesita ayuda.';
      case 'birthday': return 'Escribe un mensaje entusiasta de feliz cumpleaños para [Nombre_Alumno]. Deséale éxitos en su camino emprendedor.';
      case 'course_completion': return 'Felicita a [Nombre_Alumno] por terminar el curso [Nombre_Curso] con nota [Nota_Promedio]. Sugiérele revisar el catálogo para su próximo paso.';
      case 'module_completion': return 'Anima a [Nombre_Alumno] que acaba de terminar el [Nombre_Modulo] de [Nombre_Curso]. Dile que va por buen camino.';
      case 'landing_registration': return 'Da una cálida bienvenida a [Nombre_Alumno] por registrarse en [Nombre_Landing]. Recuérdale que revise su correo.';
      case 'landing_abandonment': return 'Escribe un mensaje sutil a [Nombre_Alumno] diciendo que vimos que le interesó [Nombre_Landing] pero no completó la inscripción. Ofrécele resolver sus dudas.';
      case 'task_assigned': return 'Notifica a [Nombre_Alumno] que tiene un nuevo desafío asignado: [Nombre_Tarea]. Invítalo a revisarlo en la plataforma.';
      case 'session_scheduled': return 'Confirma a [Nombre_Alumno] su sesión agendada para [Fecha] a las [Hora] y recuérdale el enlace: [Link_Calendar].';
      case 'session_closed': return 'Felicita a [Nombre_Alumno] por finalizar su sesión y avísale que el registro y las notas ya están disponibles en su mentoría.';
      default: return 'Escribe un mensaje corto preguntándole a [Nombre_Alumno] cómo está...';
    }
  };

  const handleSaveRule = async () => {
    try {
      const newRule = {
        name: `Regla ${triggerType} - ${scope}`,
        scope,
        trigger: { type: triggerType, config: {} },
        channels,
        actions: actions.map(a => ({ id: String(a.id), type: a.type, config: a.config })),
        isActive: true
      };

      await fetch('/api/automations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      
      setIsOpen(false);
      fetchRules(); // Recargar lista
    } catch (error) {
      console.error("Error guardando la regla", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurador Global de Reglas</h1>
            <p className="text-muted-foreground mt-2">
              Programa acciones automáticas para todos los alumnos, independientes de un curso o landing específico.
            </p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">
                <Plus className="h-4 w-4" />
                Crear Regla
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-border bg-background max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-accent" />
                  Nueva Regla de Automatización
                </DialogTitle>
                <DialogDescription>
                  Configura el disparador, los canales de comunicación y la secuencia de acciones de Evo.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* PASO 1: CONDICION */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]">1</span>
                    ¿Cuándo debe ocurrir esto? (Condición)
                  </h3>
                  
                  {/* Selector de Alcance (Scope) */}
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 mb-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alcance de la Regla</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="scope" checked={scope === 'global'} onChange={() => handleScopeChange('global')} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm">Global</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="scope" checked={scope === 'courses'} onChange={() => handleScopeChange('courses')} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm">Cursos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="scope" checked={scope === 'landings'} onChange={() => handleScopeChange('landings')} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm">Landings</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="scope" checked={scope === 'tasks'} onChange={() => handleScopeChange('tasks')} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm">Tareas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="scope" checked={scope === 'followups'} onChange={() => handleScopeChange('followups')} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm">Mentorías</span>
                      </label>
                    </div>
                    
                    {/* Selectores dinámicos basados en el Scope */}
                    {scope === 'courses' && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="text-xs font-semibold">Selecciona los Cursos donde aplicará:</label>
                        <select className="flex h-9 w-full mt-1 rounded-md border border-input bg-background px-3 text-sm">
                          <option>Todos los cursos</option>
                          <option>Emprendimiento 101 (Ary)</option>
                          <option>Ventas Avanzadas (Lu Belotti)</option>
                        </select>
                      </div>
                    )}
                    {scope === 'landings' && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="text-xs font-semibold">Selecciona las Landings donde aplicará:</label>
                        <select className="flex h-9 w-full mt-1 rounded-md border border-input bg-background px-3 text-sm">
                          <option>Todas las landings activas</option>
                          <option>Landing Principal - Ary</option>
                          <option>Webinar Masterclass - Lu Belotti</option>
                          <option>Promo Verano 2026</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <select 
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value)}
                      className="flex h-10 w-full md:w-1/2 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {scope === 'global' && (
                        <>
                          <option value="inactivity">Tiempo de Inactividad (App)</option>
                          <option value="specific_date">Fecha Específica</option>
                          <option value="birthday">Cumpleaños del Alumno</option>
                        </>
                      )}
                      {scope === 'courses' && (
                        <>
                          <option value="course_completion">Finalización de Curso</option>
                          <option value="module_completion">Finalización de Módulo Específico</option>
                          <option value="course_enrollment">Inscripción / Inicio de Curso</option>
                        </>
                      )}
                      {scope === 'landings' && (
                        <>
                          <option value="landing_registration">Registro Exitoso en Landing</option>
                          <option value="landing_abandonment">Abandono de Carrito (Pagos)</option>
                        </>
                      )}
                      {scope === 'tasks' && (
                        <>
                          <option value="task_assigned">Nueva Tarea/Desafío Asignado</option>
                        </>
                      )}
                      {scope === 'followups' && (
                        <>
                          <option value="session_scheduled">Sesión Agendada</option>
                          <option value="session_closed">Sesión Cerrada/Completada</option>
                        </>
                      )}
                    </select>

                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      {/* GLOBAL TRIGGERS */}
                      {triggerType === 'inactivity' && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">Ejecutar si no ingresa a la app por más de:</span>
                            <div className="flex items-center gap-2">
                              <input type="number" defaultValue="14" min="1" className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                              <span className="text-sm text-muted-foreground">días</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 pt-4 border-t border-border">
                            <div className="flex flex-col gap-1 w-1/2">
                              <label className="text-xs font-semibold text-muted-foreground">Hora de Ejecución:</label>
                              <input type="time" defaultValue="09:00" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1 w-1/2">
                              <label className="text-xs font-semibold text-muted-foreground">Periodicidad de Chequeo:</label>
                              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="daily">Chequeo Diario</option>
                                <option value="hourly">Chequeo cada Hora</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      {triggerType === 'specific_date' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium">Seleccionar Fecha y Hora de Ejecución:</label>
                          <input type="datetime-local" className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                        </div>
                      )}
                      {triggerType === 'birthday' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Ejecutar el día del cumpleaños del alumno.</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Enviar saludo a las:</span>
                            <input type="time" defaultValue="09:00" className="flex h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background" />
                          </div>
                        </div>
                      )}
                      
                      {/* COURSE TRIGGERS */}
                      {triggerType === 'course_completion' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Se dispara al obtener el certificado del curso.</p>
                          <p className="text-[10px] text-muted-foreground">Ideal para cross-selling de "siguientes pasos" o felicitaciones.</p>
                        </div>
                      )}
                      {triggerType === 'module_completion' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium">¿Cuál módulo?</label>
                          <select className="flex h-9 w-full max-w-xs mt-1 rounded-md border border-input bg-background px-3 text-sm">
                            <option>Módulo 1: Introducción</option>
                            <option>Módulo 2: Avanzado</option>
                          </select>
                        </div>
                      )}
                      {triggerType === 'course_enrollment' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Se dispara cuando el alumno se inscribe por primera vez.</p>
                        </div>
                      )}

                      {/* LANDING TRIGGERS */}
                      {triggerType === 'landing_registration' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Se dispara en el instante que el usuario deja sus datos en la Landing.</p>
                        </div>
                      )}
                      {triggerType === 'landing_abandonment' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Ejecutar si llega al checkout y no compra tras:</p>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="number" defaultValue="2" min="1" className="flex h-8 w-16 rounded-md border border-input bg-background px-2 text-sm" />
                            <span className="text-xs text-muted-foreground">horas</span>
                          </div>
                        </div>
                      )}

                      {/* FOLLOWUPS TRIGGERS */}
                      {triggerType === 'task_assigned' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Se dispara al asignar un desafío/compromiso a un alumno.</p>
                        </div>
                      )}
                      {triggerType === 'session_scheduled' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Se dispara al agendar una sesión sincrónica (Google Calendar).</p>
                        </div>
                      )}
                      {triggerType === 'session_closed' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium">Se dispara al marcar una sesión como Completada.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-border"></div>

                {/* PASO 2: MEDIOS / CANALES */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]">2</span>
                    Medios de Comunicación (Canales)
                  </h3>
                  <p className="text-xs text-muted-foreground">Selecciona por dónde se enviarán los mensajes (puedes elegir varios).</p>
                  
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${channels.whatsapp ? 'bg-[#25D366]/10 border-[#25D366]/30' : 'bg-background border-border hover:bg-muted'}`}>
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 text-[#25D366] rounded border-border"
                        checked={channels.whatsapp}
                        onChange={() => toggleChannel('whatsapp')}
                      />
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`h-4 w-4 ${channels.whatsapp ? 'text-[#25D366]' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${channels.whatsapp ? 'text-foreground' : 'text-muted-foreground'}`}>WhatsApp (Tutor)</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${channels.email ? 'bg-primary/10 border-primary/30' : 'bg-background border-border hover:bg-muted'}`}>
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 text-primary rounded border-border"
                        checked={channels.email}
                        onChange={() => toggleChannel('email')}
                      />
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${channels.email ? 'text-foreground' : 'text-muted-foreground'}`}>Correo Electrónico</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="w-full h-px bg-border"></div>

                {/* PASO 3: SECUENCIA DE ACCIONES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]">3</span>
                      ¿Qué acciones ejecutará Evo?
                    </h3>
                  </div>
                  
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {actions.map((action, index) => (
                      <div key={action.id} className="relative flex items-start gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground font-bold z-10 shrink-0 mt-2">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 rounded-xl border border-border bg-muted/10 p-4 space-y-3 relative overflow-hidden group">
                          {actions.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeAction(action.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <select 
                            value={action.type}
                            onChange={(e) => updateActionType(action.id, e.target.value)}
                            className="flex h-9 w-full md:w-1/2 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background pr-8"
                          >
                            <option value="dynamic_message">Mensaje Dinámico (IA)</option>
                            <option value="fixed_template">Plantilla Fija / Landing Page</option>
                            <option value="tag">Acción Interna: Asignar Tag</option>
                          </select>

                          {action.type === 'dynamic_message' && (
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold">Prompt Dinámico (Instrucción para Evo):</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1">
                                      Ver variables dinámicas
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-4" align="end">
                                    <h4 className="font-semibold text-sm mb-2">Variables Disponibles</h4>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Puedes usar estos tags en tu prompt. Evo los reemplazará con los datos reales del alumno al enviar el mensaje.
                                    </p>
                                    <ul className="space-y-2 text-xs">
                                      <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                        <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Nombre_Alumno]</code>
                                        <span className="text-muted-foreground">El primer nombre del alumno.</span>
                                      </li>
                                      
                                      {/* Variables para Inactividad */}
                                      {triggerType === 'inactivity' && (
                                        <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                          <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Dias_Inactivo]</code>
                                          <span className="text-muted-foreground">Días desde su último inicio de sesión.</span>
                                        </li>
                                      )}

                                      {/* Variables para Cursos */}
                                      {(triggerType === 'course_completion' || triggerType === 'course_enrollment' || triggerType === 'module_completion') && (
                                        <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                          <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Nombre_Curso]</code>
                                          <span className="text-muted-foreground">El nombre del curso.</span>
                                        </li>
                                      )}
                                      
                                      {triggerType === 'module_completion' && (
                                        <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                          <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Nombre_Modulo]</code>
                                          <span className="text-muted-foreground">Nombre del módulo recién completado.</span>
                                        </li>
                                      )}

                                      {triggerType === 'course_completion' && (
                                        <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                          <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Nota_Promedio]</code>
                                          <span className="text-muted-foreground">Nota promedio obtenida (si aplica).</span>
                                        </li>
                                      )}

                                      {/* Variables para Landings */}
                                      {(triggerType === 'landing_registration' || triggerType === 'landing_abandonment') && (
                                        <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                          <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Nombre_Landing]</code>
                                          <span className="text-muted-foreground">Nombre de la página de captura/venta.</span>
                                        </li>
                                      )}
                                      
                                      {/* Variables para Mentorías */}
                                      {triggerType === 'task_assigned' && (
                                        <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                          <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Nombre_Tarea]</code>
                                          <span className="text-muted-foreground">El título del desafío o módulo asignado.</span>
                                        </li>
                                      )}
                                      {(triggerType === 'session_scheduled' || triggerType === 'session_closed') && (
                                        <>
                                          <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                            <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Fecha]</code>
                                            <span className="text-muted-foreground">Fecha de la sesión.</span>
                                          </li>
                                          <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                            <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Hora]</code>
                                            <span className="text-muted-foreground">Hora de la sesión.</span>
                                          </li>
                                          {triggerType === 'session_scheduled' && (
                                            <li className="grid grid-cols-[110px_1fr] gap-2 items-start">
                                              <code className="bg-muted px-1 py-0.5 rounded text-primary font-medium">[Link_Calendar]</code>
                                              <span className="text-muted-foreground">Enlace a Google Calendar de la sesión.</span>
                                            </li>
                                          )}
                                        </>
                                      )}
                                    </ul>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <textarea 
                                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder={`Ej: ${getDefaultPrompt(triggerType)}`}
                                value={action.config}
                                onChange={(e) => {
                                  setActions(actions.map(a => a.id === action.id ? { ...a, config: e.target.value } : a));
                                }}
                              />
                              <button 
                                className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 flex items-center gap-1"
                                onClick={() => setActions(actions.map(a => a.id === action.id ? { ...a, config: getDefaultPrompt(triggerType) } : a))}
                              >
                                {action.config ? '✨ Reemplazar con ejemplo para esta regla' : '✨ Usar texto de ejemplo'}
                              </button>
                            </div>
                          )}

                          {action.type === 'fixed_template' && (
                            <div className="space-y-2 mt-2">
                              <label className="text-xs font-semibold">URL o Texto Fijo a Enviar:</label>
                              <input type="text" placeholder="Ej: https://academia.com/landing-promo" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                          )}

                          {action.type === 'tag' && (
                            <div className="space-y-2 mt-2">
                              <label className="text-xs font-semibold">Tag a asignar (Proceso interno):</label>
                              <input type="text" placeholder="Ej: Riesgo de Abandono" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full border-dashed gap-2 mt-4 text-muted-foreground hover:text-foreground"
                    onClick={addAction}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar otra Acción
                  </Button>
                </div>
              </div>
              
              <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-2 border-t border-border mt-4">
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveRule}>Guardar Tarea</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabla (Sin cambios) */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Reglas Configuradas</CardTitle>
            <CardDescription>Administra las automatizaciones globales activas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID / Nombre</th>
                    <th className="px-4 py-3 font-medium">Trigger (Condición)</th>
                    <th className="px-4 py-3 font-medium">Acción</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Cargando reglas...</td></tr>
                  ) : rules.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No hay reglas configuradas. Haz clic en 'Crear Regla' para empezar.</td></tr>
                  ) : rules.map((rule) => (
                    <tr key={rule.id} className="bg-background hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">{rule.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          {rule.trigger.type} ({rule.scope})
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {rule.actions.length} acción(es)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${rule.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {rule.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={async () => {
                                    await fetch(`/api/automations/rules?id=${rule.id}`, { method: 'DELETE' });
                                    fetchRules();
                                  }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
