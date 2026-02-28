/**
 * Theme Configuration Types and Validators
 * Issue #41 - Status Page Theming + Branding Settings
 */

import { z } from 'zod'

// Theme mode options
export type ThemeMode = 'system' | 'light' | 'dark'
export type ThemeScope = 'status_only' | 'global'

// Branding configuration schema
export const BrandingSchema = z.object({
  orgName: z.string().min(1).max(100).default('StatusClaw'),
  logo: z.object({
    path: z.string(),
    alt: z.string().default('Logo'),
  }).optional(),
  favicon: z.object({
    path: z.string(),
  }).optional(),
  theme: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#4f46e5'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#10b981'),
    radiusPx: z.number().min(0).max(32).default(10),
    mode: z.enum(['system', 'light', 'dark']).default('system'),
    scope: z.enum(['status_only', 'global']).default('status_only'),
  }).default({}),
  updatedAt: z.string().datetime().optional(),
})

export type BrandingConfig = z.infer<typeof BrandingSchema>

// Default branding configuration
export const DEFAULT_BRANDING: BrandingConfig = {
  orgName: 'StatusClaw',
  theme: {
    primary: '#4f46e5',
    accent: '#10b981',
    radiusPx: 10,
    mode: 'system',
    scope: 'status_only',
  },
}

// CSS variable mapping for theme tokens
export interface ThemeCSSVariables {
  '--primary': string
  '--accent': string
  '--radius': string
}

// Convert hex to oklch for CSS variables (simplified conversion)
export function hexToOKLCH(hex: string): string {
  // Remove # prefix
  const cleanHex = hex.replace('#', '')
  
  // Parse RGB
  const r = parseInt(cleanHex.substr(0, 2), 16) / 255
  const g = parseInt(cleanHex.substr(2, 2), 16) / 255
  const b = parseInt(cleanHex.substr(4, 2), 16) / 255
  
  // For MVP, we'll use a simplified approach - just return the hex in oklch format
  // In production, you'd want proper RGB to OKLCH conversion
  // This is a placeholder that returns a reasonable oklch approximation
  
  // Simple approximation: map to a default oklch with hue based on color
  // This is not accurate but provides visual feedback for MVP
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  
  // Calculate hue (simplified)
  let hue = 0
  if (max !== min) {
    const d = max - min
    if (max === r) {
      hue = ((g - b) / d + (g < b ? 6 : 0)) / 6
    } else if (max === g) {
      hue = ((b - r) / d + 2) / 6
    } else {
      hue = ((r - g) / d + 4) / 6
    }
  }
  hue = Math.round(hue * 360)
  
  // Calculate chroma (simplified)
  const chroma = Math.round((max - min) * 0.3 * 100) / 100
  
  return `oklch(${Math.round(l * 100) / 100} ${chroma} ${hue})`
}

// Generate CSS variables from branding config
export function generateThemeCSS(config: BrandingConfig): string {
  const primaryOKLCH = hexToOKLCH(config.theme.primary)
  const accentOKLCH = hexToOKLCH(config.theme.accent)
  const radius = `${config.theme.radiusPx / 16}rem` // Convert px to rem
  
  return `
    :root {
      --primary: ${primaryOKLCH};
      --accent: ${accentOKLCH};
      --radius: ${radius};
    }
    
    .dark {
      --primary: ${primaryOKLCH};
      --accent: ${accentOKLCH};
      --radius: ${radius};
    }
  `.trim()
}

// Sanitize branding config for public API (remove internal-only fields)
export function sanitizeBrandingConfig(config: BrandingConfig): BrandingConfig {
  return {
    orgName: config.orgName,
    logo: config.logo,
    favicon: config.favicon,
    theme: {
      primary: config.theme.primary,
      accent: config.theme.accent,
      radiusPx: config.theme.radiusPx,
      mode: config.theme.mode,
      scope: config.theme.scope,
    },
    // Don't expose updatedAt to public
  }
}

// Validate and parse branding config from unknown data
export function parseBrandingConfig(data: unknown): BrandingConfig {
  return BrandingSchema.parse(data)
}

// Merge partial updates with existing config
export function mergeBrandingConfig(
  existing: BrandingConfig,
  updates: Partial<BrandingConfig>
): BrandingConfig {
  return {
    ...existing,
    ...updates,
    theme: {
      ...existing.theme,
      ...updates.theme,
    },
    updatedAt: new Date().toISOString(),
  }
}

// File upload validation
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg']
export const ALLOWED_FAVICON_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']
export const MAX_UPLOAD_SIZE = 1024 * 1024 // 1MB

export interface UploadValidationResult {
  valid: boolean
  error?: string
}

export function validateLogoUpload(file: File): UploadValidationResult {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_LOGO_TYPES.join(', ')}`,
    }
  }
  
  if (file.size > MAX_UPLOAD_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_UPLOAD_SIZE / 1024}KB`,
    }
  }
  
  return { valid: true }
}

export function validateFaviconUpload(file: File): UploadValidationResult {
  if (!ALLOWED_FAVICON_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_FAVICON_TYPES.join(', ')}`,
    }
  }
  
  if (file.size > MAX_UPLOAD_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_UPLOAD_SIZE / 1024}KB`,
    }
  }
  
  return { valid: true }
}
