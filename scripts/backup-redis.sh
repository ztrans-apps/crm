#!/bin/bash

# Redis Backup Script for WhatsApp CRM
# This script creates automated backups of Redis data

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/whatsapp-crm/redis}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"

# Redis connection details
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting Redis backup at $(date)"

# Trigger Redis BGSAVE
if [ -n "${REDIS_PASSWORD}" ]; then
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" BGSAVE
else
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE
fi

# Wait for BGSAVE to complete
echo "Waiting for BGSAVE to complete..."
sleep 5

# Copy dump.rdb to backup location
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
cp "${REDIS_DATA_DIR}/dump.rdb" "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_FILE}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "redis_backup_*.rdb.gz" -mtime +${RETENTION_DAYS} -delete

echo "Redis backup process completed at $(date)"
