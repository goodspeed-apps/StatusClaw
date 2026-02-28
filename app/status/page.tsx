import type { Metadata } from 'next'
import { StatusPageContent } from './status-page-content'
import { brandingStore } from '@/lib/branding-store'
import { generateThemeCSS } from '@/lib/theme-config'
import { incidentStore } from '@/lib/incident-store'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = brandingStore.getConfig()
  
  return {
    title: `${config.orgName} - Service Status`,
    description: `Check the current status of ${config.orgName} services`,
    icons: config.favicon ? {
      icon: config.favicon.path,
    } : undefined,
  }
}

export default async function StatusPage() {
  const config = brandingStore.getConfig()
  const incidents = incidentStore.getIncidents()
  const ongoing = incidentStore.getOngoingIncidents()
  
  // Determine overall system status
  const systemStatus = ongoing.length === 0 
    ? 'operational' 
    : ongoing.some(i => i.severity === 'critical') 
      ? 'critical' 
      : ongoing.some(i => i.severity === 'high')
        ? 'degraded'
        : 'partial'
  
  // Generate theme CSS
  const themeCSS = generateThemeCSS(config)
  
  // Force dark mode class if needed
  const htmlClass = config.theme.mode === 'dark' 
    ? 'dark' 
    : config.theme.mode === 'light' 
      ? '' 
      : undefined // system default
  
  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <StatusPageContent 
          config={config}
          incidents={incidents}
          ongoing={ongoing}
          systemStatus={systemStatus}
        />
      </body>
    </html>
  )
}
