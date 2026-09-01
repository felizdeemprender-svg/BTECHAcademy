import React, { ReactNode } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface FileUploadAreaProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing?: boolean;
  multiple?: boolean;
  accept?: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function FileUploadArea({
  onChange,
  isProcessing = false,
  multiple = false,
  accept,
  title = "Cargar Materiales",
  description = "PDF, Word o TXT.",
  icon = <Upload className="text-primary" />,
  className = ""
}: FileUploadAreaProps) {
  return (
    <div className={`p-12 border-2 border-dashed rounded-lg flex flex-col items-center gap-4 relative bg-muted/5 hover:bg-muted/10 transition-all group ${className}`}>
      <input 
        type="file" 
        multiple={multiple} 
        accept={accept}
        className="absolute inset-0 opacity-0 cursor-pointer" 
        onChange={onChange} 
      />
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
        {isProcessing ? <Loader2 className="animate-spin text-primary" /> : icon}
      </div>
      <div className="text-center">
        <p className="font-bold text-lg">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
