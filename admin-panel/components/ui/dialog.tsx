"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Container */}
      <div className="relative z-50 w-full flex items-center justify-center pointer-events-auto">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative w-full mx-auto rounded-xl border bg-card p-6 shadow-xl transition-all animate-in zoom-in-95 ${className}`}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-1 text-left pb-4 border-b ${className}`}>{children}</div>
}

export function DialogTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h2>
}

export function DialogDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-muted-foreground mt-1 ${className}`}>{children}</p>
}

export function DialogFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-end gap-2 pt-4 border-t mt-4 ${className}`}>{children}</div>
}
