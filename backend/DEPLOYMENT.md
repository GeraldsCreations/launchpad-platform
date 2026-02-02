# LaunchPad Backend - Deployment Guide

## Quick Start (Development)

### Using Docker Compose (Recommended)

```bash
# 1. Clone and navigate
cd /root/.openclaw/workspace/launchpad-platform/backend

# 2. Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# 3. View logs
docker-compose logs -f api

# 4. Run migrations
docker-compose exec api npm run migration:run

# 5. Seed database (optional)
docker-compose exec api npm run seed

# 6. Access API
# API: http://localhost:3000/v1
# Swagger: http://localhost:3000/api/docs
```

### Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL and Redis
# (Ensure they're running on localhost:5432 and localhost:6379)

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Run migrations
npm run migration:run

# 5. Seed database (optional)
npm run seed

# 6. Start development server
npm run start:dev
```

## Production Deployment

### Environment Variables

Create a production `.env` file:

```env
NODE_ENV=production
PORT=3000
API_PREFIX=v1
CORS_ORIGIN=https://app.launchpad.fun

# Database (use production credentials)
DATABASE_HOST=prod-postgres.example.com
DATABASE_PORT=5432
DATABASE_USER=launchpad_prod
DATABASE_PASSWORD=SECURE_PASSWORD_HERE
DATABASE_NAME=launchpad_prod

# Redis
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379

# Solana (use mainnet)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
SOLANA_COMMITMENT=confirmed
BONDING_CURVE_PROGRAM_ID=YOUR_MAINNET_PROGRAM_ID
TOKEN_FACTORY_PROGRAM_ID=YOUR_MAINNET_FACTORY_ID

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=info
```

### Docker Production Build

```bash
# Build production image
docker build -t launchpad-api:latest .

# Run production container
docker run -d \
  --name launchpad-api \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  launchpad-api:latest

# View logs
docker logs -f launchpad-api
```

### Manual Production Build

```bash
# Install production dependencies
npm ci --only=production

# Build application
npm run build

# Run migrations
npm run migration:run

# Start production server
npm run start:prod
```

## Health Checks

### API Health
```bash
curl http://localhost:3000/v1/admin/system/status
```

### Database Connection
```bash
docker-compose exec postgres psql -U launchpad -d launchpad -c "SELECT COUNT(*) FROM tokens;"
```

### Indexer Status
```bash
curl http://localhost:3000/v1/admin/system/status | jq '.indexer'
```

## Monitoring

### View Logs

Docker:
```bash
docker-compose logs -f api      # API logs
docker-compose logs -f postgres # Database logs
docker-compose logs -f redis    # Redis logs
```

Manual:
```bash
# Application logs written to console
pm2 logs launchpad-api  # If using PM2
```

### Database Queries

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U launchpad -d launchpad

# Useful queries
SELECT COUNT(*) FROM tokens;
SELECT COUNT(*) FROM trades;
SELECT * FROM tokens ORDER BY volume24h DESC LIMIT 10;
```

## Maintenance

### Backup Database

```bash
# Backup
docker-compose exec postgres pg_dump -U launchpad launchpad > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U launchpad launchpad < backup_20240202.sql
```

### Clear Cache

```bash
docker-compose exec redis redis-cli FLUSHALL
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart API only
docker-compose restart api

# Restart indexer programmatically
curl -X POST http://localhost:3000/v1/admin/indexer/restart
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml` PostgreSQL service:
```yaml
command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Redis

For production, configure persistence:
```yaml
redis:
  command: redis-server --appendonly yes
```

### API Scaling

Run multiple API instances behind a load balancer:
```bash
docker-compose up -d --scale api=3
```

## Troubleshooting

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Database migration errors
```bash
# Revert last migration
npm run migration:revert

# Reset database (⚠️ destroys data)
docker-compose down -v
docker-compose up -d
npm run migration:run
```

### Indexer not syncing
```bash
# Check Solana RPC connection
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Restart indexer
curl -X POST http://localhost:3000/v1/admin/indexer/restart
```

### Out of memory
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm run start:prod
```

## Security Checklist

- [ ] Change default database passwords
- [ ] Use HTTPS in production (reverse proxy)
- [ ] Enable rate limiting
- [ ] Set CORS_ORIGIN to your domain
- [ ] Use API keys for authentication
- [ ] Enable Helmet middleware for security headers
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Disable synchronize in production (TypeORM)

## CI/CD Pipeline Example

```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t launchpad-api:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push launchpad-api:${{ github.sha }}
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            docker pull launchpad-api:${{ github.sha }}
            docker stop launchpad-api || true
            docker rm launchpad-api || true
            docker run -d --name launchpad-api -p 3000:3000 --env-file /opt/launchpad/.env launchpad-api:${{ github.sha }}
```

## Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Review GitHub issues
- Contact DevOps team

---

**Last Updated:** February 2024
