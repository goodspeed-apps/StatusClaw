# StatusClaw Data Backup and Recovery

## Overview

StatusClaw uses **file-based JSON storage** for persistence:
- `data/incidents.json` - Incident reports and status updates
- `data/branding.json` - Brand configuration (logo, favicon, etc.)

These files are the application's "database" and must be backed up regularly.

---

## Backup Strategy

### 1. Git-Based Backup (Primary)

The data files are stored in git and committed automatically via GitHub Actions.

**Schedule:** Every 4 hours
**Location:** Git repository (main branch)
**Retention:** Infinite (git history)

### 2. External Backup (Secondary)

An additional backup is created to a secure external storage location (S3/R2 compatible).

**Schedule:** Daily at 06:00 UTC
**Retention:** 30 days

---

## Automated Backup Process

### GitHub Actions Workflow

The workflow `.github/workflows/backup-data.yml` handles automated backups:

1. **Periodic Data Sync** (every 4 hours)
   - Checks if data files have uncommitted changes
   - Commits and pushes changes with timestamp
   - Tags the commit for easy recovery

2. **Daily Archive** (daily at 06:00 UTC)
   - Creates a gzipped archive of the data directory
   - Uploads to configured S3/R2 bucket
   - Cleans up backups older than 30 days

### Manual Backup

```bash
# Run the backup script manually
./scripts/backup.sh

# Or create a manual git commit
git add data/
git commit -m "backup: manual data snapshot $(date -u +%Y-%m-%d-%H%M%S)"
git push origin main
```

---

## Recovery Procedures

### Scenario 1: Restore from Git (Recommended)

**Use when:** Data was accidentally deleted or corrupted

```bash
# Find the last known good commit
git log --oneline -- data/

# Checkout specific files from a previous commit
git checkout <commit-hash> -- data/incidents.json data/branding.json

# Or restore to a specific tagged backup
git checkout backup-2026-02-28-061500 -- data/

# Commit the restoration
git add data/
git commit -m "recovery: restored data from backup-2026-02-28-061500"
git push origin main
```

### Scenario 2: Restore from External Archive

**Use when:** Git repository is corrupted or unavailable

```bash
# Download the backup from S3/R2
aws s3 cp s3://statusclaw-backups/statusclaw-data-2026-02-28.tar.gz ./
# OR for R2
rclone copy r2:statusclaw-backups/statusclaw-data-2026-02-28.tar.gz ./

# Extract the archive
tar -xzf statusclaw-data-2026-02-28.tar.gz

# Verify the files
ls -la data/
cat data/incidents.json | jq '.incidents | length'

# Commit to git
git add data/
git commit -m "recovery: restored from external backup 2026-02-28"
git push origin main
```

### Scenario 3: Complete Data Loss Recovery

**Use when:** All data files are lost

1. **Clone the repository fresh**
   ```bash
   git clone https://github.com/goodspeed-apps/StatusClaw.git
   cd StatusClaw
   ```

2. **Restore from the latest backup tag**
   ```bash
   # List available backup tags
   git tag -l "backup-*" | sort -r | head -10

   # Checkout data from the latest backup
   LATEST_BACKUP=$(git tag -l "backup-*" | sort -r | head -1)
   git checkout $LATEST_BACKUP -- data/
   ```

3. **Verify and commit**
   ```bash
   # Verify data integrity
   npm run verify-data  # (if available)
   
   # Commit the restored data
   git add data/
   git commit -m "recovery: complete data restore from $LATEST_BACKUP"
   git push origin main
   ```

4. **Redeploy to Vercel**
   ```bash
   # Trigger a production deployment
   vercel --prod
   # Or push will auto-deploy if connected to Git
   ```

---

## Verification Steps

After any recovery, verify the data:

```bash
# Check JSON validity
jq '.' data/incidents.json > /dev/null && echo "incidents.json: Valid JSON"
jq '.' data/branding.json > /dev/null && echo "branding.json: Valid JSON"

# Check data counts
echo "Incidents: $(jq '.incidents | length' data/incidents.json)"
echo "Last updated: $(jq -r '.lastUpdated' data/incidents.json)"

# Start the app locally and verify
npm run dev
# Visit http://localhost:3000/dashboard and check incidents load correctly
```

---

## Backup Configuration

### Required Secrets (GitHub)

Set these in your GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Description | Required For |
|--------|-------------|--------------|
| `BACKUP_S3_BUCKET` | S3/R2 bucket name | External backups |
| `BACKUP_S3_ENDPOINT` | R2 endpoint URL (omit for AWS S3) | R2 backups |
| `BACKUP_ACCESS_KEY_ID` | Access key for S3/R2 | External backups |
| `BACKUP_SECRET_ACCESS_KEY` | Secret key for S3/R2 | External backups |
| `VERCEL_TOKEN` | Vercel API token | Deployment verification |

### Environment Variables (Local)

Create `.env.local` for local testing:

```bash
# Optional: for testing backup uploads
BACKUP_S3_BUCKET=your-bucket-name
BACKUP_ACCESS_KEY_ID=your-access-key
BACKUP_SECRET_ACCESS_KEY=your-secret-key
BACKUP_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com  # For R2
```

---

## Data Integrity Checks

### Automated Checks

The backup workflow includes these integrity checks:

1. **JSON Validation** - Ensures all JSON files are parseable
2. **Schema Validation** - Validates against expected structure
3. **Size Checks** - Alerts if files exceed expected size (indicates corruption)
4. **Timestamp Validation** - Warns if lastUpdated is significantly old

### Manual Data Audit

```bash
# Run data integrity check
node scripts/verify-data.js

# Check for duplicate incident IDs
jq '.incidents[].id' data/incidents.json | sort | uniq -d

# Find incidents without required fields
jq '.incidents[] | select(.title == null or .status == null) | .id' data/incidents.json
```

---

## Disaster Recovery Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Primary | DevOps/SRE Agent | Backup monitoring, recovery execution |
| Escalation | Kevin Goodspeed | Major incidents, credential access |
| Platform | Vercel Support | Infrastructure issues |

---

## Recovery Time Objectives (RTO)

| Scenario | RTO | Method |
|----------|-----|--------|
| Single file restore | < 5 min | Git checkout |
| Complete data restore | < 15 min | Git tag checkout + deploy |
| Git repo unavailable | < 30 min | External archive restore |
| Complete rebuild | < 1 hour | Fresh clone + restore + deploy |

---

## Last Updated

This document was last updated: 2026-02-28

Next review date: 2026-03-28
