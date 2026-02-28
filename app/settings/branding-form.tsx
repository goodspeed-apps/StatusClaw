'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import type { BrandingConfig } from '@/lib/theme-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Palette, 
  Image as ImageIcon, 
  Globe, 
  CheckCircle, 
  AlertCircle,
  RotateCcw,
  ExternalLink
} from 'lucide-react'

interface BrandingSettingsFormProps {
  initialConfig: BrandingConfig
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function BrandingSettingsForm({ initialConfig }: BrandingSettingsFormProps) {
  const [config, setConfig] = useState<BrandingConfig>(initialConfig)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialConfig.logo?.path || null)
  
  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    setErrorMessage('')
    
    try {
      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)
        formData.append('alt', config.orgName)
        
        const logoRes = await fetch('/api/uploads/logo', {
          method: 'POST',
          headers: {
            'x-user-email': 'admin@example.com',
          },
          body: formData,
        })
        
        if (!logoRes.ok) {
          throw new Error('Failed to upload logo')
        }
        
        const logoData = await logoRes.json()
        setConfig(prev => ({ ...prev, logo: { path: logoData.path, alt: config.orgName } }))
        setLogoPreview(logoData.path)
      }
      
      // Upload favicon if changed
      if (faviconFile) {
        const formData = new FormData()
        formData.append('file', faviconFile)
        
        const faviconRes = await fetch('/api/uploads/favicon', {
          method: 'POST',
          headers: {
            'x-user-email': 'admin@example.com',
          },
          body: formData,
        })
        
        if (!faviconRes.ok) {
          throw new Error('Failed to upload favicon')
        }
        
        const faviconData = await faviconRes.json()
        setConfig(prev => ({ ...prev, favicon: { path: faviconData.path } }))
      }
      
      // Save branding config
      const res = await fetch('/api/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'admin@example.com',
        },
        body: JSON.stringify(config),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save branding')
      }
      
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred')
    }
  }, [config, logoFile, faviconFile])
  
  const handleReset = useCallback(async () => {
    if (!confirm('Are you sure you want to reset all branding to defaults?')) {
      return
    }
    
    setSaveStatus('saving')
    
    try {
      const res = await fetch('/api/branding', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'admin@example.com',
        },
      })
      
      if (!res.ok) {
        throw new Error('Failed to reset branding')
      }
      
      const data = await res.json()
      setConfig(data.branding)
      setLogoPreview(null)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Reset failed:', error)
      setSaveStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred')
    }
  }, [])
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }
  
  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFaviconFile(file)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {saveStatus === 'success' && (
        <Alert className="bg-green-500/15 border-green-500/30">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-600">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}
      
      {saveStatus === 'error' && (
        <Alert className="bg-red-500/15 border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-600">
            {errorMessage || 'Failed to save settings. Please try again.'}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Preview Link */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
        <div>
          <h3 className="font-medium">Public Status Page</h3>
          <p className="text-sm text-muted-foreground">
            See how your status page looks to visitors
          </p>
        </div>
        <a href="/status" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Preview
          </Button>
        </a>
      </div>
      
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="branding" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="w-4 h-4" />
            Theme
          </TabsTrigger>
        </TabsList>
        
        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Configure your organization name and logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={config.orgName}
                  onChange={(e) => setConfig(prev => ({ ...prev, orgName: e.target.value }))}
                  placeholder="Your Organization"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative w-16 h-16 rounded-lg border border-border overflow-hidden">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-2xl">
                        {config.orgName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, SVG, or JPEG. Max 1MB.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Favicon</Label>
                <Input
                  type="file"
                  accept="image/png,image/x-icon"
                  onChange={handleFaviconChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  PNG or ICO format. Max 1MB.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Colors & Appearance
              </CardTitle>
              <CardDescription>
                Customize the colors and appearance of your status page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primary">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primary"
                    value={config.theme.primary}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      theme: { ...prev.theme, primary: e.target.value }
                    }))}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <Input
                    value={config.theme.primary}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      theme: { ...prev.theme, primary: e.target.value }
                    }))}
                    className="font-mono uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accent">Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="accent"
                    value={config.theme.accent}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      theme: { ...prev.theme, accent: e.target.value }
                    }))}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <Input
                    value={config.theme.accent}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      theme: { ...prev.theme, accent: e.target.value }
                    }))}
                    className="font-mono uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="radius">
                  Border Radius: {config.theme.radiusPx}px
                </Label>
                <input
                  type="range"
                  id="radius"
                  min={0}
                  max={32}
                  value={config.theme.radiusPx}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    theme: { ...prev.theme, radiusPx: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Display Mode
              </CardTitle>
              <CardDescription>
                Control how your status page appears to visitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Color Mode</Label>
                <Select
                  value={config.theme.mode}
                  onValueChange={(value: 'system' | 'light' | 'dark') => 
                    setConfig(prev => ({
                      ...prev,
                      theme: { ...prev.theme, mode: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System Default</SelectItem>
                    <SelectItem value="light">Light Mode</SelectItem>
                    <SelectItem value="dark">Dark Mode</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose whether to follow the user&apos;s system preference or force a specific mode
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Apply to Dashboard</Label>
                  <p className="text-xs text-muted-foreground">
                    Also apply these theme settings to the admin dashboard
                  </p>
                </div>
                <Switch
                  checked={config.theme.scope === 'global'}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    theme: { 
                      ...prev.theme, 
                      scope: checked ? 'global' : 'status_only' 
                    }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saveStatus === 'saving'}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="gap-2"
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
