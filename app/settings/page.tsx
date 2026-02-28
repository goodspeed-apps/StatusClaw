import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, AlertTriangle, Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Settings - StatusClaw',
  description: 'Configure your status page settings',
}

const settingsSections = [
  {
    id: 'branding',
    title: 'Branding',
    description: 'Customize your status page appearance, logo, colors, and theme',
    icon: Palette,
    href: '/settings/branding',
  },
  {
    id: 'severity-escalation',
    title: 'Severity & Escalation',
    description: 'Configure incident severity levels and auto-escalation rules',
    icon: AlertTriangle,
    href: '/settings/severity-escalation',
  },
]

export default function SettingsIndexPage() {
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
              Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage your status page configuration
            </p>
          </div>
        </div>
        <a 
          href="/" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Dashboard
        </a>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="grid gap-4">
            {settingsSections.map((section) => (
              <Link key={section.id} href={section.href}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{section.title}</h3>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
