
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: 'accent' | 'emerald' | 'slate' | 'blue' | 'amber' | 'purple';
}

export function StudentStatCard({ 
  icon: Icon, 
  label, 
  value, 
  color = 'slate' 
}: StatCardProps) {
  const colors = {
    accent: "bg-accent/10 text-accent",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700"
  };

  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden group transition-all hover:shadow-md">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className={cn(
            "p-2.5 md:p-3 rounded-xl transition-transform duration-500 group-hover:rotate-6",
            colors[color]
          )}>
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <span className="text-2xl md:text-3xl font-headline font-bold text-slate-900 tracking-tighter">
            {value}
          </span>
        </div>
        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-tight">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}
