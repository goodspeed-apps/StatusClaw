"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Globe, Users, Code, Webhook } from "lucide-react"

interface Feature {
  icon: React.ReactNode
  title: string
  oneLiner: string
  detailLine?: string
}

const features: Feature[] = [
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Custom domains",
    oneLiner: "Host your status page on status.yourcompany.com.",
    detailLine: "Bring your brand. Keep the trust.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Team collaboration",
    oneLiner: "Invite your team to publish updates fast.",
    detailLine: "Clear roles, fewer 'who's posting?' moments.",
  },
  {
    icon: <Code className="h-6 w-6" />,
    title: "API access",
    oneLiner: "Automate incidents and updates from your stack.",
    detailLine: "Integrate with CI/CD, monitors, and internal tools.",
  },
  {
    icon: <Webhook className="h-6 w-6" />,
    title: "Webhook integrations",
    oneLiner: "Trigger workflows when incidents change.",
    detailLine: "Send alerts to Slack, PagerDuty, or anything else.",
  },
]

export function FeaturesSection() {
  return (
    <section 
      className="py-16 md:py-24 border-b"
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 
              id="features-heading"
              className="text-balance text-3xl font-bold tracking-tight md:text-4xl"
            >
              Everything you need to run a serious status page.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Custom domains, team workflows, and integrations—without duct tape.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div 
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2"
            role="list"
            aria-label="StatusClaw features"
          >
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="group hover:shadow-md transition-shadow border-l-4 border-l-primary"
                role="listitem"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      {feature.icon}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground">
                    {feature.oneLiner}
                  </p>
                  {feature.detailLine && (
                    <p className="text-sm text-muted-foreground/80">
                      {feature.detailLine}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trust Signal */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Built for engineers: fast, API-first, no nonsense.
          </p>
        </div>
      </div>
    </section>
  )
}
