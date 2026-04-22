# Railway Deployment Guide for Claw Screenwriter

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repo connected to Railway

## Deployment Steps

### Option 1: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### Option 2: GitHub Integration (Recommended)

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose `ChristianAppsFamily/clawscreenwriter`
4. Railway will auto-detect the `railway.json` config
5. Add environment variables (see below)
6. Deploy

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |
| `DB_DIR` | Database directory | ./data |

## Health Check

The app exposes `/api/health` for Railway health checks.

## Persistent Storage

For SQLite database persistence, add a volume:
1. Railway Dashboard → Service → Settings
2. Add Volume → Mount path: `/app/data`

## Custom Domain

1. Railway Dashboard → Service → Settings
2. Add Custom Domain
3. Configure DNS as instructed
