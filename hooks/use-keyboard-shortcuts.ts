"use client"

import { useEffect, useCallback, useRef } from "react"

type ShortcutHandler = (event: KeyboardEvent) => boolean | void

interface ShortcutConfig {
  key: string
  modifiers?: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
  }
  handler: ShortcutHandler
  preventDefault?: boolean
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[]
  target?: HTMLElement | Window | null
}

export function useKeyboardShortcuts({
  shortcuts,
  target = typeof window !== "undefined" ? window : null,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)

  // Keep shortcuts ref up to date
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Get currently focused element
    const activeElement = document.activeElement
    const isInputFocused =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue

      const { key, modifiers = {}, preventDefault = true } = shortcut

      // Check if key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) continue

      // Check modifiers
      const { ctrl = false, meta = false, shift = false, alt = false } = modifiers

      const isCtrlOrMeta = event.ctrlKey || event.metaKey

      // Ctrl/Cmd handling - either ctrl or meta is acceptable for Cmd key on Mac
      if ((ctrl || meta) && !isCtrlOrMeta) continue
      if (!(ctrl || meta) && isCtrlOrMeta) continue

      // Shift key
      if (shift && !event.shiftKey) continue
      if (!shift && event.shiftKey) continue

      // Alt key
      if (alt && !event.altKey) continue
      if (!alt && event.altKey) continue

      // Handle special cases for inputs
      // Allow default behavior for arrow keys, tab, etc. in inputs
      if (isInputFocused && !shortcut.preventDefault) {
        // Don't prevent default in inputs unless explicitly requested
        // But still call the handler if matched
      } else if (preventDefault) {
        event.preventDefault()
      }

      // Call handler and check if it handled the event
      const handled = shortcut.handler(event)
      if (handled !== false) {
        // Stop processing other shortcuts if this one was handled
        break
      }
    }
  }, [])

  useEffect(() => {
    if (!target) return

    const element = target instanceof Window ? target : target
    element.addEventListener("keydown", handleKeyDown as EventListener)

    return () => {
      element.removeEventListener("keydown", handleKeyDown as EventListener)
    }
  }, [target, handleKeyDown])
}

// Helper hook specifically for task-related shortcuts
export function useTaskShortcuts({
  onNewTask,
  onSaveTask,
  onCancel,
  canSave = false,
  modalOpen = false,
}: {
  onNewTask?: () => void
  onSaveTask?: () => void
  onCancel?: () => void
  canSave?: boolean
  modalOpen?: boolean
}) {
  useKeyboardShortcuts({
    shortcuts: [
      // Cmd+N for new task (works globally)
      {
        key: "n",
        modifiers: { meta: true },
        handler: () => {
          onNewTask?.()
          return true
        },
        enabled: !!onNewTask,
        preventDefault: true,
      },
      // Ctrl+N for new task (Windows/Linux)
      {
        key: "n",
        modifiers: { ctrl: true },
        handler: () => {
          onNewTask?.()
          return true
        },
        enabled: !!onNewTask,
        preventDefault: true,
      },
      // Cmd+S for save (only when modal is open)
      {
        key: "s",
        modifiers: { meta: true },
        handler: () => {
          if (canSave && modalOpen) {
            onSaveTask?.()
            return true
          }
          return false
        },
        enabled: !!onSaveTask && modalOpen && canSave,
        preventDefault: true,
      },
      // Ctrl+S for save (Windows/Linux)
      {
        key: "s",
        modifiers: { ctrl: true },
        handler: () => {
          if (canSave && modalOpen) {
            onSaveTask?.()
            return true
          }
          return false
        },
        enabled: !!onSaveTask && modalOpen && canSave,
        preventDefault: true,
      },
      // Esc for cancel (only when modal is open)
      {
        key: "Escape",
        handler: () => {
          if (modalOpen) {
            onCancel?.()
            return true
          }
          return false
        },
        enabled: !!onCancel && modalOpen,
        preventDefault: false, // Allow modal's default close behavior
      },
    ],
  })
}
