# 🚀 LaunchPad - Pump.fun Competitor

**Token launch platform for AI agents and humans on Solana**

## 📁 Repository Structure

```
launchpad-platform/
├── contracts/              # Solana smart contracts (Rust/Anchor)
│   ├── programs/
│   │   ├── bonding-curve/  # Bonding curve AMM
│   │   ├── token-factory/  # Token creation
│   │   └── graduation/     # Raydium migration
│   └── tests/
├── backend/                # NestJS API server
│   ├── src/
│   │   ├── public-api/     # Public API (bots, integrations)
│   │   ├── private-api/    # Private API (our UI)
│   │   ├── websocket/      # Real-time updates
│   │   ├── indexer/        # Blockchain indexer
│   │   └── database/       # PostgreSQL schemas
│   └── swagger/            # API documentation
├── frontend/               # Angular + PrimeNG web UI
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   └── environments/
│   └── public/
├── skills/                 # ClawdBot trading skill
│   └── launchpad-trader/
│       ├── SKILL.md
│       └── scripts/
└── docs/                   # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEPLOYMENT.md
```

## 🏗️ Tech Stack

### Smart Contracts
- **Rust** with Anchor framework
- **Solana** blockchain
- **SPL Token** standard

### Backend
- **NestJS** (TypeScript)
- **PostgreSQL** with TypeORM
- **WebSockets** for real-time updates
- **Swagger** for API documentation
- **Bull** for job queues

### Frontend
- **Angular 17**
- **PrimeNG** UI components
- **RxJS** for reactive patterns
- **Solana Wallet Adapter**

### Infrastructure
- **Docker** for containerization
- **Redis** for caching
- **Nginx** for reverse proxy

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor CLI
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone repository
git clone <repo-url>
cd launchpad-platform

# Install dependencies
npm run install:all

# Setup environment
cp backend/.env.example backend/.env
cp frontend/src/environments/environment.example.ts frontend/src/environments/environment.ts

# Initialize database
npm run db:init

# Start development servers
npm run dev
```

### Development

```bash
# Start all services
npm run dev

# Start individual services
npm run dev:contracts   # Solana localnet validator
npm run dev:backend     # NestJS server (port 3000)
npm run dev:frontend    # Angular dev server (port 4200)
npm run dev:indexer     # Blockchain indexer
```

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Smart Contract Documentation](contracts/README.md)
- [Frontend Documentation](frontend/README.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🤖 ClawdBot Integration

Use the LaunchPad trading skill:

```bash
# Check balance
launchpad balance

# Create token
launchpad create --name "My Token" --symbol "MYTKN"

# Buy tokens
launchpad buy MYTKN 1.0

# Sell tokens
launchpad sell MYTKN 50000

# List trending tokens
launchpad trending
```

## 🔧 Development Workflow

1. **Smart Contracts** - Built by Solana dev agent
2. **Backend API** - Built by backend dev agent
3. **Frontend UI** - Built by frontend dev agent
4. **Integration** - Coordinated by project manager agent

## 📊 Architecture

### Data Flow

```
User/Bot
    ↓
Public API (REST + WebSocket)
    ↓
Backend (NestJS)
    ↓
    ├──→ Database (PostgreSQL) ← UI data
    └──→ Blockchain (Solana) ← Source of truth
         ↑
    Indexer (watches chain)
```

### Key Principles
- **On-chain first**: Blockchain is source of truth
- **Database caching**: DB only for UI/analytics
- **Real-time updates**: WebSockets for live data
- **API-first**: Public API for bot integration

## 🛠️ Build Status

- [ ] Smart Contracts
  - [ ] Bonding Curve Program
  - [ ] Token Factory Program
  - [ ] Graduation Handler
- [ ] Backend API
  - [ ] Public API endpoints
  - [ ] Private API endpoints
  - [ ] WebSocket server
  - [ ] Blockchain indexer
- [ ] Frontend
  - [ ] Token creation UI
  - [ ] Trading interface
  - [ ] Token discovery
  - [ ] User dashboard
- [ ] ClawdBot Skill
  - [ ] Trading commands
  - [ ] API integration

## 🚢 Deployment

### Testnet
```bash
npm run deploy:testnet
```

### Mainnet
```bash
npm run deploy:mainnet
```

## 📝 License

MIT

## 👥 Team

Built with AI agents coordinated by Gereld 🍆
