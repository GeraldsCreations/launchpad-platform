# LaunchPad Frontend

Beautiful, responsive Angular web application for the LaunchPad token launch platform on Solana.

## 🚀 Features

- **Token Discovery**: Browse trending, new, and graduated tokens
- **Real-time Updates**: Live price updates via WebSocket
- **Wallet Integration**: Connect Phantom, Solflare, or Coinbase Wallet
- **Trading**: Buy and sell tokens with live quotes
- **Token Creation**: Launch your own token with bonding curve
- **Portfolio Dashboard**: Track your holdings and PnL
- **Advanced Search**: Find tokens with filters and sorting
- **Responsive Design**: Works on all screen sizes
- **Dark/Light Mode**: Beautiful UI themes

## 🛠️ Tech Stack

- **Angular 21**: Latest Angular with standalone components
- **PrimeNG 17**: Rich UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Solana Web3.js**: Blockchain integration
- **Solana Wallet Adapter**: Multi-wallet support
- **TradingView Lightweight Charts**: Professional charting
- **RxJS**: Reactive programming
- **TypeScript**: Type-safe development

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm 9+
- Angular CLI 21+

### Setup

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Configure environment:**
   Edit `src/environments/environment.ts` for local development:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/v1',
     wsUrl: 'ws://localhost:3000/v1/ws',
     solanaRpcUrl: 'https://api.devnet.solana.com',
     solanaNetwork: 'devnet'
   };
   ```

3. **Start development server:**
   ```bash
   npm start
   ```
   
   App runs on `http://localhost:4200`

## 🏗️ Project Structure

```
src/app/
├── core/                     # Core services
│   ├── services/
│   │   ├── api.service.ts           # HTTP API client
│   │   ├── websocket.service.ts     # Real-time updates
│   │   ├── wallet.service.ts        # Solana wallet
│   │   └── blockchain.service.ts    # Blockchain queries
│   └── guards/
│       └── wallet.guard.ts          # Route protection
│
├── features/                 # Feature modules
│   ├── home/                        # Homepage
│   ├── token-detail/                # Token detail page
│   ├── create-token/                # Create token form
│   ├── dashboard/                   # User dashboard
│   └── explore/                     # Search & explore
│
├── shared/                   # Shared components
│   └── components/
│       ├── wallet-button.component.ts
│       ├── token-card.component.ts
│       ├── price-chart.component.ts
│       └── trade-form.component.ts
│
└── app.routes.ts             # Application routes
```

## 🎨 Key Components

### WalletButton
Connects to Solana wallets (Phantom, Solflare, Coinbase).

### TokenCard
Displays token information with live updates.

### PriceChart
TradingView-powered candlestick chart.

### TradeForm
Buy/sell interface with live quotes and slippage protection.

## 🔌 Services

### ApiService
HTTP client for backend REST API.

### WebSocketService
Real-time updates for prices, trades, and new tokens.

### WalletService
Solana wallet connection and transaction signing.

### BlockchainService
Direct blockchain queries for balances and confirmations.

## 🚦 Routes

- `/` - Homepage (trending, new, graduated tokens)
- `/explore` - Search and filter tokens
- `/token/:address` - Token detail page with trading
- `/create` - Create new token
- `/dashboard` - User portfolio and holdings

## 🔧 Scripts

```bash
npm start          # Start dev server (port 4200)
npm run build      # Production build
npm run watch      # Build with watch mode
npm test           # Run tests
npm run lint       # Lint code
```

## 🌐 Environment Variables

### Development (`environment.ts`)
- `apiUrl`: Backend API URL
- `wsUrl`: WebSocket URL
- `solanaRpcUrl`: Solana RPC endpoint
- `solanaNetwork`: Solana cluster (devnet/mainnet-beta)

### Production (`environment.prod.ts`)
Update for production deployment.

## 🎯 Performance

- **Time to Interactive**: <2s
- **First Contentful Paint**: <1s
- **Code Splitting**: Lazy-loaded routes
- **Optimized Build**: AOT compilation + tree-shaking

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- Semantic HTML

## 🐛 Troubleshooting

### Wallet not connecting
1. Ensure Phantom wallet is installed
2. Check browser console for errors
3. Verify network matches (devnet/mainnet)

### WebSocket connection failed
1. Check backend is running
2. Verify WebSocket URL in environment
3. Check browser security settings

### API requests failing
1. Verify backend API is running
2. Check CORS configuration
3. Ensure correct API URL in environment

## 📝 License

MIT

## 👨‍💻 Contributing

Built with 💜 by the LaunchPad team

---

**🍆 Powered by Gereld - AI Company Manager**
