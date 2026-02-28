"use client"

import { useEffect, useRef, useCallback, useState } from "react"

export type ShortcutType = "primary" | "sequence" | "help"

interface UseKeyboardShortcutsOptions {
  onNewIncident: () => void
  onOpenHelp: () => void
  isEnabled?: boolean
}

interface KeyboardShortcutsState {
  isHelpOpen: boolean
  isIncidentModalOpen: boolean
  sequenceBuffer: string
}

const SEQUENCE_TIMEOUT = 800 // ms
const INPUT_ELEMENTS = ["INPUT", "TEXTAREA", "SELECT"]

function isInputElement(element: Element | null): boolean {
  if (!element) return false
  const tagName = element.tagName
  if (INPUT_ELEMENTS.includes(tagName)) return true
  if (element.getAttribute("contenteditable") === "true") return true
  return false
}

function isMac(): boolean {
  return typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC")
}

export function useKeyboardShortcuts({
  onNewIncident,
  onOpenHelp,
  isEnabled = true,
}: UseKeyboardShortcutsOptions) {
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
  const sequenceBufferRef = useRef<string>("")
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  // Store last focused element before opening modal
  const storeFocus = useCallback(() => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement
  }, [])

  // Restore focus when closing modal
  const restoreFocus = useCallback(() => {
    if (lastFocusedElementRef.current && typeof lastFocusedElementRef.current.focus === "function") {
      lastFocusedElementRef.current.focus()
    }
  }, [])

  // Open incident modal with focus management
  const openIncidentModal = useCallback(() => {
    if (isIncidentModalOpen) {
      // Already open, just focus the title field
      const titleInput = document.querySelector('[data-testid="incident-title-input"]') as HTMLElement
      titleInput?.focus()
      return
    }
    storeFocus()
    setIsIncidentModalOpen(true)
    onNewIncident()
  }, [isIncidentModalOpen, storeFocus, onNewIncident])

  // Close incident modal with focus restore
  const closeIncidentModal = useCallback(() => {
    setIsIncidentModalOpen(false)
    // Defer focus restore to after modal closes
    setTimeout(restoreFocus, 0)
  }, [restoreFocus])

  // Open help dialog with focus management
  const openHelp = useCallback(() => {
    storeFocus()
    setIsHelpOpen(true)
    onOpenHelp()
  }, [storeFocus, onOpenHelp])

  // Close help dialog with focus restore
  const closeHelp = useCallback(() => {
    setIsHelpOpen(false)
    setTimeout(restoreFocus, 0)
  }, [restoreFocus])

  // Clear sequence buffer
  const clearSequence = useCallback(() => {
    sequenceBufferRef.current = ""
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current)
      sequenceTimeoutRef.current = null
    }
  }, [])

  // Handle sequence input (G -> I)
  const handleSequence = useCallback(
    (key: string) => {
      // Clear existing timeout
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current)
      }

      sequenceBufferRef.current += key.toLowerCase()

      // Check for "gi" sequence
      if (sequenceBufferRef.current === "gi") {
        clearSequence()
        openIncidentModal()
        return
      }

      // If buffer starts with 'g' but not 'gi', wait for next key
      if (sequenceBufferRef.current === "g") {
        sequenceTimeoutRef.current = setTimeout(() => {
          sequenceBufferRef.current = ""
        }, SEQUENCE_TIMEOUT)
        return
      }

      // Invalid sequence, clear it
      clearSequence()
    },
    [clearSequence, openIncidentModal]
  )

  useEffect(() => {
    if (!isEnabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element
      const isInInput = isInputElement(target)
      const isComposing = event.isComposing || (event as KeyboardEvent & { keyCode: number }).keyCode === 229

      // Always allow Escape to close modals
      if (event.key === "Escape") {
        if (isHelpOpen) {
          event.preventDefault()
          closeHelp()
          return
        }
        if (isIncidentModalOpen) {
          event.preventDefault()
          closeIncidentModal()
          return
        }
      }

      // Skip shortcuts if in input or composing
      if (isInInput || isComposing) return

      // Help shortcut: ? (Shift+/) or Ctrl/Cmd+Shift+?
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault()
        openHelp()
        return
      }

      // Primary shortcut: Cmd/Ctrl+Shift+N
      if (event.key.toLowerCase() === "n" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        openIncidentModal()
        return
      }

      // Sequence shortcut: G then I
      if (event.key.toLowerCase() === "g" || event.key.toLowerCase() === "i") {
        // Only handle single character keys for sequence
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          handleSequence(event.key)
          return
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current)
      }
    }
  }, [isEnabled, isHelpOpen, isIncidentModalOpen, openHelp, openIncidentModal, closeHelp, closeIncidentModal, handleSequence])

  return {
    isHelpOpen,
    isIncidentModalOpen,
    openIncidentModal,
    closeIncidentModal,
    openHelp,
    closeHelp,
    isMac: isMac(),
  }
}

export { isMac, isInputElement }