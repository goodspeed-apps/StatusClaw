# StatusClaw - OpenClaw Agent Dashboard

A password-protected dashboard to monitor OpenClaw agents, LLM model usage, and task progress.

## Features

- **Agents Tab**: View agent status (active/idle/offline), LLM spend, tasks, files, and cron jobs
- **Models Tab**: Track LLM model usage and spending across providers
- **Tasks Tab**: Kanban board with drag-drop for task management
- **Password Protection**: HTTP Basic Auth for security

## Deployment

### Environment Variables

Set these in Vercel dashboard:

```bash
AUTH_USER=admin              # Username for dashboard login
AUTH_PASS=yourpassword       # Password for dashboard login
```

### DNS (GoDaddy)

Add this CNAME record:

```
Type: CNAME
Name: statusclaw
Value: cname.vercel-dns.com
TTL: 600
```

## Development

```bash
npm install
npm run dev
```

## Data Sources

The dashboard fetches data from:
- `/api/agents` - Agent status and metadata
- `/api/models` - LLM model usage
- `/api/tasks` - Task queue from `tasks/QUEUE.md`
- `/api/spend` - Spending history and totals

Data is currently aggregated from OpenClaw telemetry and workspace files.
