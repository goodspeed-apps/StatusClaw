import "@testing-library/jest-dom"
import { expect, vi } from "vitest"

// Extend vitest expect with jest-dom matchers
expect.extend({
  toBeInTheDocument: (received) => ({
    pass: received && received.ownerDocument && received.ownerDocument.contains(received),
    message: () => `expected element to be in the document`,
  }),
  toBeVisible: (received) => ({
    pass: received && getComputedStyle(received).display !== "none",
    message: () => `expected element to be visible`,
  }),
  // Add more matchers as needed
})

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Suppress console warnings during tests
const originalConsoleWarn = console.warn
console.warn = (...args: unknown[]) => {
  // Filter out specific warnings if needed
  if (typeof args[0] === "string" && args[0].includes("React Router")) {
    return
  }
  originalConsoleWarn(...args)
}

// Add test environment flag
;(globalThis as unknown as { __vitest__: boolean }).__vitest__ = true
