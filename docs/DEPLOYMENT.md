# Deployment Guide

This guide covers deploying the Billing App to production environments.

## Deployment Options

| Platform | Recommended For | Complexity |
|----------|-----------------|------------|
| Vercel | Quickest deployment | Low |
| Railway | Full-stack hosting | Low |
| AWS | Enterprise scale | High |
| Docker | Self-hosted | Medium |
| DigitalOcean | Cost-effective | Medium |

---

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- PostgreSQL database (Neon, Supabase, or PlanetScale)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository
   - Configure environment variables

3. **Environment Variables**
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel automatically builds and deploys

### Post-Deployment

```bash
# Run migrations (in Vercel terminal or locally)
npx prisma migrate deploy

# Seed data (optional)
npx prisma db seed
```

---

## Railway Deployment

### Steps

1. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Add PostgreSQL database

2. **Connect Repository**
   - Connect GitHub repo
   - Railway auto-detects Next.js

3. **Configure Variables**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=https://your-app.railway.app
   ```

4. **Deploy**
   - Railway auto-deploys on push

---

## Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### docker-compose.yml (Production)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://billing:billing_secret@db:5432/billing_app
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: billing
      POSTGRES_PASSWORD: billing_secret
      POSTGRES_DB: billing_app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Build and Run

```bash
# Build image
docker build -t billing-app .

# Run with compose
docker compose -f docker-compose.prod.yml up -d
```

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Session encryption key | Random 32+ char string |
| `NEXTAUTH_URL` | Application URL | `https://billing.example.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RAZORPAY_KEY_ID` | Razorpay API key | - |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | - |

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

---

## Database Setup

### Managed PostgreSQL Options

| Provider | Free Tier | Recommended For |
|----------|-----------|-----------------|
| [Neon](https://neon.tech) | 512MB | Development, small apps |
| [Supabase](https://supabase.com) | 500MB | Small-medium apps |
| [PlanetScale](https://planetscale.com) | 5GB (MySQL) | MySQL preference |
| [Railway](https://railway.app) | $5 credit | Full-stack hosting |
| [AWS RDS](https://aws.amazon.com/rds/) | 12 months free | Enterprise |

### Connection Pooling

For serverless deployments (Vercel), use connection pooling:

```env
# With Neon
DATABASE_URL="postgresql://...?pgbouncer=true"

# With PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db"
```

### Running Migrations

```bash
# Production migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

---

## SSL/TLS Configuration

### Vercel
- Automatic SSL via Let's Encrypt

### Custom Domain
1. Add domain in Vercel dashboard
2. Configure DNS:
   ```
   Type: CNAME
   Name: billing
   Value: cname.vercel-dns.com
   ```
3. Wait for SSL certificate

### Self-Hosted
Use Caddy or nginx with Let's Encrypt:

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name billing.example.com;

    ssl_certificate /etc/letsencrypt/live/billing.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billing.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Monitoring

### Vercel Analytics

Enable in Vercel dashboard for:
- Page views
- Web vitals
- Error tracking

### Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "your-sentry-dsn",
  tracesSampleRate: 1.0,
})
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() })
}
```

---

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240101.sql
```

### Automated Backups (with cron)

```bash
# /etc/cron.d/billing-backup
0 0 * * * root pg_dump $DATABASE_URL | gzip > /backups/billing_$(date +\%Y\%m\%d).sql.gz
```

### Cloud Provider Backups
- Neon: Automatic point-in-time recovery
- Supabase: Daily backups on paid plans
- AWS RDS: Automated backups + snapshots

---

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  app:
    deploy:
      replicas: 3
```

### Vercel Auto-Scaling
- Automatic with serverless functions
- Edge functions for global distribution

### Database Scaling
1. Read replicas for heavy read loads
2. Connection pooling (PgBouncer)
3. Vertical scaling (larger instance)

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database not publicly accessible
- [ ] Strong NEXTAUTH_SECRET
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Regular dependency updates
- [ ] Database backups enabled
- [ ] Monitoring/alerting set up

### Security Headers (next.config.js)

```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
]

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}
```

---

## Troubleshooting

### Build Failures

```bash
# Check build locally
npm run build

# Clear cache
rm -rf .next
npm run build
```

### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Check DATABASE_URL format
postgresql://user:password@host:5432/database?sslmode=require
```

### Memory Issues

```javascript
// next.config.js - Increase memory limit
module.exports = {
  experimental: {
    workerThreads: false,
    cpus: 1
  }
}
```

### Cold Starts (Serverless)

- Use connection pooling
- Consider edge functions
- Optimize bundle size

---

## Maintenance

### Regular Tasks

- Weekly: Check error logs
- Monthly: Update dependencies
- Monthly: Review security advisories
- Quarterly: Database maintenance (VACUUM, ANALYZE)

### Updating Production

```bash
# 1. Create backup
pg_dump $DATABASE_URL > backup.sql

# 2. Deploy new version
git push origin main

# 3. Run migrations
npx prisma migrate deploy

# 4. Verify functionality
curl https://your-domain.com/api/health
```
