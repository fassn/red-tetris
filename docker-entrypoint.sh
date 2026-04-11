#!/bin/sh
# Fix ownership of the data directory (may be mounted as root-owned volume)
chown -R nextjs:nodejs /app/data 2>/dev/null || true

# Ensure NODE_ENV is set (su-exec may not inherit it)
export NODE_ENV="${NODE_ENV:-production}"

# Drop privileges and run the pre-compiled server
exec su-exec nextjs node dist/server/index.js
