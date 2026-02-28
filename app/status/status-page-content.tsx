'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { BrandingConfig } from '@/lib/theme-config'
import type { Incident } from '@/lib/mock-data'
import { CheckCircle, AlertCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface StatusPageContentProps {
  config: BrandingConfig
  incidents: Incident[]
  ongoing: Incident[]
  systemStatus: 'operational' | 'degraded' | 'partial' | 'critical'
}

const statusConfig = {
  operational: {
    label: 'All Systems Operational',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/15',
    borderColor: 'border-green-500/30',
  },
  degraded: {
    label: 'Service Degraded',
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/15',
    borderColor: 'border-yellow-500/30',
  },
  partial: {
    label: 'Partial Outage',
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/15',
    borderColor: 'border-orange-500/30',
  },
  critical: {
    label: 'Critical Outage',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
  },
}

const severityConfig = {
  critical: { label: 'Critical', color: 'text-red-500 bg-red-500/15' },
  high: { label: 'High', color: 'text-orange-500 bg-orange-500/15' },
  medium: { label: 'Medium', color: 'text-yellow-500 bg-yellow-500/15' },
  low: { label: 'Low', color: 'text-blue-500 bg-blue-500/15' },
}

const incidentStatusConfig = {
  investigating: { label: 'Investigating', color: 'text-yellow-500' },
  identified: { label: 'Identified', color: 'text-orange-500' },
  monitoring: { label: 'Monitoring', color: 'text-blue-500' },
  resolved: { label: 'Resolved', color: 'text-green-500' },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function IncidentCard({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false)
  const status = incidentStatusConfig[incident.status]
  const severity = severityConfig[incident.severity]
  
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`px-2 py-1 rounded text-xs font-medium ${severity.color}`}>
            {severity.label}
          </div>
          <div>
            <h3 className="font-medium">{incident.title}</h3>
            <p className="text-sm text-muted-foreground">{incident.service}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-border bg-muted/30">
          <p className="mt-3 text-sm">{incident.description}</p>
          
          <div className="mt-4 space-y-3">
            {incident.updates.length > 0 ? (
              incident.updates
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((update) => (
                  <div key={update.id} className="flex gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {incidentStatusConfig[update.status].label}
                      </p>
                      <p className="text-muted-foreground">{update.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(update.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground italic">No updates yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function StatusPageContent({
  config,
  incidents,
  ongoing,
  systemStatus,
}: StatusPageContentProps) {
  const status = statusConfig[systemStatus]
  const StatusIcon = status.icon
  
  const recentIncidents = incidents
    .filter(i => i.status === 'resolved')
    .slice(0, 5)
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {config.logo ? (
              <Image
                src={config.logo.path}
                alt={config.logo.alt}
                width={40}
                height={40}
                className="rounded"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  {config.orgName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold">{config.orgName}</h1>
              <p className="text-sm text-muted-foreground">Service Status</p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* System Status Banner */}
        <div className={`rounded-xl p-6 ${status.bgColor} border ${status.borderColor} mb-8`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-8 h-8 ${status.color}`} />
            <div>
              <h2 className={`text-2xl font-semibold ${status.color}`}>{status.label}</h2>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
        
        {/* Ongoing Incidents */}
        {ongoing.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Ongoing Incidents</h2>
            <div className="space-y-3">
              {ongoing.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </section>
        )}
        
        {/* Recent Resolved Incidents */}
        {recentIncidents.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Recent Incidents</h2>
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </section>
        )}
        
        {/* Empty State */}
        {ongoing.length === 0 && recentIncidents.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold">No incidents reported</h2>
            <p className="text-muted-foreground">All systems are running smoothly</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Powered by StatusClaw</p>
            <p>
              <a href="/" className="hover:text-foreground transition-colors">
                Admin Dashboard
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
