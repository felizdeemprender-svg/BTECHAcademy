"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  submitLabel?: string
  onSubmit?: () => void | Promise<void>
  loading?: boolean
  maxWidth?: string
  disabled?: boolean
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  submitLabel = "Guardar",
  onSubmit,
  loading: externalLoading,
  maxWidth,
  disabled,
}: FormDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const loading = externalLoading ?? internalLoading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!onSubmit) return
    setInternalLoading(true)
    try {
      await onSubmit()
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidth || "mw-md")}>
        <form onSubmit={onSubmit ? handleSubmit : undefined}>
          <DialogHeader className="mb-6">
            {icon && (
              <div className="w-14 h-14 bg-primary/10 rounded-[calc(var(--radius)*1.5)] flex items-center justify-center text-primary mb-4">
                {icon}
              </div>
            )}
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-6">{children}</div>
          {onSubmit && (
            <DialogFooter className="mt-8">
              <Button
                type="submit"
                disabled={loading || disabled}
                className="w-full h-14 text-lg font-bold"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {submitLabel}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { FormDialog }
export type { FormDialogProps }
