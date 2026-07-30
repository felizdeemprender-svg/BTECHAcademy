import { LandingStyle } from '@/lib/landing-styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Bot, FileText, CheckCircle2, CopyPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StyleDetailsProps {
  styleData: LandingStyle;
  onClose: () => void;
}

export default function StyleDetails({ styleData, onClose }: StyleDetailsProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mw-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-white border shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
              {styleData.thumbnail ? (
                <img src={styleData.thumbnail} alt={styleData.name} className="w-full h-full object-cover" />
              ) : (
                <Palette className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                Estilo: {styleData.name}
                <div className="flex gap-1 ml-2">
                  {styleData.allowedSubscriptions?.map(plan => (
                    <Badge key={plan} variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 h-5 
                      ${plan === 'premium' ? 'bg-amber-500 text-white border-amber-600' : ''}
                      ${plan === 'pro' ? 'bg-indigo-500 text-white border-indigo-600' : ''}
                      ${plan === 'free' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                    `}>
                      {plan}
                    </Badge>
                  ))}
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm mt-1 text-slate-500">
                {styleData.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="ai" className="font-bold flex gap-2"><Bot className="h-4 w-4" /> Prompt General (IA)</TabsTrigger>
              <TabsTrigger value="sections" className="font-bold flex gap-2"><FileText className="h-4 w-4" /> Secciones & Prompts</TabsTrigger>
              <TabsTrigger value="visual" className="font-bold flex gap-2"><Layers className="h-4 w-4" /> Composición Visual</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-500 mb-2 tracking-widest">¿Quién habla y cómo se expresa?</h3>
                <div className="bg-slate-900 text-slate-100 p-6 rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
                  {styleData.aiDirectives || 'No hay directivas globales configuradas para este estilo.'}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sections" className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-2 tracking-widest">Secciones disponibles ({styleData.availableSections?.length || 0})</h3>
              <div className="grid gap-4">
                {styleData.availableSections?.map((section) => (
                  <div key={section.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-slate-50 uppercase text-[10px] tracking-widest font-black border-slate-300">
                          ID: {section.id}
                        </Badge>
                        <h4 className="font-black text-lg text-slate-800">{section.name}</h4>
                      </div>
                      <div className="flex gap-2">
                        {section.required && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Obligatoria
                          </Badge>
                        )}
                        {section.isRepeatable && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-bold text-xs gap-1">
                            <CopyPlus className="h-3 w-3" /> Multi-Instancia
                          </Badge>
                        )}
                        <Badge variant="secondary" className="font-bold text-xs capitalize">
                          Tipo: {section.contentType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50 mt-2">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Prompt Específico de la Sección:</p>
                      <p className="text-sm text-slate-700 font-medium italic">
                        "{section.description || 'Sin prompt específico.'}"
                      </p>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100/50">
                      <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1.5">Estructura Visual (Blueprint):</p>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">
                        {section.blueprint || 'Sin estructura definida.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="visual" className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layout Base</p>
                  <p className="font-bold text-slate-900 text-lg capitalize">{styleData.layout}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estilos Comp.</p>
                  <p className="font-bold text-slate-900 text-lg capitalize">{styleData.componentStyle}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Espaciado</p>
                  <p className="font-bold text-slate-900 text-lg capitalize">{styleData.spacing}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Animaciones</p>
                  <p className="font-bold text-slate-900 text-lg capitalize">{styleData.animations}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                  <span className="w-6 h-[2px] bg-slate-300"></span> Paletas de Color
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {styleData.colorProposals?.map((palette, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-sm flex flex-col items-center justify-center gap-2 hover:border-slate-300 transition-colors">
                      <p className="font-bold text-slate-700 text-xs text-center truncate w-full" title={palette.name}>{palette.name}</p>
                      <div className="flex -space-x-1.5">
                        <div className="w-6 h-6 rounded-full border border-white shadow-sm z-30" style={{ backgroundColor: palette.primary }} title={`Primary: ${palette.primary}`} />
                        <div className="w-6 h-6 rounded-full border border-white shadow-sm z-20" style={{ backgroundColor: palette.secondary }} title={`Secondary: ${palette.secondary}`} />
                        <div className="w-6 h-6 rounded-full border border-white shadow-sm z-10" style={{ backgroundColor: palette.accent }} title={`Accent: ${palette.accent}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                  <span className="w-6 h-[2px] bg-slate-300"></span> Tipografías
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {styleData.typography?.map((typo, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-slate-800 text-sm truncate pr-2" title={typo.name}>{typo.name}</p>
                        <Badge variant="outline" className="bg-white text-[9px] px-1.5 py-0 h-4">T-{i+1}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 truncate" title={`Heading: ${typo.headingFont}`}>
                          <span className="font-bold text-slate-400">H:</span> {typo.headingFont} <span className="text-slate-400">({typo.headingScale}x)</span>
                        </p>
                        <p className="text-[10px] text-slate-500 truncate" title={`Body: ${typo.bodyFont}`}>
                          <span className="font-bold text-slate-400">B:</span> {typo.bodyFont} <span className="text-slate-400">({typo.bodyScale}x)</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 shrink-0">
          <Button variant="outline" onClick={onClose} className="font-bold">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
