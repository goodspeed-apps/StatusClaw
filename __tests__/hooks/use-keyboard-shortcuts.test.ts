import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useKeyboardShortcuts, useTaskShortcuts } from "@/hooks/use-keyboard-shortcuts"

describe("useKeyboardShortcuts", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it("should call handler when key is pressed", () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: "n", handler, preventDefault: false },
        ],
        target: container,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "n" })
    container.dispatchEvent(event)

    expect(handler).toHaveBeenCalled()
  })

  it("should handle meta modifier (cmd/ctrl)", () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: "n", modifiers: { meta: true }, handler },
        ],
        target: container,
      })
    )

    // Should trigger with meta key
    const event1 = new KeyboardEvent("keydown", { key: "n", metaKey: true })
    container.dispatchEvent(event1)
    expect(handler).toHaveBeenCalledTimes(1)

    // Should not trigger without modifier
    const event2 = new KeyboardEvent("keydown", { key: "n" })
    container.dispatchEvent(event2)
    expect(handler).toHaveBeenCalledTimes(1)

    // Should also trigger with ctrl key (treated as meta equivalent)
    const event3 = new KeyboardEvent("keydown", { key: "n", ctrlKey: true })
    container.dispatchEvent(event3)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it("should handle ctrl modifier", () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: "n", modifiers: { ctrl: true }, handler },
        ],
        target: container,
      })
    )

    // Should trigger with ctrl key
    const event1 = new KeyboardEvent("keydown", { key: "n", ctrlKey: true })
    container.dispatchEvent(event1)
    expect(handler).toHaveBeenCalledTimes(1)

    // Should not trigger without modifier
    const event2 = new KeyboardEvent("keydown", { key: "n" })
    container.dispatchEvent(event2)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("should prevent default when specified", () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: "s", modifiers: { meta: true }, handler, preventDefault: true },
        ],
        target: container,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "s", metaKey: true })
    const preventDefaultSpy = vi.spyOn(event, "preventDefault")
    container.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it("should not call handler when shortcut is disabled", () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: "n", handlers: handler, enabled: false },
        ],
        target: container,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "n" })
    container.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })
})

describe("useTaskShortcuts", () => {
  let windowSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create a mock window for testing
    windowSpy = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should call onNewTask with Cmd+N", () => {
    const onNewTask = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onNewTask,
        modalOpen: false,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "n", metaKey: true })
    window.dispatchEvent(event)

    expect(onNewTask).toHaveBeenCalled()
  })

  it("should call onNewTask with Ctrl+N (Windows/Linux)", () => {
    const onNewTask = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onNewTask,
        modalOpen: false,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "n", ctrlKey: true })
    window.dispatchEvent(event)

    expect(onNewTask).toHaveBeenCalled()
  })

  it("should call onSaveTask with Cmd+S when modal is open and canSave is true", () => {
    const onSaveTask = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onSaveTask,
        canSave: true,
        modalOpen: true,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "s", metaKey: true })
    window.dispatchEvent(event)

    expect(onSaveTask).toHaveBeenCalled()
  })

  it("should not call onSaveTask when canSave is false", () => {
    const onSaveTask = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onSaveTask,
        canSave: false,
        modalOpen: true,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "s", metaKey: true })
    window.dispatchEvent(event)

    expect(onSaveTask).not.toHaveBeenCalled()
  })

  it("should not call onSaveTask when modal is closed", () => {
    const onSaveTask = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onSaveTask,
        canSave: true,
        modalOpen: false,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "s", metaKey: true })
    window.dispatchEvent(event)

    expect(onSaveTask).not.toHaveBeenCalled()
  })

  it("should call onCancel with Escape when modal is open", () => {
    const onCancel = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onCancel,
        modalOpen: true,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "Escape" })
    window.dispatchEvent(event)

    expect(onCancel).toHaveBeenCalled()
  })

  it("should not call onCancel with Escape when modal is closed", () => {
    const onCancel = vi.fn()

    renderHook(() =>
      useTaskShortcuts({
        onCancel,
        modalOpen: false,
      })
    )

    const event = new KeyboardEvent("keydown", { key: "Escape" })
    window.dispatchEvent(event)

    expect(onCancel).not.toHaveBeenCalled()
  })
})
