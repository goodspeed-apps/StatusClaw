/**
 * Theme Configuration Tests
 * Issue #41 - Status Page Theming + Branding Settings
 */

import { describe, test, expect } from 'vitest'
import {
  BrandingSchema,
  DEFAULT_BRANDING,
  hexToOKLCH,
  generateThemeCSS,
  sanitizeBrandingConfig,
  mergeBrandingConfig,
  parseBrandingConfig,
  validateLogoUpload,
  validateFaviconUpload,
  ALLOWED_LOGO_TYPES,
  ALLOWED_FAVICON_TYPES,
  MAX_UPLOAD_SIZE,
} from '../lib/theme-config'
import type { BrandingConfig } from '../lib/theme-config'

describe('BrandingSchema', () => {
  test('validates complete valid config', () => {
    const config = {
      orgName: 'Test Org',
      logo: { path: '/uploads/logo.png', alt: 'Test Logo' },
      favicon: { path: '/uploads/favicon.ico' },
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 10,
        mode: 'system',
        scope: 'status_only',
      },
      updatedAt: '2026-02-28T00:00:00.000Z',
    }
    
    const result = BrandingSchema.parse(config)
    expect(result.orgName).toBe('Test Org')
    expect(result.theme.primary).toBe('#4f46e5')
  })
  
  test('applies defaults for missing fields', () => {
    const config = {}
    const result = BrandingSchema.parse(config)
    
    expect(result.orgName).toBe('StatusClaw')
    expect(result.theme.primary).toBe('#4f46e5')
    expect(result.theme.accent).toBe('#10b981')
    expect(result.theme.radiusPx).toBe(10)
    expect(result.theme.mode).toBe('system')
    expect(result.theme.scope).toBe('status_only')
  })
  
  test('rejects invalid hex colors', () => {
    const config = {
      theme: {
        primary: 'not-a-color',
        accent: '#10b981',
      },
    }
    
    expect(() => BrandingSchema.parse(config)).toThrow()
  })
  
  test('rejects hex without hash prefix', () => {
    const config = {
      theme: {
        primary: '4f46e5',
        accent: '#10b981',
      },
    }
    
    expect(() => BrandingSchema.parse(config)).toThrow()
  })
  
  test('accepts all valid theme modes', () => {
    const modes = ['system', 'light', 'dark']
    
    for (const mode of modes) {
      const config = { theme: { mode } }
      const result = BrandingSchema.parse(config)
      expect(result.theme.mode).toBe(mode)
    }
  })
  
  test('accepts all valid theme scopes', () => {
    const scopes = ['status_only', 'global']
    
    for (const scope of scopes) {
      const config = { theme: { scope } }
      const result = BrandingSchema.parse(config)
      expect(result.theme.scope).toBe(scope)
    }
  })
  
  test('rejects invalid theme modes', () => {
    const config = { theme: { mode: 'invalid' } }
    expect(() => BrandingSchema.parse(config)).toThrow()
  })
  
  test('enforces radius bounds', () => {
    const tooSmall = { theme: { radiusPx: -1 } }
    const tooLarge = { theme: { radiusPx: 33 } }
    
    expect(() => BrandingSchema.parse(tooSmall)).toThrow()
    expect(() => BrandingSchema.parse(tooLarge)).toThrow()
  })
  
  test('enforces orgName max length', () => {
    const tooLong = { orgName: 'a'.repeat(101) }
    expect(() => BrandingSchema.parse(tooLong)).toThrow()
  })
})

