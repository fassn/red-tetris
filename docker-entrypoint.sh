#!/bin/sh
# Fix ownership of the data directory (may be mounted as root-owned volume)
chown -R nextjs:nodejs /app/data 2>/dev/null || true

# Drop privileges and run the app
exec su-exec nextjs npx tsx server/index.ts
