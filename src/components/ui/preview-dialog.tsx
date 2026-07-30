"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  maxWidth?: string
  className?: string
}

function PreviewDialog({
  open,
  onOpenChange,
  children,
  title,
  maxWidth,
  className,
}: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 overflow-hidden", maxWidth || "mw-4xl", className)}>
        {title && <DialogTitle className="sr-only">{title}</DialogTitle>}
        {children}
      </DialogContent>
    </Dialog>
  )
}

export { PreviewDialog }
export type { PreviewDialogProps }
