import type { Metadata } from 'next'
import { BrandingSettingsForm } from '../branding-form'
import { brandingStore } from '@/lib/branding-store'

export const metadata: Metadata = {
  title: 'Branding Settings - StatusClaw',
  description: 'Customize your status page branding and theme',
}

export default function BrandingSettingsPage() {
  const config = brandingStore.getConfig()
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-[0_0_15px_var(--glow-primary)]">
            <span className="text-xl font-bold text-primary">S</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Branding Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Customize your status page appearance
            </p>
          </div>
        </div>
        <a 
          href="/settings" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Settings
        </a>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <BrandingSettingsForm initialConfig={config} />
        </div>
      </main>
    </div>
  )
}
