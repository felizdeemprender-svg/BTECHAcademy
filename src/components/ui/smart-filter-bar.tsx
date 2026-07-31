
'use client';

import React from 'react';
import { Search, BarChart3, LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SmartFilterBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  rightLabel?: string;
  className?: string;
}

export function SmartFilterBar({
  placeholder = "Buscar...",
  value,
  onChange,
  icon: Icon = Search,
  rightLabel = "Filtros Inteligentes Activos",
  className
}: SmartFilterBarProps) {
  return (
    <div className={cn(
      "flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/10 p-4 rounded-lg border border-dashed border-primary/20",
      className
    )}>
      <div className="relative flex-1 w-full">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={placeholder} 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-11 bg-white border-none shadow-sm font-medium focus-visible:ring-primary/20 transition-all"
         size="lg" />
      </div>
      <div className="flex items-center gap-3 px-4 shrink-0">
         <BarChart3 className="h-4 w-4 text-primary opacity-50" />
         <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{rightLabel}</span>
      </div>
    </div>
  );
}
