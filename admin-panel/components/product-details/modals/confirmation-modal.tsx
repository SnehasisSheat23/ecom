"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  itemsCount?: number
  itemsList?: string[]
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemsCount = 0,
  itemsList = [],
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
}: ConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    setIsConfirming(false)
  }

  if (!isOpen) return null

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isConfirming) return
    setIsConfirming(true)
    try {
      await onConfirm()
    } catch (err) {
      console.error("Confirmation action failed:", err)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isConfirming) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-md bg-background border border-border rounded-lg shadow-lg p-6 animate-in zoom-in-95 duration-300 flex flex-col gap-4 focus-visible:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Items List (Minimalist, bordered box like Stripe/Linear) */}
        {itemsList.length > 0 && (
          <div className="max-h-28 overflow-y-auto border border-border/80 rounded-md p-3 bg-muted/20 flex flex-col gap-1.5 text-xs text-muted-foreground">
            {itemsList.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                <span className="truncate font-medium text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="cursor-pointer font-medium"
            disabled={isConfirming}
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm}
            className={`cursor-pointer font-medium text-white ${
              variant === "danger" 
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            disabled={isConfirming}
          >
            {isConfirming ? "Confirming..." : confirmText}
          </Button>
        </div>

      </div>
    </div>
  )
}
