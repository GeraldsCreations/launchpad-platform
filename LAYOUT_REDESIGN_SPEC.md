# Token Detail Page Layout Redesign

## Reference
Pump.fun style layout with chart + trades table on left, trading interface on right.

## Current Layout Issues
1. ❌ Charts not showing properly
2. ❌ Activity tabs taking up middle column
3. ❌ Trading interface too narrow (20% width)
4. ❌ No recent trades table visible

## New Layout Specification

### Desktop Layout (> 1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Token Header                                 │
│  [Logo] Token Name (SYMBOL)  $0.00001 (+18.45%)  MC $1.2M          │
│                                              [Connect Wallet Button] │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┬─────────────────────────┐
│  CHART AREA (70%)                        │  TRADING PANEL (30%)    │
│                                          │                         │
│  [Live Price Chart]                      │  [Buy/Sell Tabs]       │
│  - TradingView Lightweight Charts        │  - Amount input        │
│  - Timeframe selector (5m, 15m, 1h, etc) │  - Balance display     │
│  - Fullscreen toggle                     │  - Fee calculation     │
│  - Volume bars                           │  - Slippage settings   │
│                                          │  - [BUY] button        │
│  Height: 400px                           │                         │
│                                          │  [AI Insights Card]     │
├──────────────────────────────────────────┤  - Recent Activity      │
│  RECENT TRADES TABLE                     │  - Next Action         │
│                                          │  - Market Sentiment     │
│  Type  | Price    | Amount   | Time     │                         │
│  ───────────────────────────────────────│                         │
│  BUY   | 0.00077  | 15.43M   | 2s ago  │                         │
│  SELL  | 0.00071  | 0.04913  | 5s ago  │                         │
│  BUY   | 0.00021  | 1.69M    | 8s ago  │                         │
│  ...                                     │                         │
│                                          │                         │
│  Height: 300px (scrollable)              │  Height: Full height   │
└──────────────────────────────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ACTIVITY TABS (Full Width)                                         │
│  [Thread] [Holders] [AI Logs]                                       │
│                                                                      │
│  [Selected Tab Content]                                             │
│  - Thread: Chat messages                                            │
│  - Holders: Wallet list with amounts                                │
│  - AI Logs: Agent activity feed                                     │
│                                                                      │
│  Height: 400px                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 1024px)

```
┌─────────────────────────────────┐
│  Token Header (Compact)         │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Chart (Full Width)             │
│  Height: 300px                  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Trading Interface              │
│  (Stacked vertically)           │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Tabs: [Trades][Thread][Holders]│
└─────────────────────────────────┘
```

## Components to Create/Modify

### 1. **New: `recent-trades-table.component.ts`**
```typescript
interface RecentTrade {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  priceUsd: number;
  amount: number;
  amountFormatted: string;
  trader: string;
  timestamp: string;
  txSignature: string;
}
```

**Features:**
- Real-time trade updates via WebSocket
- Color coding (green for buy, red for sell)
- Clickable trader address (truncated)
- Clickable tx signature (opens Solscan)
- Auto-scroll to latest trades
- 20-30 trades visible, scrollable

### 2. **Modify: `token-detail.component.ts`**

**New Grid Structure:**
```scss
.main-content-grid {
  display: grid;
  grid-template-columns: 70% 30%;
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  height: 400px;
}

.trades-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  height: 300px;
  overflow-y: auto;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1rem;
  height: fit-content;
}

.bottom-tabs {
  margin-top: 2rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
}
```

### 3. **Update: `activity-tabs.component.ts`**
Move from middle column to full-width bottom section.

**Tab Structure:**
- Thread (chat messages)
- Holders (wallet list)
- AI Logs (agent activity)

## WebSocket Integration

**Subscribe to:**
- `token.${address}.trade` - New trade events
- `token.${address}.price` - Price updates

**Trade Event Format:**
```typescript
{
  type: 'trade',
  data: {
    tokenAddress: string;
    side: 'buy' | 'sell';
    amountSol: number;
    amountTokens: string;
    price: number;
    trader: string;
    signature: string;
    timestamp: string;
  }
}
```

## Design Tokens

### Colors
```scss
--trade-buy: #10b981 (green-500)
--trade-sell: #ef4444 (red-500)
--table-header-bg: rgba(139, 92, 246, 0.1)
--table-row-hover: rgba(139, 92, 246, 0.05)
```

### Typography
```scss
.trade-type {
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
}

.trade-price {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.trade-amount {
  font-weight: 600;
  font-size: 0.875rem;
}

.trade-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}
```

## Implementation Steps

1. ✅ Create `recent-trades-table.component.ts`
2. ✅ Update `token-detail.component.ts` layout
3. ✅ Move activity tabs to bottom
4. ✅ Update grid CSS
5. ✅ Test WebSocket trade updates
6. ✅ Verify mobile responsiveness
7. ✅ Fix chart visibility issues

## Expected Outcome

- ✅ Chart prominently displayed (70% width)
- ✅ Real-time trades table below chart
- ✅ Trading interface takes 30% width (more space)
- ✅ Thread/Holders moved to bottom tabs
- ✅ Clean, professional layout like Pump.fun
- ✅ Responsive design for mobile

## Performance Considerations

- Limit trades table to 30 most recent trades
- Use virtual scrolling for large lists
- Throttle WebSocket updates (max 10 trades/second)
- Lazy load bottom tabs content
- Memoize trade row components

## Accessibility

- Keyboard navigation for tabs
- ARIA labels for trade types
- Screen reader friendly timestamps
- Color blind safe (not relying only on red/green)
- Focus indicators on interactive elements