describe('hexToOKLCH', () => {
  test('converts hex to oklch format', () => {
    const result = hexToOKLCH('#4f46e5')
    expect(result).toMatch(/^oklch\(/)
    // Hue should be in the blue-purple range (200-280)
    const hueMatch = result.match(/oklch\([\d.]+ [\d.]+ (\d+)\)/)
    expect(hueMatch).toBeTruthy()
    const hue = parseInt(hueMatch![1])
    expect(hue).toBeGreaterThanOrEqual(200)
    expect(hue).toBeLessThanOrEqual(280)
  })
  
  test('handles red color', () => {
    const result = hexToOKLCH('#ff0000')
    expect(result).toMatch(/^oklch\(/)
  })
  
  test('handles green color', () => {
    const result = hexToOKLCH('#00ff00')
    expect(result).toMatch(/^oklch\(/)
  })
  
  test('handles blue color', () => {
    const result = hexToOKLCH('#0000ff')
    expect(result).toMatch(/^oklch\(/)
  })
})

describe('generateThemeCSS', () => {
  test('generates CSS with primary and accent colors', () => {
    const config: BrandingConfig = {
      orgName: 'Test',
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 10,
        mode: 'system',
        scope: 'status_only',
      },
    }
    
    const css = generateThemeCSS(config)
    
    expect(css).toContain(':root')
    expect(css).toContain('--primary')
    expect(css).toContain('--accent')
    expect(css).toContain('--radius')
    expect(css).toContain('dark')
  })
  
  test('converts radius to rem', () => {
    const config: BrandingConfig = {
      orgName: 'Test',
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 16,
        mode: 'system',
        scope: 'status_only',
      },
    }
    
    const css = generateThemeCSS(config)
    expect(css).toContain('--radius: 1rem')
  })
})

describe('sanitizeBrandingConfig', () => {
  test('removes sensitive fields', () => {
    const config: BrandingConfig = {
      orgName: 'Test',
      logo: { path: '/logo.png', alt: 'Logo' },
      favicon: { path: '/favicon.ico' },
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 10,
        mode: 'system',
        scope: 'status_only',
      },
      updatedAt: '2026-02-28T00:00:00.000Z',
    }
    
    const sanitized = sanitizeBrandingConfig(config)
    
    expect(sanitized.orgName).toBe('Test')
    expect(sanitized.theme.primary).toBe('#4f46e5')
    expect(sanitized.updatedAt).toBeUndefined()
  })
})

describe('mergeBrandingConfig', () => {
  test('merges partial updates', () => {
    const existing: BrandingConfig = {
      orgName: 'Old Name',
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 10,
        mode: 'system',
        scope: 'status_only',
      },
    }
    
    const updates = { orgName: 'New Name' }
    const merged = mergeBrandingConfig(existing, updates)
    
    expect(merged.orgName).toBe('New Name')
    expect(merged.theme.primary).toBe('#4f46e5')
    expect(merged.updatedAt).toBeDefined()
  })
  
  test('deep merges theme updates', () => {
    const existing: BrandingConfig = {
      orgName: 'Test',
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 10,
        mode: 'system',
        scope: 'status_only',
      },
    }
    
    const updates = { theme: { primary: '#ff0000' } }
    const merged = mergeBrandingConfig(existing, updates)
    
    expect(merged.theme.primary).toBe('#ff0000')
    expect(merged.theme.accent).toBe('#10b981')
    expect(merged.theme.radiusPx).toBe(10)
  })
})

describe('parseBrandingConfig', () => {
  test('parses valid config', () => {
    const data = {
      orgName: 'Test',
      theme: {
        primary: '#4f46e5',
        accent: '#10b981',
        radiusPx: 10,
        mode: 'system',
        scope: 'status_only',
      },
    }
    
    const result = parseBrandingConfig(data)
    expect(result.orgName).toBe('Test')
  })
  
  test('throws on invalid config', () => {
    const data = { orgName: 123 }
    expect(() => parseBrandingConfig(data)).toThrow()
  })
})

describe('validateLogoUpload', () => {
  test('accepts valid PNG', () => {
    const file = new File(['test'], 'logo.png', { type: 'image/png' })
    const result = validateLogoUpload(file)
    expect(result.valid).toBe(true)
  })
  
  test('accepts valid SVG', () => {
    const file = new File(['test'], 'logo.svg', { type: 'image/svg+xml' })
    const result = validateLogoUpload(file)
    expect(result.valid).toBe(true)
  })
  
  test('accepts valid JPEG', () => {
    const file = new File(['test'], 'logo.jpg', { type: 'image/jpeg' })
    const result = validateLogoUpload(file)
    expect(result.valid).toBe(true)
  })
  
  test('rejects invalid file type', () => {
    const file = new File(['test'], 'logo.gif', { type: 'image/gif' })
    const result = validateLogoUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })
  
  test('rejects oversized file', () => {
    // Create a mock file with size override
    const largeFile = new File(['x'], 'logo.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: MAX_UPLOAD_SIZE + 1 })
    
    const result = validateLogoUpload(largeFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('File too large')
  })
})

describe('validateFaviconUpload', () => {
  test('accepts valid PNG', () => {
    const file = new File(['test'], 'favicon.png', { type: 'image/png' })
    const result = validateFaviconUpload(file)
    expect(result.valid).toBe(true)
  })
  
  test('accepts valid ICO', () => {
    const file = new File(['test'], 'favicon.ico', { type: 'image/x-icon' })
    const result = validateFaviconUpload(file)
    expect(result.valid).toBe(true)
  })
  
  test('accepts Microsoft ICO variant', () => {
    const file = new File(['test'], 'favicon.ico', { type: 'image/vnd.microsoft.icon' })
    const result = validateFaviconUpload(file)
    expect(result.valid).toBe(true)
  })
  
  test('rejects SVG for favicon', () => {
    const file = new File(['test'], 'favicon.svg', { type: 'image/svg+xml' })
    const result = validateFaviconUpload(file)
    expect(result.valid).toBe(false)
  })
})

describe('DEFAULT_BRANDING', () => {
  test('has all required fields', () => {
    expect(DEFAULT_BRANDING.orgName).toBeDefined()
    expect(DEFAULT_BRANDING.theme).toBeDefined()
    expect(DEFAULT_BRANDING.theme.primary).toBeDefined()
    expect(DEFAULT_BRANDING.theme.accent).toBeDefined()
    expect(DEFAULT_BRANDING.theme.radiusPx).toBeDefined()
    expect(DEFAULT_BRANDING.theme.mode).toBeDefined()
    expect(DEFAULT_BRANDING.theme.scope).toBeDefined()
  })
  
  test('default values are valid', () => {
    expect(() => BrandingSchema.parse(DEFAULT_BRANDING)).not.toThrow()
  })
})
