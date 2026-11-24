'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Loader2, Link2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailChannelEditorProps {
  emails: any[];
  activeEmailIdx: number;
  setActiveEmailIdx: (idx: number) => void;
  normalizedLandingsList: { id: string; title: string; url: string }[];
  isGeneratingBreakdown: string | null;
  onGenerateEmail: (email: any, index: number) => void;
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
}

export function EmailChannelEditor({
  emails,
  activeEmailIdx,
  setActiveEmailIdx,
  normalizedLandingsList,
  isGeneratingBreakdown,
  onGenerateEmail,
  updateAsset,
}: EmailChannelEditorProps) {
  return (
    <Tabs value={activeEmailIdx.toString()} onValueChange={v => setActiveEmailIdx(parseInt(v))}>
      <TabsList className="bg-muted/40 p-1.5 h-12 justify-start gap-1 rounded-xl mb-8 border border-border w-fit">
        {emails?.map((e: any, i: number) => (
          <TabsTrigger key={i} value={i.toString()} className="px-6 h-9 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground">
            {e.marketingName || `Email ${i + 1}`}
          </TabsTrigger>
        ))}
      </TabsList>
      {emails?.map((e: any, eIdx: number) => (
        <TabsContent key={eIdx} value={eIdx.toString()} className="space-y-8 max-w-4xl mx-auto">
          <Card className="p-12 rounded-lg bg-white border border-border space-y-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-xl text-foreground uppercase tracking-tighter">Correo {eIdx + 1}</h3>
                <p className="text-xs text-muted-foreground font-medium">Genera el contenido individualmente con IA segun el tipo de correo.</p>
              </div>
              <Button
                onClick={() => onGenerateEmail(e, eIdx)}
                disabled={isGeneratingBreakdown === `emails-${eIdx}`}
                className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2"
              >
                {isGeneratingBreakdown === `emails-${eIdx}` ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redactando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generar con IA</>
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4 tracking-[0.2em]">Asunto del Correo</Label>
              <Input value={e.subject || ''} onChange={v => updateAsset('emails', eIdx, 'subject', v.target.value)} className="h-16 rounded-3xl border-border bg-white px-8 font-black text-2xl text-foreground focus-visible:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4 tracking-[0.2em]">Preheader (Texto de Vista Previa)</Label>
              <Input value={e.preheader || ''} onChange={v => updateAsset('emails', eIdx, 'preheader', v.target.value)} className="h-14 rounded-3xl border-border bg-white px-8 font-bold text-lg text-foreground focus-visible:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4 tracking-[0.2em]">Cuerpo Narrativo</Label>
              <Textarea value={e.body || ''} onChange={v => updateAsset('emails', eIdx, 'body', v.target.value)} className="min-h-[500px] border-border bg-white p-12 leading-relaxed text-lg font-medium text-foreground focus-visible:ring-primary/50" />
            </div>

            <div className="pt-6 border-t border-border">
              <Label className="text-[10px] font-black uppercase text-primary ml-4 tracking-widest mb-4 block">Destino del CTA (Boton)</Label>
              <Select
                value={e.landingId || 'mentor'}
                onValueChange={(val) => updateAsset('emails', eIdx, 'landingId', val)}
              >
                <SelectTrigger size="xl" className="bg-white border-border text-xs font-bold text-foreground px-8">
                  <div className="flex items-center gap-3">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span>Vincular con: <SelectValue placeholder="Seleccionar Landing" /></span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-foreground">
                  <SelectItem value="mentor" className="text-[10px] uppercase font-bold hover:bg-muted/40">URL del Mentor</SelectItem>
                  {normalizedLandingsList.map((landing) => (
                    <SelectItem key={landing.id} value={landing.id} className="text-[10px] uppercase font-bold hover:bg-muted/40">
                      Landing: {landing.title} ({landing.url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
