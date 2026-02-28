/**
 * Branding Store - File-backed persistence for branding/theming settings
 * Issue #41 - Status Page Theming + Branding Settings
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { BrandingConfig } from './theme-config'
import { DEFAULT_BRANDING, parseBrandingConfig, mergeBrandingConfig } from './theme-config'

const BRANDING_FILE = join(process.cwd(), 'data', 'branding.json')
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')

// Ensure directories exist
function ensureDirectories() {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true })
    mkdirSync(UPLOADS_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create directories:', error)
  }
}

// Load branding from file
function loadBrandingFromFile(): BrandingConfig {
  try {
    if (existsSync(BRANDING_FILE)) {
      const data = readFileSync(BRANDING_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      return parseBrandingConfig(parsed)
    }
  } catch (error) {
    console.error('Failed to load branding from file:', error)
  }
  return DEFAULT_BRANDING
}

// Save branding to file
function saveBrandingToFile(config: BrandingConfig) {
  try {
    ensureDirectories()
    const configWithTimestamp = {
      ...config,
      updatedAt: new Date().toISOString(),
    }
    writeFileSync(BRANDING_FILE, JSON.stringify(configWithTimestamp, null, 2))
  } catch (error) {
    console.error('Failed to save branding to file:', error)
    throw error
  }
}

// Branding store manager class
export class BrandingStoreManager {
  private config: BrandingConfig
  private initialized: boolean

  constructor() {
    this.config = DEFAULT_BRANDING
    this.initialized = false
  }

  // Initialize/load from file
  init(): void {
    if (!this.initialized) {
      ensureDirectories()
      this.config = loadBrandingFromFile()
      this.initialized = true
    }
  }

  // Get current branding config
  getConfig(): BrandingConfig {
    this.init()
    return { ...this.config }
  }

  // Update branding config
  updateConfig(updates: Partial<BrandingConfig>): BrandingConfig {
    this.init()
    this.config = mergeBrandingConfig(this.config, updates)
    saveBrandingToFile(this.config)
    return { ...this.config }
  }

  // Reset to defaults
  resetToDefaults(): BrandingConfig {
    this.config = { ...DEFAULT_BRANDING }
    saveBrandingToFile(this.config)
    return { ...this.config }
  }

  // Get uploads directory path
  getUploadsDir(): string {
    return UPLOADS_DIR
  }

  // Get public URL path for upload
  getUploadPublicPath(filename: string): string {
    return `/uploads/${filename}`
  }
}

// Export singleton instance
export const brandingStore = new BrandingStoreManager()

// Export for API routes
export function getBrandingStore() {
  return brandingStore
}
