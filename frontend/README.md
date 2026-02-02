# 🚀 Meteora LaunchPad Frontend

A beautiful, Pump.fun-inspired frontend for token launches via Meteora on Solana.

## Features

### 🏠 Core Pages

1. **Home Page** (`/`)
   - Platform statistics (total tokens, 24h volume, trades, graduated tokens)
   - Real-time search with debouncing
   - Trending, New, and Graduated tokens tabs
   - WebSocket integration for live updates
   - Quick actions (Create Token, View Portfolio)

2. **Create Token Page** (`/create`)
   - Token metadata form (name, symbol, description, image)
   - Initial buy configuration
   - Bonding curve preview with key metrics
   - 1 SOL launch fee display
   - Wallet integration with transaction confirmation

3. **Token Detail Page** (`/token/:address`)
   - Real-time price chart with bonding curve visualization
   - Buy/Sell trading interface with live quotes
   - Token statistics (volume, holders, supply)
   - Recent trade history
   - Price impact calculation
   - Social links and explorer integration

4. **Portfolio/Dashboard** (`/dashboard`)
   - SOL balance display
   - Token holdings with P&L tracking
   - Transaction history
   - Portfolio value calculation
   - Quick links to token pages

5. **Explore Page** (`/explore`)
   - Advanced token search and filtering
   - Sort by market cap, volume, holders, or date
   - Real-time results

### 🎨 UI Components

- **Token Card** - Beautiful card display for token listings
- **Trade Form** - Buy/sell interface with live quotes and price impact
- **Price Chart** - Lightweight Charts integration for bonding curve visualization
- **Wallet Button** - Phantom/Solflare wallet connection with dropdown menu
- **Token Stats** - Animated platform statistics with gradient cards

### 🔧 Services

- **API Service** - Complete REST API integration for all endpoints
- **Wallet Service** - Solana wallet adapter (Phantom, Solflare, Coinbase)
- **WebSocket Service** - Real-time price updates and trade notifications
- **Notification Service** - Toast notifications for all user actions

## Tech Stack

- **Framework**: Angular 21 (standalone components)
- **UI Library**: PrimeNG 17 (dark theme)
- **Styling**: TailwindCSS + Custom SCSS
- **Charts**: Lightweight Charts 4.2
- **Blockchain**: Solana Web3.js
- **State**: RxJS Observables

## Design

### Theme
- Dark mode optimized for crypto aesthetic
- Gradient accents (primary: #667eea → #764ba2)
- Smooth animations and transitions
- Professional, trustworthy appearance
- Mobile-responsive design

### Colors
- Background: Gray-950
- Cards: Gray-900/1a1a1a
- Primary: Blue-500
- Success: Green-500
- Danger: Red-500
- Warning: Amber-500

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm start
# Opens http://localhost:4200

# Build for production
npm run build

# Run tests
npm test
```

## Environment Configuration

### Development (`environment.ts`)
- API: http://localhost:3000/v1
- WebSocket: ws://localhost:3000/v1/ws
- Solana RPC: Devnet

### Production (`environment.prod.ts`)
- API: https://api.launchpad.fun/v1
- WebSocket: wss://api.launchpad.fun/v1/ws
- Solana RPC: Mainnet-beta

## Key Features

### 🔗 Wallet Integration
- Automatic wallet detection (Phantom, Solflare)
- Connect/disconnect with visual feedback
- Balance display with auto-refresh
- Transaction signing support

### 💹 Trading Features
- Real-time price quotes
- Slippage calculation
- Price impact warnings (yellow >5%, red >10%)
- Gas fee estimation
- Success/error notifications

### 📊 Real-time Updates
- WebSocket connection for live prices
- New token notifications
- Trade feed updates
- Automatic reconnection

### 🎯 User Experience
- Debounced search (300ms)
- Loading states with skeletons
- Error handling with toast notifications
- Copy-to-clipboard with confirmation
- Responsive grid layouts
- Smooth page transitions

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   └── services/
│   │       ├── api.service.ts           # REST API client
│   │       ├── wallet.service.ts        # Wallet connection
│   │       ├── websocket.service.ts     # Real-time data
│   │       ├── notification.service.ts  # Toast notifications
│   │       └── blockchain.service.ts    # Solana interactions
│   ├── features/
│   │   ├── home/                        # Home page
│   │   ├── create-token/                # Token creation
│   │   ├── token-detail/                # Token details
│   │   ├── dashboard/                   # User portfolio
│   │   └── explore/                     # Token search
│   ├── shared/
│   │   └── components/
│   │       ├── token-card.component.ts
│   │       ├── trade-form.component.ts
│   │       ├── price-chart.component.ts
│   │       ├── wallet-button.component.ts
│   │       └── token-stats.component.ts
│   ├── app.ts                           # Root component
│   ├── app.config.ts                    # App configuration
│   └── app.routes.ts                    # Route definitions
├── environments/                        # Environment configs
├── styles.scss                          # Global styles
└── index.html                          # HTML entry

public/
└── assets/
    └── default-token.png               # Default token image
```

## Backend Integration

All components are ready to integrate with the backend API at `localhost:3000/v1`:

### Endpoints Used
- `GET /tokens/trending` - Trending tokens
- `GET /tokens/new` - New launches
- `GET /tokens/:address` - Token details
- `GET /tokens/search` - Search tokens
- `POST /tokens/create` - Create new token
- `GET /trade/quote` - Get buy/sell quote
- `POST /trade/buy` - Execute buy order
- `POST /trade/sell` - Execute sell order
- `GET /trade/history` - Trade history
- `GET /user/portfolio` - User holdings
- `GET /user/trades` - User transaction history

### WebSocket Events
- `token:new` - New token created
- `token:price` - Price update
- `token:trade` - New trade executed
- `token:graduated` - Token graduated to Raydium

## Deployment

1. Update environment.prod.ts with production URLs
2. Build: `npm run build`
3. Deploy `dist/` folder to hosting provider
4. Configure CORS on backend for production domain

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Credits

Built with ❤️ by Gereld 🍆
Inspired by Pump.fun
Powered by Solana & Meteora

---

**Status**: ✅ Complete and ready for integration with backend!
