"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, Palette, Type, Trash2 } from "lucide-react"
import { StyleBrand, TOKEN_LABELS, TOKEN_DESCRIPTIONS } from "@/lib/landing-styles"
import { expandColorGamut, tokenSummary } from "@/lib/landing-styles/palette-gamut"

interface BrandVisualProps {
  brands: StyleBrand[]
  customBrands?: StyleBrand[]
  activeName?: string | null
  onSelect?: (brand: StyleBrand) => void
  onDelete?: (brand: StyleBrand) => void
  emptyMessage?: string
}

function GamutStrip({ color }: { color?: string }) {
  const gamut = color ? expandColorGamut(color) : []
  if (gamut.length === 0) return null
  return (
    <div className="flex h-6 gap-[2px] overflow-hidden rounded-md border border-border">
      {gamut.map((c, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: c }} title={c} />
      ))}
    </div>
  )
}

function BrandDetail({ brand }: { brand: StyleBrand }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ backgroundColor: brand.palette?.primary }}>
          <Palette className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground">{brand.name}</p>
          {brand.description && <p className="text-xs text-muted-foreground">{brand.description}</p>}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Paleta: {brand.palette?.name}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground">Primario</p>
            <GamutStrip color={brand.palette?.primary} />
            <p className="font-mono text-[10px] text-muted-foreground">{brand.palette?.primary}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground">Secundario</p>
            <GamutStrip color={brand.palette?.secondary} />
            <p className="font-mono text-[10px] text-muted-foreground">{brand.palette?.secondary}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground">Acento</p>
            <GamutStrip color={brand.palette?.accent} />
            <p className="font-mono text-[10px] text-muted-foreground">{brand.palette?.accent}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tipografía: {brand.typography?.name}</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 bg-white border border-border rounded-lg px-2 py-1">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            Títulos: <span className="font-bold text-foreground">{brand.typography?.headingFont}</span>
            <span className="text-muted-foreground">({brand.typography?.headingScale}x)</span>
          </span>
          <span className="inline-flex items-center gap-1 bg-white border border-border rounded-lg px-2 py-1">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            Cuerpo: <span className="font-bold text-foreground">{brand.typography?.bodyFont}</span>
            <span className="text-muted-foreground">({brand.typography?.bodyScale}x)</span>
          </span>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tokens</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {Object.keys(TOKEN_LABELS).map((key) => {
            const tokenKey = key as keyof StyleBrand['tokens']
            const value = brand.tokens?.[tokenKey]
            return (
              <div key={key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground" title={TOKEN_DESCRIPTIONS[tokenKey]}>{TOKEN_LABELS[tokenKey]}</span>
                <span className="font-mono text-foreground truncate text-right max-w-[180px]" title={value ? String(value) : undefined}>
                  {tokenSummary(value ? String(value) : '')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function BrandVisual({
  brands,
  customBrands,
  activeName,
  onSelect,
  onDelete,
  emptyMessage = 'Este estilo no tiene brands configurados.',
}: BrandVisualProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null)

  const resolvedName = selectedName ?? activeName ?? null
  const allBrands = [...brands, ...(customBrands || [])]
  const active = allBrands.find((b) => b.name === resolvedName) || allBrands[0] || null

  if (allBrands.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const renderBrandCard = (brand: StyleBrand, isActive: boolean) => (
    <div
      key={brand.name}
      onClick={() => {
        setSelectedName(brand.name)
        onSelect?.(brand)
      }}
      className={cn(
        "p-3 rounded-xl border-2 text-left transition-all relative cursor-pointer",
        isActive ? "border-primary bg-primary/5 shadow-md" : "border-border bg-white hover:border-primary/30"
      )}
    >
      {isActive && (
        <div className="absolute top-3 right-3 text-primary pointer-events-none">
          <CheckCircle2 className="w-4 h-4 fill-primary text-white" />
        </div>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(brand)
          }}
          className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full p-1"
          title={`Eliminar brand "${brand.name}"`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-2 mb-2 pr-8">
        <div className="w-5 h-5 rounded-md flex-shrink-0 shadow-sm" style={{ backgroundColor: brand.palette?.primary }} />
        <span className="font-bold text-sm text-foreground truncate">{brand.name}</span>
      </div>
      <GamutStrip color={brand.palette?.primary} />
      <div className="flex gap-[2px] mt-1">
        <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: brand.palette?.secondary }} />
        <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: brand.palette?.accent }} />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {brands.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {brands.map((brand) => renderBrandCard(brand, active?.name === brand.name))}
        </div>
      )}

      {customBrands && customBrands.length > 0 && (
        <div className="pt-4 border-t border-border mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Tus Brands Personalizados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customBrands.map((brand) => renderBrandCard(brand, active?.name === brand.name))}
          </div>
        </div>
      )}

      {active && (
        <div className="p-4 rounded-xl border border-border bg-muted/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Detalle del brand</p>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(active)}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Aplicar a la landing
              </button>
            )}
          </div>
          <BrandDetail brand={active} />
        </div>
      )}
    </div>
  )
}
