'use client'

import { useState, useCallback } from 'react'
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
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  GripVertical,
  Trash2,
  Plus,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SeverityLevel } from '@/lib/severity-level-store'

const ICON_OPTIONS = [
  { value: 'alert-octagon', label: 'Critical', icon: AlertOctagon },
  { value: 'alert-triangle', label: 'Warning', icon: AlertTriangle },
  { value: 'alert-circle', label: 'Alert', icon: AlertCircle },
  { value: 'info', label: 'Info', icon: Info },
]

interface SeveritySettingsFormProps {
  initialLevels: SeverityLevel[]
}

export function SeveritySettingsForm({ initialLevels }: SeveritySettingsFormProps) {
  const [levels, setLevels] = useState<SeverityLevel[]>(initialLevels)
  const [isLoading, setIsLoading] = useState(false)
  const [editingLevel, setEditingLevel] = useState<SeverityLevel | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<SeverityLevel>>({
    name: '',
    slug: '',
    color: '#3b82f6',
    icon: 'alert-circle',
    pagesOnCall: false,
    isDefault: false,
    description: '',
  })

  const refreshLevels = useCallback(async () => {
    try {
      const response = await fetch('/api/severity-levels')
      if (response.ok) {
        const data = await response.json()
        setLevels(data.levels)
      }
    } catch (error) {
      console.error('Failed to refresh severity levels:', error)
    }
  }, [])

  const handleCreate = async () => {
    if (!formData.name || !formData.slug || !formData.color) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/severity-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Severity level created')
        setIsDialogOpen(false)
        resetForm()
        await refreshLevels()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create severity level')
      }
    } catch (error) {
      toast.error('Failed to create severity level')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingLevel) return
    if (!formData.name || !formData.slug || !formData.color) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/severity-levels/${editingLevel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Severity level updated')
        setIsDialogOpen(false)
        setEditingLevel(null)
        resetForm()
        await refreshLevels()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update severity level')
      }
    } catch (error) {
      toast.error('Failed to update severity level')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this severity level?')) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/severity-levels/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Severity level deleted')
        await refreshLevels()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete severity level')
      }
    } catch (error) {
      toast.error('Failed to delete severity level')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      color: '#3b82f6',
      icon: 'alert-circle',
      pagesOnCall: false,
      isDefault: false,
      description: '',
    })
  }

  const openEditDialog = (level: SeverityLevel) => {
    setEditingLevel(level)
    setFormData({
      name: level.name,
      slug: level.slug,
      color: level.color,
      icon: level.icon,
      pagesOnCall: level.pagesOnCall,
      isDefault: level.isDefault,
      description: level.description,
    })
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingLevel(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(i => i.value === iconName)
    return iconOption?.icon || AlertCircle
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Severity Levels</CardTitle>
            <CardDescription>
              Configure incident severity levels with colors, icons, and escalation settings
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Level
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? 'Edit Severity Level' : 'Create Severity Level'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        name,
                        slug: editingLevel ? prev.slug : name.toLowerCase().replace(/\s+/g, '-'),
                      }))
                    }}
                    placeholder="Critical"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="critical"
                    disabled={!!editingLevel}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-20"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <select
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    {ICON_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this severity level"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pagesOnCall">Pages On-Call</Label>
                    <p className="text-xs text-muted-foreground">
                      This severity pages the on-call team
                    </p>
                  </div>
                  <Switch
                    id="pagesOnCall"
                    checked={formData.pagesOnCall}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pagesOnCall: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isDefault">Default</Label>
                    <p className="text-xs text-muted-foreground">
                      Use as default for new incidents
                    </p>
                  </div>
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={editingLevel ? handleUpdate : handleCreate}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : editingLevel ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {levels.sort((a, b) => a.order - b.order).map((level, index) => {
              const Icon = getIconComponent(level.icon)
              return (
                <div
                  key={level.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${level.color}20`, color: level.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{level.name}</span>
                      {level.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {level.pagesOnCall && (
                        <Badge variant="destructive" className="text-xs">
                          Pages
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {level.description || `${level.slug} • ${level.color}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(level)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(level.id)}
                      disabled={level.isDefault}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {levels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No severity levels configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
