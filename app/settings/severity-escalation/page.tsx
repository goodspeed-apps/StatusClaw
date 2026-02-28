import type { Metadata } from 'next'
import { SeveritySettingsForm } from '@/components/settings/severity-settings-form'
import { EscalationSettingsForm } from '@/components/settings/escalation-settings-form'
import { severityLevelStore } from '@/lib/severity-level-store'
import { escalationRuleStore } from '@/lib/escalation-rule-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Severity & Escalation - StatusClaw',
  description: 'Configure incident severity levels and escalation rules',
}

export default function SeverityEscalationSettingsPage() {
  const severityLevels = severityLevelStore.getAll()
  const escalationRules = escalationRuleStore.getAll()

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
              Severity & Escalation Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure severity levels and auto-escalation rules
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
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="severity" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="severity">Severity Levels</TabsTrigger>
              <TabsTrigger value="escalation">Escalation Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="severity" className="mt-6">
              <SeveritySettingsForm initialLevels={severityLevels} />
            </TabsContent>
            <TabsContent value="escalation" className="mt-6">
              <EscalationSettingsForm 
                initialRules={escalationRules} 
                severityLevels={severityLevels}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
