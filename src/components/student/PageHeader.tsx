
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  category: string;
  title: string;
  description?: string;
  version?: string;
  badges?: Array<{
    icon: LucideIcon;
    label: string;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive';
    className?: string;
    iconClassName?: string;
  }>;
}

export function StudentPageHeader({
  icon: Icon,
  category,
  title,
  description,
  version,
  badges = []
}: PageHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8 mb-10">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent mb-2">
          <Icon className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">
            {category}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground font-medium mt-1 flex flex-wrap items-center gap-2">
            {description}
            {version && (
              <span className="text-[10px] bg-border text-muted-foreground px-1.5 py-0.5 rounded-md font-mono">
                {version}
              </span>
            )}
          </p>
        )}
      </div>
      
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, idx) => (
            <Badge 
              key={idx}
              variant={badge.variant || 'default'}
              className={cn(
                "px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-sm",
                badge.variant === 'default' && !badge.className && "bg-foreground text-white border-none",
                badge.className
              )}
            >
              <badge.icon className={cn("h-3.5 w-3.5 mr-2", badge.iconClassName)} />
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
    </header>
  );
}
