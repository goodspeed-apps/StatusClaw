'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  Trash2,
  Plus,
  Bell,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { EscalationRule, EscalationAction } from '@/lib/escalation-rule-store'
import type { SeverityLevel } from '@/lib/severity-level-store'
import type { IncidentStatus } from '@/lib/mock-data'

const INCIDENT_STATUSES: { value: IncidentStatus; label: string }[] = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified', label: 'Identified' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'resolved', label: 'Resolved' },
]

const ACTION_TYPES = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'notification', label: 'Notification' },
  { value: 'email', label: 'Email' },
]

interface EscalationSettingsFormProps {
  initialRules: EscalationRule[]
  severityLevels: SeverityLevel[]
}

export function EscalationSettingsForm({ initialRules, severityLevels }: EscalationSettingsFormProps) {
  const [rules, setRules] = useState<EscalationRule[]>(initialRules)
  const [isLoading, setIsLoading] = useState(false)
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState<Partial<EscalationRule>>({
    name: '',
    description: '',
    enabled: true,
    severityIds: [],
    statusIn: ['investigating', 'identified', 'monitoring'],
    trigger: {
      kind: 'time_since_started',
      minutes: 15,
    },
    actions: [],
  })

  const refreshRules = useCallback(async () => {
    try {
      const response = await fetch('/api/escalation-rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Failed to refresh escalation rules:', error)
    }
  }, [])

  const handleCreate = async () => {
    if (!formData.name || !formData.trigger) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/escalation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Escalation rule created')
        setIsDialogOpen(false)
        resetForm()
        await refreshRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create escalation rule')
      }
    } catch (error) {
      toast.error('Failed to create escalation rule')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingRule) return
    if (!formData.name || !formData.trigger) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/escalation-rules/${editingRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Escalation rule updated')
        setIsDialogOpen(false)
        setEditingRule(null)
        resetForm()
        await refreshRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update escalation rule')
      }
    } catch (error) {
      toast.error('Failed to update escalation rule')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this escalation rule?')) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/escalation-rules/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Escalation rule deleted')
        await refreshRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete escalation rule')
      }
    } catch (error) {
      toast.error('Failed to delete escalation rule')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (rule: EscalationRule) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/escalation-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })

      if (response.ok) {
        toast.success(rule.enabled ? 'Rule disabled' : 'Rule enabled')
        await refreshRules()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to toggle rule')
      }
    } catch (error) {
      toast.error('Failed to toggle rule')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessEscalations = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/escalations/process', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.triggered > 0) {
          toast.success(`Processed ${data.processed} rules, ${data.triggered} escalations triggered`)
        } else {
          toast.info(`Processed ${data.processed} rules, no escalations triggered`)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to process escalations')
      }
    } catch (error) {
      toast.error('Failed to process escalations')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      enabled: true,
      severityIds: [],
      statusIn: ['investigating', 'identified', 'monitoring'],
      trigger: {
        kind: 'time_since_started',
        minutes: 15,
      },
      actions: [],
    })
  }

  const openEditDialog = (rule: EscalationRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      severityIds: rule.severityIds,
      statusIn: rule.statusIn,
      trigger: rule.trigger,
      actions: rule.actions,
    })
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingRule(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const addAction = () => {
    const newAction: EscalationAction = {
      type: 'webhook',
      destinationIds: [],
      messageTemplate: '🚨 ESCALATION: Incident "{{incident.title}}" has been unresolved for {{elapsedMinutes}} minutes',
    }
    setFormData(prev => ({
      ...prev,
      actions: [...(prev.actions || []), newAction],
    }))
  }

  const updateAction = (index: number, updates: Partial<EscalationAction>) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.map((action, i) => i === index ? { ...action, ...updates } : action) || [],
    }))
  }

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index) || [],
    }))
  }

  const formatTrigger = (rule: EscalationRule) => {
    if (rule.trigger.kind === 'time_since_started') {
      return `After ${rule.trigger.minutes}min since start`
    }
    return `After ${rule.trigger.minutes}min in status`
  }

  const formatSeverityLabel = (severityId: string) => {
    const level = severityLevels.find(l => l.id === severityId)
    return level?.name || severityId
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Escalation Rules</CardTitle>
            <CardDescription>
              Configure time-based auto-escalation rules for incidents
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleProcessEscalations}
              disabled={isProcessing}
            >
              <Play className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Run Now'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Rule Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Critical incident unresolved > 15min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of when this rule triggers"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enabled">Enabled</Label>
                      <p className="text-xs text-muted-foreground">
                        Rule is active and will trigger
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={formData.enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger Conditions</Label>
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-xs">Trigger Type</Label>
                        <Select
                          value={formData.trigger?.kind}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            trigger: { kind: value as 'time_since_started' | 'time_in_status', minutes: prev.trigger?.minutes ?? 15 },
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time_since_started">Time since incident started</SelectItem>
                            <SelectItem value="time_in_status">Time in current status</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Minutes</Label>
                        <Input
                          type="number"
                          min={1}
                          value={formData.trigger?.minutes}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            trigger: { kind: prev.trigger?.kind ?? 'time_since_started', minutes: parseInt(e.target.value) || 0 },
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Applies to Severity Levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {severityLevels.map(level => (
                        <Badge
                          key={level.id}
                          variant={formData.severityIds?.includes(level.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const ids = formData.severityIds || []
                            if (ids.includes(level.id)) {
                              setFormData(prev => ({ ...prev, severityIds: ids.filter(id => id !== level.id) }))
                            } else {
                              setFormData(prev => ({ ...prev, severityIds: [...ids, level.id] }))
                            }
                          }}
                          style={formData.severityIds?.includes(level.id) ? { backgroundColor: level.color } : {}}
                        >
                          {level.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select none to apply to all severities
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Applies to Statuses</Label>
                    <div className="flex flex-wrap gap-2">
                      {INCIDENT_STATUSES.map(status => (
                        <Badge
                          key={status.value}
                          variant={formData.statusIn?.includes(status.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const statuses = formData.statusIn || []
                            if (statuses.includes(status.value)) {
                              setFormData(prev => ({ ...prev, statusIn: statuses.filter(s => s !== status.value) }))
                            } else {
                              setFormData(prev => ({ ...prev, statusIn: [...statuses, status.value] }))
                            }
                          }}
                        >
                          {status.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Actions</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addAction}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Action
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.actions?.map((action, index) => (
                        <div key={index} className="p-3 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Select
                              value={action.type}
                              onValueChange={(value) => updateAction(index, { type: value as 'webhook' | 'notification' | 'email' })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAction(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Message Template</Label>
                            <Textarea
                              value={action.messageTemplate || ''}
                              onChange={(e) => updateAction(index, { messageTemplate: e.target.value })}
                              placeholder="{{incident.title}} - {{elapsedMinutes}}min"
                              rows={2}
                            />
                            <p className="text-xs text-muted-foreground">
                              Available: {'{{incident.title}}'}, {'{{incident.id}}'}, {'{{elapsedMinutes}}'}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!formData.actions || formData.actions.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No actions configured. Click "Add Action" to add one.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={editingRule ? handleUpdate : handleCreate}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : editingRule ? 'Update' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  {rule.enabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Pause className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    {!rule.enabled && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTrigger(rule)}</span>
                    <span>•</span>
                    <span>
                      {rule.severityIds.length === 0
                        ? 'All severities'
                        : rule.severityIds.map(formatSeverityLabel).join(', ')}
                    </span>
                    <span>•</span>
                    <span>{rule.actions.length} action(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(rule)}
                    disabled={isLoading}
                  >
                    {rule.enabled ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No escalation rules configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
