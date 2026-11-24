'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface AdsChannelEditorProps {
  ads: any[];
  activeAdsIdx: number;
  setActiveAdsIdx: (idx: number) => void;
  normalizedLandingsList: { id: string; title: string; url: string }[];
  isGeneratingBreakdown: string | null;
  onGenerateAds: (ad: any, index: number) => void;
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
}

export function AdsChannelEditor({
  ads,
  activeAdsIdx,
  setActiveAdsIdx,
  normalizedLandingsList,
  isGeneratingBreakdown,
  onGenerateAds,
  updateAsset,
}: AdsChannelEditorProps) {
  return (
    <Tabs value={activeAdsIdx.toString()} onValueChange={v => setActiveAdsIdx(parseInt(v))}>
      <TabsList className="bg-muted/40 p-1.5 h-12 justify-start gap-1 rounded-xl mb-10 border border-border w-fit">
        {ads?.map((a: any, i: number) => (
          <TabsTrigger key={i} value={i.toString()} className="px-8 h-9 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground">
            {a.marketingName || `Ads ${i + 1}`}
          </TabsTrigger>
        ))}
      </TabsList>
      {ads?.map((a: any, aIdx: number) => (
        <TabsContent key={aIdx} value={aIdx.toString()} className="grid lg:grid-cols-2 gap-12">
          <div className="flex flex-wrap items-center justify-between gap-4 lg:col-span-2">
            <div>
              <h3 className="font-black text-2xl text-foreground uppercase tracking-tighter">Anuncio {aIdx + 1}</h3>
              <p className="text-xs text-muted-foreground font-medium">Genera los titulares, descripciones y keywords individualmente con IA.</p>
            </div>
            <Button
              onClick={() => onGenerateAds(a, aIdx)}
              disabled={isGeneratingBreakdown === `ads-${aIdx}`}
              className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2"
            >
              {isGeneratingBreakdown === `ads-${aIdx}` ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redactando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generar con IA</>
              )}
            </Button>
          </div>
          <Card className="p-12 rounded-lg bg-white border border-border space-y-10">
            <h3 className="font-black text-2xl text-foreground uppercase tracking-tighter">Titulos</h3>
            <div className="space-y-6">
              {a.headlines?.map((h: string, i: number) => (
                <Input key={i} value={h} onChange={e => updateAsset('ads', aIdx, 'headlines', e.target.value, i)} className="font-bold h-16 bg-white border-border text-foreground px-8" />
              ))}
            </div>
          </Card>
          <Card className="p-12 rounded-lg bg-white border border-border space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-2xl text-foreground uppercase tracking-tighter">Descripciones</h3>
              <div className="w-64">
                <Select
                  value={a.landingId || 'mentor'}
                  onValueChange={(val) => updateAsset('ads', aIdx, 'landingId', val)}
                >
                  <SelectTrigger className="h-10 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>Link: <SelectValue placeholder="Destino" /></span>
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
            </div>
            <div className="space-y-8">
              {a.descriptions?.map((d: string, i: number) => (
                <Textarea key={i} value={d} onChange={e => updateAsset('ads', aIdx, 'descriptions', e.target.value, i)} className="min-h-[140px] bg-white border-border text-foreground p-8" />
              ))}
            </div>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
