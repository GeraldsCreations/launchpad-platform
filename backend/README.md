# LaunchPad Backend API

Production-ready NestJS API for the LaunchPad token launch platform on Solana.

## Features

- ✅ **Public REST API** - Token creation, trading, and discovery endpoints
- ✅ **WebSocket Server** - Real-time price updates and trade notifications
- ✅ **Blockchain Indexer** - Syncs Solana transactions to PostgreSQL
- ✅ **Private Admin API** - User management and analytics dashboard
- ✅ **TypeORM Database** - PostgreSQL with migrations and seeds
- ✅ **Swagger Documentation** - Interactive API docs at `/api/docs`
- ✅ **Rate Limiting** - Configurable per API key
- ✅ **Docker Support** - Docker Compose for local development

## Tech Stack

- **Framework:** NestJS 10+ (TypeScript)
- **Database:** PostgreSQL 15 + TypeORM
- **Cache:** Redis 7
- **Blockchain:** Solana Web3.js
- **WebSockets:** Socket.io
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Installation

1. **Clone the repository:**
   ```bash
   cd /root/.openclaw/workspace/launchpad-platform/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

   Or manually:
   ```bash
   # Start PostgreSQL and Redis first
   npm run start:dev
   ```

5. **Run migrations:**
   ```bash
   npm run migration:run
   ```

6. **Seed database (optional):**
   ```bash
   npm run seed
   ```

### Access

- **API:** http://localhost:3000/v1
- **Swagger Docs:** http://localhost:3000/api/docs
- **WebSocket:** ws://localhost:3000/v1/ws

## API Endpoints

### Public API

#### Tokens
- `POST /v1/tokens/create` - Create new token
- `GET /v1/tokens/:address` - Get token details
- `GET /v1/tokens/trending` - List trending tokens
- `GET /v1/tokens/new` - List new tokens
- `GET /v1/tokens/search?q=query` - Search tokens
- `GET /v1/tokens/filter/creator/:creator` - Tokens by creator
- `GET /v1/tokens/filter/graduated` - Graduated tokens

#### Trading
- `POST /v1/trade/buy` - Buy tokens
- `POST /v1/trade/sell` - Sell tokens
- `GET /v1/trade/quote/buy?token=...&amount=...` - Get buy quote
- `GET /v1/trade/quote/sell?token=...&amount=...` - Get sell quote
- `GET /v1/trade/history/:tokenAddress` - Token trade history
- `GET /v1/trade/user/:wallet` - User trade history
- `GET /v1/trade/recent` - Recent trades

### Private API (Admin)

#### Admin
- `POST /v1/admin/users/:wallet/api-key` - Create API key
- `DELETE /v1/admin/users/:wallet/api-key` - Revoke API key
- `POST /v1/admin/users/:wallet/tier` - Update user tier
- `GET /v1/admin/users` - List all users
- `GET /v1/admin/system/status` - System status
- `POST /v1/admin/indexer/restart` - Restart indexer

#### Analytics
- `GET /v1/analytics/dashboard` - Dashboard statistics
- `GET /v1/analytics/historical?startDate=...&endDate=...` - Historical stats
- `GET /v1/analytics/top-tokens?limit=10` - Top tokens by volume
- `GET /v1/analytics/top-traders?limit=10` - Top traders

## WebSocket Events

### Client → Server

Subscribe to token updates:
```json
{
  "action": "subscribe",
  "channel": "token",
  "token_address": "ABC123..."
}
```

Subscribe to new tokens:
```json
{
  "action": "subscribe",
  "channel": "new_tokens"
}
```

### Server → Client

Price update:
```json
{
  "event": "price_update",
  "token_address": "ABC123...",
  "price": 0.00012,
  "market_cap": 12345,
  "volume_24h": 45678,
  "timestamp": 1234567890
}
```

Trade event:
```json
{
  "event": "trade",
  "token_address": "ABC123...",
  "side": "buy",
  "amount_sol": 0.5,
  "amount_tokens": "50000",
  "trader": "wallet...",
  "price": 0.00012,
  "timestamp": 1234567890
}
```

## Database Schema

### Tables

- **tokens** - Token metadata and current state
- **trades** - Historical trade records
- **holders** - Token ownership tracking
- **users** - API key management
- **platform_stats** - Daily analytics snapshots

### Migrations

```bash
# Generate new migration
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Development

### Start in watch mode
```bash
npm run start:dev
```

### Run tests
```bash
npm test                 # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
```

### Lint and format
```bash
npm run lint             # Lint code
npm run format           # Format code
```

### Docker commands
```bash
docker-compose up        # Start all services
docker-compose down      # Stop all services
docker-compose logs api  # View API logs
docker-compose exec api npm run migration:run
```

## Architecture

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
│
├── database/                  # Database layer
│   ├── entities/              # TypeORM entities
│   ├── repositories/          # Custom repositories
│   └── migrations/            # Database migrations
│
├── public-api/                # Public API
│   ├── controllers/           # REST controllers
│   ├── services/              # Business logic
│   └── dto/                   # Data transfer objects
│
├── private-api/               # Private admin API
│   ├── controllers/           # Admin controllers
│   └── services/              # Admin services
│
├── websocket/                 # WebSocket server
│   └── websocket.gateway.ts   # Socket.io gateway
│
├── indexer/                   # Blockchain indexer
│   └── indexer.service.ts     # Solana event listener
│
└── common/                    # Shared utilities
    ├── guards/                # Auth guards
    ├── interceptors/          # Request interceptors
    └── decorators/            # Custom decorators
```

## Performance

### Targets

- API response time: <100ms (p95)
- WebSocket latency: <50ms
- Indexer lag: <2s behind chain
- Database query time: <50ms

### Monitoring

The API exposes metrics through:
- `/v1/admin/system/status` - System health
- Indexer slot lag tracking
- WebSocket connection stats

## Security

- ✅ Rate limiting per API key
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (TypeORM)
- ✅ CORS configuration
- ✅ Helmet security headers (recommended for production)

## Production Deployment

### Environment Variables

Required for production:
```env
NODE_ENV=production
PORT=3000
DATABASE_HOST=your-postgres-host
DATABASE_PASSWORD=secure-password
REDIS_HOST=your-redis-host
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
CORS_ORIGIN=https://yourdomain.com
```

### Build for production
```bash
npm run build
npm run start:prod
```

### Docker production build
```bash
docker build -t launchpad-api .
docker run -p 3000:3000 --env-file .env launchpad-api
```

## Troubleshooting

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Indexer not syncing
```bash
# Check indexer status
curl http://localhost:3000/v1/admin/system/status

# Restart indexer
curl -X POST http://localhost:3000/v1/admin/indexer/restart
```

## Contributing

1. Create feature branch
2. Write tests
3. Ensure linting passes
4. Submit pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/launchpad/backend/issues
- Documentation: https://docs.launchpad.fun
