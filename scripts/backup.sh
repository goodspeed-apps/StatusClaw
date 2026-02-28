#!/bin/bash
#
# StatusClaw Data Backup Script
# 
# Usage:
#   ./scripts/backup.sh [git|external|both]
#
# Environment variables:
#   BACKUP_S3_BUCKET      - S3/R2 bucket name (optional)
#   BACKUP_S3_ENDPOINT    - R2 endpoint URL (optional)
#   AWS_ACCESS_KEY_ID     - AWS/R2 access key (optional)
#   AWS_SECRET_ACCESS_KEY - AWS/R2 secret key (optional)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATA_DIR="${PROJECT_ROOT}/data"
BACKUP_TYPE="${1:-git}"
TIMESTAMP=$(date -u +%Y-%m-%d-%H%M%S)
DATE=$(date -u +%Y-%m-%d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate data directory exists
validate_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        log_error "Data directory not found: $DATA_DIR"
        exit 1
    fi
    
    if [ ! -f "$DATA_DIR/incidents.json" ]; then
        log_warn "incidents.json not found in data directory"
    fi
    
    log_info "Data directory validated"
}

# Validate JSON files
validate_json() {
    log_info "Validating JSON files..."
    
    local has_errors=false
    
    for file in "$DATA_DIR"/*.json; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            if ! jq '.' "$file" > /dev/null 2>&1; then
                log_error "Invalid JSON: $filename"
                has_errors=true
            else
                log_info "Valid JSON: $filename"
            fi
        fi
    done
    
    if [ "$has_errors" = true ]; then
        log_error "JSON validation failed"
        exit 1
    fi
    
    log_info "All JSON files are valid"
}

# Git backup function
git_backup() {
    log_info "Starting git backup..."
    
    cd "$PROJECT_ROOT"
    
    # Check if there are changes to commit
    if [ -z "$(git status --porcelain data/)" ]; then
        log_info "No data changes to commit"
        return 0
    fi
    
    # Configure git if not already configured
    if [ -z "$(git config user.name 2>/dev/null)" ]; then
        git config user.name "StatusClaw Backup Script"
    fi
    if [ -z "$(git config user.email 2>/dev/null)" ]; then
        git config user.email "backup@statusclaw.local"
    fi
    
    # Stage data files
    git add data/
    
    # Create commit
    local backup_tag="backup-${TIMESTAMP}"
    git commit -m "backup: data snapshot ${TIMESTAMP}

- Manual backup via backup.sh
- Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Create tag
    git tag "$backup_tag"
    
    # Push to origin
    log_info "Pushing backup to origin..."
    git push origin HEAD
    git push origin "$backup_tag"
    
    log_info "Git backup completed: $backup_tag"
}

# External backup function (S3/R2)
external_backup() {
    log_info "Starting external backup..."
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Install with: pip install awscli"
        exit 1
    fi
    
    # Check if bucket is configured
    if [ -z "${BACKUP_S3_BUCKET:-}" ]; then
        log_error "BACKUP_S3_BUCKET environment variable not set"
        log_info "Set it with: export BACKUP_S3_BUCKET=your-bucket-name"
        exit 1
    fi
    
    # Create backup directory
    local backup_dir="/tmp/statusclaw-backup-${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    # Create archive
    local archive_name="statusclaw-data-${DATE}.tar.gz"
    local archive_path="$backup_dir/$archive_name"
    
    log_info "Creating archive: $archive_name"
    tar -czf "$archive_path" -C "$PROJECT_ROOT" data/
    
    # Generate checksum
    cd "$backup_dir"
    sha256sum "$archive_name" > "${archive_name}.sha256"
    
    # Configure R2 endpoint if provided
    if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
        log_info "Using R2 endpoint: $BACKUP_S3_ENDPOINT"
        aws configure set default.s3.endpoint_url "$BACKUP_S3_ENDPOINT"
        aws configure set default.s3.signature_version s3v4
    fi
    
    # Upload to S3/R2
    log_info "Uploading to s3://$BACKUP_S3_BUCKET/statusclaw/"
    aws s3 cp "$archive_path" "s3://$BACKUP_S3_BUCKET/statusclaw/"
    aws s3 cp "${archive_path}.sha256" "s3://$BACKUP_S3_BUCKET/statusclaw/"
    
    # Cleanup
    rm -rf "$backup_dir"
    
    log_info "External backup completed: s3://$BACKUP_S3_BUCKET/statusclaw/$archive_name"
}

# Create local archive (fallback)
local_backup() {
    log_info "Creating local backup archive..."
    
    local backup_dir="${PROJECT_ROOT}/backups"
    mkdir -p "$backup_dir"
    
    local archive_name="statusclaw-data-${DATE}.tar.gz"
    local archive_path="$backup_dir/$archive_name"
    
    tar -czf "$archive_path" -C "$PROJECT_ROOT" data/
    sha256sum "$archive_path" > "${archive_path}.sha256"
    
    log_info "Local backup created: $archive_path"
    
    # List recent backups
    log_info "Recent backups:"
    ls -lht "$backup_dir"/*.tar.gz 2>/dev/null | head -5
}

# Cleanup old local backups (keep 7 days)
cleanup_local_backups() {
    local backup_dir="${PROJECT_ROOT}/backups"
    
    if [ -d "$backup_dir" ]; then
        log_info "Cleaning up old local backups..."
        find "$backup_dir" -name "*.tar.gz" -type f -mtime +7 -delete
        find "$backup_dir" -name "*.sha256" -type f -mtime +7 -delete
        log_info "Cleanup completed"
    fi
}

# Main execution
main() {
    log_info "StatusClaw Data Backup"
    log_info "======================"
    log_info "Backup type: $BACKUP_TYPE"
    log_info "Timestamp: $TIMESTAMP"
    
    # Pre-flight checks
    validate_data_dir
    validate_json
    
    # Execute requested backup type
    case "$BACKUP_TYPE" in
        git)
            git_backup
            ;;
        external)
            external_backup || {
                log_warn "External backup failed, creating local backup..."
                local_backup
            }
            ;;
        both)
            git_backup
            external_backup || {
                log_warn "External backup failed, creating local backup..."
                local_backup
            }
            ;;
        local)
            local_backup
            cleanup_local_backups
            ;;
        *)
            log_error "Unknown backup type: $BACKUP_TYPE"
            log_info "Usage: $0 [git|external|both|local]"
            exit 1
            ;;
    esac
    
    log_info "Backup completed successfully!"
}

# Run main function
main
