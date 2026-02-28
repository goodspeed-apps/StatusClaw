/**
 * Branding Store Tests
 * Issue #41 - Status Page Theming + Branding Settings
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { BrandingStoreManager } from '../lib/branding-store'
import { DEFAULT_BRANDING } from '../lib/theme-config'

describe('BrandingStoreManager', () => {
  let store: BrandingStoreManager

  beforeEach(() => {
    store = new BrandingStoreManager()
    store.init()
  })

  test('initializes with default config', () => {
    const config = store.getConfig()
    expect(config.orgName).toBe(DEFAULT_BRANDING.orgName)
    expect(config.theme.primary).toBe(DEFAULT_BRANDING.theme.primary)
  })

  test('updates config', () => {
    const updated = store.updateConfig({ orgName: 'New Org' })
    expect(updated.orgName).toBe('New Org')
    expect(updated.theme.primary).toBe(DEFAULT_BRANDING.theme.primary)
  })

  test('deep merges theme updates', () => {
    store.updateConfig({ theme: { primary: '#ff0000' } })
    const config = store.getConfig()
    
    expect(config.theme.primary).toBe('#ff0000')
    expect(config.theme.accent).toBe(DEFAULT_BRANDING.theme.accent)
  })

  test('persists updatedAt timestamp', () => {
    const before = new Date().toISOString()
    store.updateConfig({ orgName: 'Test' })
    const after = new Date().toISOString()
    
    const config = store.getConfig()
    expect(config.updatedAt).toBeDefined()
    if (config.updatedAt) {
      expect(config.updatedAt >= before).toBe(true)
      expect(config.updatedAt <= after).toBe(true)
    }
  })

  test('resetToDefaults restores defaults', () => {
    store.updateConfig({ orgName: 'Custom Name' })
    const reset = store.resetToDefaults()
    
    expect(reset.orgName).toBe(DEFAULT_BRANDING.orgName)
    expect(reset.theme.primary).toBe(DEFAULT_BRANDING.theme.primary)
  })

  test('getUploadsDir returns path', () => {
    const dir = store.getUploadsDir()
    expect(dir).toContain('uploads')
  })

  test('getUploadPublicPath formats correctly', () => {
    const path = store.getUploadPublicPath('logo.png')
    expect(path).toBe('/uploads/logo.png')
  })

  test('returns new object on each getConfig call', () => {
    const config1 = store.getConfig()
    const config2 = store.getConfig()
    
    expect(config1).toEqual(config2)
    expect(config1).not.toBe(config2)
  })
})
