# LaunchPad UI/UX Redesign - Pump.fun Inspired

**Status:** Complete Redesign Specification  
**Date:** February 3, 2026  
**Goal:** Modern, fun, futuristic AI aesthetic with pump.fun-level interactivity  

---

## 🎨 Design Philosophy

### Core Principles
1. **Fast & Responsive** - Every interaction feels instant
2. **Visually Engaging** - Animations everywhere, but performant
3. **Information Dense** - Show everything traders need at a glance
4. **Mobile-First** - Perfect on all devices
5. **AI-Powered Feel** - Futuristic, intelligent, automated vibe

### Pump.fun Key Learnings
- **Live activity feeds** - Real-time trades scrolling constantly
- **Minimal chrome** - Focus on content, not decoration
- **Bold typography** - Large, readable numbers and stats
- **Instant feedback** - Every action has visual response
- **Meme-friendly** - Fun, not boring corporate
- **Chart prominence** - Trading view gets primary focus
- **Social proof** - Show who's buying, what's trending

---

## 🎨 Design System

### Colors (OpenClaw Theme)

```typescript
// Primary: Purple (OpenClaw brand)
primary: {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',  // Use for highlights
  500: '#a855f7',  // Primary brand
  600: '#9333ea',  // Hover states
  700: '#7e22ce',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
}

// Secondary: Blue (accents)
secondary: {
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
}

// Accent: Eggplant 🍆
accent: {
  500: '#7c3aed',
  600: '#6d28d9',
}

// Semantic Colors
success: '#10b981', // Green
danger: '#ef4444',  // Red
warning: '#f59e0b', // Orange
info: '#06b6d4',    // Cyan
```

### Background Layers

```css
/* Background Hierarchy */
bg-layer-0: #0a0a0f  /* Deepest background */
bg-layer-1: #111118  /* Cards, panels */
bg-layer-2: #1a1a25  /* Elevated cards */
bg-layer-3: #232336  /* Highest elevation */

/* Glassmorphism */
glass-light: rgba(255, 255, 255, 0.05)
glass-medium: rgba(255, 255, 255, 0.1)
glass-heavy: rgba(168, 85, 247, 0.1)  /* Purple tint */
```

### Typography

```css
/* Font Stack */
font-primary: 'Inter', system-ui, sans-serif
font-mono: 'JetBrains Mono', 'Fira Code', monospace

/* Sizes */
text-hero: 4rem      /* 64px */
text-display: 3rem   /* 48px */
text-title: 2rem     /* 32px */
text-heading: 1.5rem /* 24px */
text-body: 1rem      /* 16px */
text-small: 0.875rem /* 14px */
text-tiny: 0.75rem   /* 12px */
```

### Shadows & Effects

```css
/* Glow Effects */
glow-primary: 0 0 20px rgba(168, 85, 247, 0.3)
glow-success: 0 0 20px rgba(16, 185, 129, 0.3)
glow-danger: 0 0 20px rgba(239, 68, 68, 0.3)

/* Shadows */
shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3)
shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4)
shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5)
shadow-xl: 0 12px 48px rgba(0, 0, 0, 0.6)

/* Glassmorphism */
backdrop-blur: backdrop-filter: blur(12px)
```

### Animation Speeds

```css
/* Timing */
instant: 100ms
fast: 200ms
normal: 300ms
slow: 500ms
glacial: 1000ms

/* Easing */
ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1)
ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6)
```

---

## 📱 Page Redesigns

## 1. TOKEN DETAIL PAGE (⭐ CRITICAL)

This is THE page. Make it amazing.

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  HEADER (Fixed)                                      │
│  [Back] TokenName $XXX  [Buy] [Sell]               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┬──────────────────────────┐         │
│  │            │                           │         │
│  │  TOKEN     │     LIVE CHART           │         │
│  │  INFO      │     (TradingView style)  │         │
│  │  CARD      │                           │         │
│  │            │                           │         │
│  │  [Image]   │                           │         │
│  │  Stats     │                           │         │
│  │  Links     │                           │         │
│  │            │                           │         │
│  └────────────┴──────────────────────────┘         │
│                                                      │
│  ┌──────────────────┬──────────────────┐           │
│  │                  │                   │           │
│  │  TRADE INTERFACE │   ACTIVITY FEED   │           │
│  │  (Buy/Sell)      │   (Live Trades)   │           │
│  │                  │                   │           │
│  └──────────────────┴──────────────────┘           │
│                                                      │
│  ┌─────────────────────────────────────┐           │
│  │  HOLDER DISTRIBUTION / STATS        │           │
│  └─────────────────────────────────────┘           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Header Component

```html
<div class="fixed top-0 left-0 right-0 z-50 bg-layer-1/80 backdrop-blur-xl border-b border-white/5">
  <div class="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
    <!-- Left: Back + Token Info -->
    <div class="flex items-center gap-4">
      <button class="p-2 hover:bg-white/5 rounded-lg transition-fast">
        <i class="pi pi-arrow-left text-gray-400"></i>
      </button>
      
      <div class="flex items-center gap-3">
        <img 
          src="{{token.image}}" 
          class="w-10 h-10 rounded-full ring-2 ring-primary-500/20"
        />
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold">{{token.name}}</h1>
            <span class="text-xs text-gray-500">${{token.symbol}}</span>
          </div>
          <div class="text-sm text-gray-400">
            Market Cap: ${{token.marketCap | number}}
          </div>
        </div>
      </div>
    </div>

    <!-- Center: Live Price (Animated) -->
    <div class="absolute left-1/2 -translate-x-1/2">
      <div class="text-center">
        <div 
          class="text-3xl font-bold font-mono transition-all duration-300"
          [class.text-success]="priceChange > 0"
          [class.text-danger]="priceChange < 0"
          [@priceUpdate]="priceUpdateTrigger">
          ${{currentPrice | number:'1.0-8'}}
        </div>
        <div class="text-sm">
          <span 
            [class.text-success]="priceChange > 0"
            [class.text-danger]="priceChange < 0">
            {{priceChange > 0 ? '+' : ''}}{{priceChange | percent:'1.2'}}
          </span>
          <span class="text-gray-500 ml-2">24h</span>
        </div>
      </div>
    </div>

    <!-- Right: Trade Buttons -->
    <div class="flex gap-2">
      <button class="px-6 py-2 bg-success hover:bg-success/80 text-white rounded-lg font-semibold transition-fast hover:scale-105 hover:shadow-glow-success">
        Buy
      </button>
      <button class="px-6 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg font-semibold transition-fast hover:scale-105 hover:shadow-glow-danger">
        Sell
      </button>
    </div>
  </div>
</div>
```

### Token Info Card

```html
<div class="sticky top-20 bg-layer-2 rounded-2xl p-6 border border-white/5">
  <!-- Token Image with Glow -->
  <div class="relative mb-6">
    <div class="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-primary-500 to-accent-500"></div>
    <img 
      src="{{token.image}}" 
      class="relative w-full aspect-square rounded-2xl object-cover ring-4 ring-primary-500/20"
    />
    
    <!-- Graduated Badge (if applicable) -->
    @if (token.graduated) {
      <div class="absolute top-4 right-4 px-3 py-1.5 bg-success/20 backdrop-blur-sm border border-success/30 rounded-full text-success text-xs font-bold">
        ✓ GRADUATED
      </div>
    }
  </div>

  <!-- Token Stats (Grid) -->
  <div class="space-y-3 mb-6">
    <!-- Price -->
    <div class="flex justify-between items-center p-3 bg-layer-3 rounded-lg">
      <span class="text-sm text-gray-400">Price</span>
      <span class="font-mono font-bold">${{token.price | number:'1.0-8'}}</span>
    </div>

    <!-- Market Cap -->
    <div class="flex justify-between items-center p-3 bg-layer-3 rounded-lg">
      <span class="text-sm text-gray-400">Market Cap</span>
      <span class="font-mono font-bold">${{token.marketCap | number}}</span>
    </div>

    <!-- 24h Volume -->
    <div class="flex justify-between items-center p-3 bg-layer-3 rounded-lg">
      <span class="text-sm text-gray-400">24h Volume</span>
      <span class="font-mono font-bold">{{token.volume24h}} SOL</span>
    </div>

    <!-- Holders -->
    <div class="flex justify-between items-center p-3 bg-layer-3 rounded-lg">
      <span class="text-sm text-gray-400">Holders</span>
      <span class="font-mono font-bold">{{token.holders | number}}</span>
    </div>

    <!-- Liquidity (if DBC) -->
    @if (!token.graduated) {
      <div class="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-400">Progress to DLMM</span>
          <span class="text-sm font-bold text-primary-400">{{token.progress}}%</span>
        </div>
        <!-- Progress Bar -->
        <div class="h-2 bg-layer-3 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
            [style.width.%]="token.progress">
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{token.currentLiquidity}} / 10 SOL
        </div>
      </div>
    }
  </div>

  <!-- Description -->
  <div class="mb-6">
    <h3 class="text-sm font-semibold text-gray-400 mb-2">About</h3>
    <p class="text-sm text-gray-300 leading-relaxed">{{token.description}}</p>
  </div>

  <!-- Links -->
  <div class="flex flex-col gap-2">
    <button class="w-full p-3 bg-layer-3 hover:bg-layer-3/80 rounded-lg text-left transition-fast flex items-center justify-between group">
      <span class="text-sm">View on Solscan</span>
      <i class="pi pi-external-link text-gray-500 group-hover:text-primary-400 transition-fast"></i>
    </button>
    <button class="w-full p-3 bg-layer-3 hover:bg-layer-3/80 rounded-lg text-left transition-fast flex items-center justify-between group">
      <span class="text-sm">Copy Address</span>
      <i class="pi pi-copy text-gray-500 group-hover:text-primary-400 transition-fast"></i>
    </button>
  </div>
</div>
```

### Live Chart Component

```html
<div class="bg-layer-2 rounded-2xl border border-white/5 p-4">
  <!-- Chart Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex gap-2">
      <button 
        *ngFor="let interval of ['5m', '15m', '1h', '4h', '1d']"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-fast"
        [class.bg-primary-500]="selectedInterval === interval"
        [class.text-white]="selectedInterval === interval"
        [class.bg-layer-3]="selectedInterval !== interval"
        [class.text-gray-400]="selectedInterval !== interval"
        [class.hover:bg-layer-3/80]="selectedInterval !== interval"
        (click)="selectInterval(interval)">
        {{interval}}
      </button>
    </div>

    <div class="flex gap-2">
      <button class="p-2 hover:bg-layer-3 rounded-lg transition-fast">
        <i class="pi pi-chart-line text-gray-400"></i>
      </button>
      <button class="p-2 hover:bg-layer-3 rounded-lg transition-fast">
        <i class="pi pi-arrows-alt text-gray-400"></i>
      </button>
    </div>
  </div>

  <!-- Chart Canvas -->
  <div class="relative h-96">
    <canvas #chartCanvas class="w-full h-full"></canvas>
    
    <!-- Loading Skeleton (while chart loads) -->
    @if (chartLoading) {
      <div class="absolute inset-0 flex items-center justify-center bg-layer-2/80 backdrop-blur-sm rounded-lg">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    }
  </div>

  <!-- Chart Stats (Below) -->
  <div class="grid grid-cols-4 gap-4 mt-4">
    <div>
      <div class="text-xs text-gray-500 mb-1">Open</div>
      <div class="text-sm font-mono font-semibold">${{chartStats.open}}</div>
    </div>
    <div>
      <div class="text-xs text-gray-500 mb-1">High</div>
      <div class="text-sm font-mono font-semibold text-success">${{chartStats.high}}</div>
    </div>
    <div>
      <div class="text-xs text-gray-500 mb-1">Low</div>
      <div class="text-sm font-mono font-semibold text-danger">${{chartStats.low}}</div>
    </div>
    <div>
      <div class="text-xs text-gray-500 mb-1">Volume</div>
      <div class="text-sm font-mono font-semibold">{{chartStats.volume}} SOL</div>
    </div>
  </div>
</div>
```

### Trade Interface

```html
<div class="bg-layer-2 rounded-2xl border border-white/5 p-6">
  <!-- Buy/Sell Tabs -->
  <div class="flex gap-2 mb-6 p-1 bg-layer-3 rounded-xl">
    <button 
      class="flex-1 py-2 rounded-lg font-semibold transition-fast"
      [class.bg-success]="tradeMode === 'buy'"
      [class.text-white]="tradeMode === 'buy'"
      [class.text-gray-400]="tradeMode !== 'buy'"
      (click)="tradeMode = 'buy'">
      Buy
    </button>
    <button 
      class="flex-1 py-2 rounded-lg font-semibold transition-fast"
      [class.bg-danger]="tradeMode === 'sell'"
      [class.text-white]="tradeMode === 'sell'"
      [class.text-gray-400]="tradeMode !== 'sell'"
      (click)="tradeMode = 'sell'">
      Sell
    </button>
  </div>

  <!-- Amount Input -->
  <div class="mb-4">
    <label class="block text-sm text-gray-400 mb-2">You Pay</label>
    <div class="relative">
      <input 
        type="number"
        [(ngModel)]="tradeAmount"
        (input)="calculateOutput()"
        placeholder="0.00"
        class="w-full bg-layer-3 border border-white/10 rounded-xl px-4 py-4 text-2xl font-mono font-bold text-white placeholder:text-gray-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-fast">
      <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <span class="text-gray-400 font-semibold">SOL</span>
      </div>
    </div>
    <!-- Quick Amount Buttons -->
    <div class="flex gap-2 mt-2">
      <button 
        *ngFor="let amount of [0.1, 0.5, 1, 5]"
        class="px-3 py-1.5 bg-layer-3 hover:bg-primary-500/20 border border-primary-500/10 rounded-lg text-sm font-medium transition-fast"
        (click)="setAmount(amount)">
        {{amount}} SOL
      </button>
    </div>
  </div>

  <!-- Output Display -->
  <div class="mb-6 p-4 bg-layer-3 rounded-xl">
    <div class="flex justify-between items-center">
      <span class="text-sm text-gray-400">You Receive</span>
      <div class="text-right">
        <div class="text-xl font-mono font-bold">
          {{outputAmount | number:'1.0-2'}}
        </div>
        <div class="text-xs text-gray-500">
          {{token.symbol}}
        </div>
      </div>
    </div>
  </div>

  <!-- Trade Details -->
  <div class="space-y-2 mb-6 text-sm">
    <div class="flex justify-between text-gray-400">
      <span>Price Impact</span>
      <span 
        [class.text-success]="priceImpact < 1"
        [class.text-warning]="priceImpact >= 1 && priceImpact < 3"
        [class.text-danger]="priceImpact >= 3">
        {{priceImpact | percent:'1.2'}}
      </span>
    </div>
    <div class="flex justify-between text-gray-400">
      <span>Trading Fee</span>
      <span>{{tradingFee | percent:'1.2'}}</span>
    </div>
    <div class="flex justify-between text-gray-400">
      <span>Slippage</span>
      <span>0.5%</span>
    </div>
  </div>

  <!-- Trade Button -->
  <button 
    [disabled]="!tradeAmount || tradeAmount <= 0"
    class="w-full py-4 rounded-xl font-bold text-lg transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
    [class.bg-success]="tradeMode === 'buy'"
    [class.hover:bg-success/80]="tradeMode === 'buy'"
    [class.bg-danger]="tradeMode === 'sell'"
    [class.hover:bg-danger/80]="tradeMode === 'sell'"
    [class.hover:scale-105]="tradeAmount > 0"
    [class.shadow-glow-success]="tradeMode === 'buy'"
    [class.shadow-glow-danger]="tradeMode === 'sell'"
    (click)="executeTrade()">
    {{tradeMode === 'buy' ? 'Buy' : 'Sell'}} {{token.symbol}}
  </button>

  <!-- Wallet Balance -->
  <div class="mt-4 text-center text-sm text-gray-400">
    Balance: {{walletBalance | number:'1.0-4'}} SOL
  </div>
</div>
```

### Activity Feed (Live Trades)

```html
<div class="bg-layer-2 rounded-2xl border border-white/5 p-4">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="font-semibold">Live Trades</h3>
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
      <span class="text-xs text-gray-500">Live</span>
    </div>
  </div>

  <!-- Trade List (Scrollable) -->
  <div class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
    @for (trade of recentTrades; track trade.signature) {
      <div 
        class="flex items-center justify-between p-3 bg-layer-3 rounded-lg transition-all duration-300 hover:bg-layer-3/80"
        [@fadeIn]="'visible'"
        [class.border-success/20]="trade.type === 'buy'"
        [class.border-danger/20]="trade.type === 'sell'"
        [class.border-l-4]="true">
        
        <!-- Left: User + Action -->
        <div class="flex items-center gap-3">
          <div 
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            [class.bg-success/20]="trade.type === 'buy'"
            [class.text-success]="trade.type === 'buy'"
            [class.bg-danger/20]="trade.type === 'sell'"
            [class.text-danger]="trade.type === 'sell'">
            {{trade.type === 'buy' ? 'B' : 'S'}}
          </div>
          <div>
            <div class="text-sm font-medium">
              {{trade.trader | slice:0:4}}...{{trade.trader | slice:-4}}
            </div>
            <div class="text-xs text-gray-500">
              {{trade.timestamp | timeAgo}}
            </div>
          </div>
        </div>

        <!-- Right: Amount + Value -->
        <div class="text-right">
          <div class="text-sm font-mono font-bold">
            {{trade.amount | number:'1.0-2'}} {{token.symbol}}
          </div>
          <div class="text-xs text-gray-500">
            {{trade.value | number:'1.0-4'}} SOL
          </div>
        </div>
      </div>
    }
  </div>

  <!-- View All Link -->
  <button class="w-full mt-4 py-2 text-sm text-primary-400 hover:text-primary-300 transition-fast">
    View all trades →
  </button>
</div>
```

### WebSocket Animations for Token Page

```typescript
// In component.ts
animations: [
  // Price update flash
  trigger('priceUpdate', [
    transition('* => *', [
      style({ 
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        scale: 1.05 
      }),
      animate('300ms ease-out', style({ 
        backgroundColor: 'transparent',
        scale: 1 
      }))
    ])
  ]),

  // New trade fade in
  trigger('fadeIn', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(-10px)' }),
      animate('200ms ease-out', style({ 
        opacity: 1, 
        transform: 'translateY(0)' 
      }))
    ])
  ]),

  // Trade notification popup
  trigger('tradeNotification', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateX(100%) scale(0.8)' 
      }),
      animate('300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', 
        style({ 
          opacity: 1, 
          transform: 'translateX(0) scale(1)' 
        })
      )
    ]),
    transition(':leave', [
      animate('200ms ease-in', 
        style({ 
          opacity: 0, 
          transform: 'translateX(100%) scale(0.8)' 
        })
      )
    ])
  ])
]

// WebSocket handlers
this.wsService.onTrade$.subscribe(trade => {
  // Add to feed with animation
  this.recentTrades.unshift(trade);
  
  // Show toast notification
  this.showTradeNotification(trade);
  
  // Update price with flash animation
  this.updatePrice(trade.price);
  
  // Play sound effect (optional)
  if (trade.value > 1) { // Significant trade
    this.playSound('trade-alert');
  }
});

this.wsService.onPriceUpdate$.subscribe(price => {
  // Trigger price animation
  this.priceUpdateTrigger = Date.now();
  this.currentPrice = price;
  
  // Update chart in real-time
  this.updateChart(price);
});
```

---

## 2. WALLET / DASHBOARD PAGE

Modern, clean portfolio view.

### Layout

```
┌─────────────────────────────────────────┐
│  PROFILE HEADER                         │
│  [Avatar] 0x1234...5678                 │
│  Total Value: $XXX                      │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────┬──────────────────┐ │
│  │ PORTFOLIO      │  P&L CHART       │ │
│  │ STATS          │                  │ │
│  │ (Cards)        │                  │ │
│  └────────────────┴──────────────────┘ │
│                                          │
│  ┌───────────────────────────────────┐ │
│  │  HOLDINGS (Table with Live Data)  │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌───────────────────────────────────┐ │
│  │  RECENT ACTIVITY (Transactions)   │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌───────────────────────────────────┐ │
│  │  TOKENS CREATED (If any)          │ │
│  └───────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

### Profile Header

```html
<div class="relative overflow-hidden mb-8">
  <!-- Background Gradient -->
  <div class="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-accent-500/20"></div>
  
  <div class="relative bg-layer-2 rounded-2xl border border-white/5 p-8">
    <div class="flex items-start justify-between">
      <!-- Left: Avatar + Info -->
      <div class="flex items-center gap-6">
        <!-- Avatar with Glow -->
        <div class="relative">
          <div class="absolute inset-0 blur-2xl bg-gradient-to-br from-primary-500 to-accent-500 opacity-30"></div>
          <div class="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-1">
            <div class="w-full h-full rounded-xl bg-layer-3 flex items-center justify-center text-3xl font-bold">
              {{wallet.address | slice:0:2}}
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-2xl font-bold">{{wallet.address | slice:0:6}}...{{wallet.address | slice:-4}}</h1>
            <button class="p-2 hover:bg-white/5 rounded-lg transition-fast" (click)="copyAddress()">
              <i class="pi pi-copy text-gray-400"></i>
            </button>
          </div>
          
          <div class="flex items-center gap-4 text-sm text-gray-400">
            <div class="flex items-center gap-2">
              <i class="pi pi-wallet"></i>
              <span>{{wallet.solBalance | number:'1.0-4'}} SOL</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-chart-line"></i>
              <span>{{wallet.tokenCount}} Tokens</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-clock"></i>
              <span>Member since {{wallet.createdAt | date:'MMM yyyy'}}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Total Portfolio Value -->
      <div class="text-right">
        <div class="text-sm text-gray-400 mb-1">Total Portfolio Value</div>
        <div class="text-4xl font-bold font-mono mb-2">
          ${{portfolioValue | number:'1.0-2'}}
        </div>
        <div class="flex items-center justify-end gap-2">
          <span 
            class="text-lg font-semibold"
            [class.text-success]="portfolioChange > 0"
            [class.text-danger]="portfolioChange < 0">
            {{portfolioChange > 0 ? '+' : ''}}{{portfolioChange | percent:'1.2'}}
          </span>
          <span class="text-sm text-gray-500">24h</span>
        </div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
      <div class="text-center">
        <div class="text-2xl font-bold font-mono text-success">
          +${{totalProfit | number:'1.0-2'}}
        </div>
        <div class="text-sm text-gray-400 mt-1">Total Profit</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold font-mono">
          {{totalTrades | number}}
        </div>
        <div class="text-sm text-gray-400 mt-1">Total Trades</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold font-mono text-primary-400">
          {{winRate | percent:'1.0'}}
        </div>
        <div class="text-sm text-gray-400 mt-1">Win Rate</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold font-mono text-accent-500">
          ${{feesEarned | number:'1.0-2'}}
        </div>
        <div class="text-sm text-gray-400 mt-1">Fees Earned</div>
      </div>
    </div>
  </div>
</div>
```

### Holdings Table

```html
<div class="bg-layer-2 rounded-2xl border border-white/5 p-6">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-bold">Your Holdings</h2>
    <div class="flex gap-2">
      <button 
        *ngFor="let filter of ['all', 'profitable', 'losing']"
        class="px-3 py-1.5 rounded-lg text-sm transition-fast"
        [class.bg-primary-500]="holdingsFilter === filter"
        [class.text-white]="holdingsFilter === filter"
        [class.bg-layer-3]="holdingsFilter !== filter"
        [class.text-gray-400]="holdingsFilter !== filter"
        (click)="holdingsFilter = filter">
        {{filter | titlecase}}
      </button>
    </div>
  </div>

  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead class="border-b border-white/5">
        <tr class="text-left text-sm text-gray-400">
          <th class="pb-3 font-medium">Token</th>
          <th class="pb-3 font-medium">Balance</th>
          <th class="pb-3 font-medium">Value</th>
          <th class="pb-3 font-medium">Avg Buy Price</th>
          <th class="pb-3 font-medium">Current Price</th>
          <th class="pb-3 font-medium">P&L</th>
          <th class="pb-3 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (holding of filteredHoldings; track holding.tokenAddress) {
          <tr 
            class="border-b border-white/5 hover:bg-layer-3/50 transition-fast cursor-pointer"
            (click)="navigateToToken(holding.tokenAddress)"
            [@fadeIn]="'visible'">
            
            <!-- Token -->
            <td class="py-4">
              <div class="flex items-center gap-3">
                <img 
                  [src]="holding.image" 
                  class="w-10 h-10 rounded-full"
                  (error)="onImageError($event)">
                <div>
                  <div class="font-semibold">{{holding.name}}</div>
                  <div class="text-sm text-gray-500">{{holding.symbol}}</div>
                </div>
              </div>
            </td>

            <!-- Balance -->
            <td class="py-4">
              <div class="font-mono font-semibold">
                {{holding.balance | number:'1.0-2'}}
              </div>
            </td>

            <!-- Value -->
            <td class="py-4">
              <div class="font-mono font-semibold">
                ${{holding.value | number:'1.0-2'}}
              </div>
            </td>

            <!-- Avg Buy Price -->
            <td class="py-4">
              <div class="font-mono text-sm text-gray-400">
                ${{holding.avgBuyPrice | number:'1.0-8'}}
              </div>
            </td>

            <!-- Current Price (Live Update) -->
            <td class="py-4">
              <div 
                class="font-mono text-sm"
                [@priceUpdate]="holding.priceUpdateTrigger">
                ${{holding.currentPrice | number:'1.0-8'}}
              </div>
            </td>

            <!-- P&L -->
            <td class="py-4">
              <div class="flex flex-col gap-1">
                <div 
                  class="font-mono font-bold"
                  [class.text-success]="holding.pnl > 0"
                  [class.text-danger]="holding.pnl < 0">
                  {{holding.pnl > 0 ? '+' : ''}}${{holding.pnl | number:'1.0-2'}}
                </div>
                <div 
                  class="text-sm"
                  [class.text-success]="holding.pnlPercent > 0"
                  [class.text-danger]="holding.pnlPercent < 0">
                  {{holding.pnlPercent > 0 ? '+' : ''}}{{holding.pnlPercent | percent:'1.2'}}
                </div>
              </div>
            </td>

            <!-- Actions -->
            <td class="py-4">
              <button 
                class="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg text-sm font-semibold transition-fast"
                (click)="quickTrade(holding); $event.stopPropagation()">
                Trade
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

  <!-- Empty State -->
  @if (filteredHoldings.length === 0) {
    <div class="text-center py-12">
      <i class="pi pi-inbox text-6xl text-gray-600 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-400 mb-2">No Holdings</h3>
      <p class="text-gray-500 mb-6">Start trading to build your portfolio</p>
      <button 
        routerLink="/explore"
        class="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold transition-fast">
        Explore Tokens
      </button>
    </div>
  }
</div>
```

---

## 3. HOME / LANDING PAGE

Clean, bold, engaging.

### Hero Section

```html
<div class="relative overflow-hidden min-h-screen flex items-center">
  <!-- Animated Background -->
  <div class="absolute inset-0">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-3xl opacity-10 animate-blob"></div>
    <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-500 rounded-full blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
    <div class="absolute bottom-1/4 left-1/2 w-96 h-96 bg-secondary-500 rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
  </div>

  <div class="relative max-w-7xl mx-auto px-4 py-16 text-center">
    <!-- Logo -->
    <div class="mb-8 inline-block">
      <div class="text-8xl mb-4 animate-bounce-slow">🚀</div>
    </div>

    <!-- Title -->
    <h1 class="text-7xl md:text-8xl font-black mb-6">
      <span class="block mb-2">Launch Tokens</span>
      <span class="block bg-gradient-to-r from-primary-400 via-accent-500 to-secondary-400 bg-clip-text text-transparent animate-gradient">
        With AI Power
      </span>
    </h1>

    <!-- Subtitle -->
    <p class="text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
      Fair launches • Dynamic pricing • Auto-migration to DEX<br/>
      <span class="text-primary-400 font-semibold">Powered by OpenClaw 🦞</span>
    </p>

    <!-- CTA Buttons -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
      <button 
        routerLink="/create"
        class="px-10 py-5 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
        <i class="pi pi-plus-circle mr-2"></i>
        Create Token
      </button>
      <button 
        routerLink="/explore"
        class="px-10 py-5 bg-layer-2 hover:bg-layer-3 border-2 border-primary-500/30 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
        <i class="pi pi-compass mr-2"></i>
        Explore Tokens
      </button>
    </div>

    <!-- Live Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
      <div class="bg-layer-2/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div class="text-4xl font-bold font-mono text-primary-400 mb-2">
          {{stats.tokensLaunched | number}}
        </div>
        <div class="text-sm text-gray-400">Tokens Launched</div>
      </div>
      <div class="bg-layer-2/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div class="text-4xl font-bold font-mono text-success mb-2">
          {{stats.totalVolume | number}} SOL
        </div>
        <div class="text-sm text-gray-400">Total Volume</div>
      </div>
      <div class="bg-layer-2/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div class="text-4xl font-bold font-mono text-accent-500 mb-2">
          {{stats.activeTraders | number}}
        </div>
        <div class="text-sm text-gray-400">Active Traders</div>
      </div>
      <div class="bg-layer-2/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        <div class="text-4xl font-bold font-mono text-secondary-400 mb-2">
          {{stats.graduated | number}}
        </div>
        <div class="text-sm text-gray-400">Graduated</div>
      </div>
    </div>
  </div>
</div>
```

### Trending Tokens Section

```html
<div class="max-w-7xl mx-auto px-4 py-16">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h2 class="text-4xl font-bold mb-2">🔥 Trending Now</h2>
      <p class="text-gray-400">Hottest tokens in the last 24 hours</p>
    </div>
    <button 
      routerLink="/explore"
      class="px-6 py-3 bg-layer-2 hover:bg-layer-3 border border-white/5 rounded-xl font-semibold transition-fast">
      View All →
    </button>
  </div>

  <!-- Token Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    @for (token of trendingTokens; track token.address) {
      <div 
        class="group bg-layer-2 hover:bg-layer-3 border border-white/5 hover:border-primary-500/30 rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl"
        [routerLink]="['/token', token.address]"
        [@fadeIn]="'visible'">
        
        <!-- Token Image -->
        <div class="relative mb-4">
          <img 
            [src]="token.image" 
            class="w-full aspect-square rounded-xl object-cover ring-2 ring-white/5 group-hover:ring-primary-500/30 transition-all"
          />
          <!-- Rank Badge -->
          <div class="absolute top-2 left-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-sm font-bold">
            #{{token.rank}}
          </div>
        </div>

        <!-- Token Info -->
        <div class="mb-4">
          <h3 class="text-lg font-bold mb-1 truncate">{{token.name}}</h3>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-400">${{token.symbol}}</span>
            @if (token.graduated) {
              <span class="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full">✓</span>
            }
          </div>
        </div>

        <!-- Stats -->
        <div class="space-y-2 mb-4">
          <div class="flex justify-between text-sm">
            <span class="text-gray-400">Price</span>
            <span class="font-mono font-semibold">${{token.price | number:'1.0-6'}}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-400">24h Volume</span>
            <span class="font-mono font-semibold">{{token.volume24h}} SOL</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-400">24h Change</span>
            <span 
              class="font-mono font-semibold"
              [class.text-success]="token.change24h > 0"
              [class.text-danger]="token.change24h < 0">
              {{token.change24h > 0 ? '+' : ''}}{{token.change24h | percent:'1.2'}}
            </span>
          </div>
        </div>

        <!-- Trade Button -->
        <button class="w-full py-2 bg-primary-500/10 hover:bg-primary-500 border border-primary-500/30 hover:border-primary-500 rounded-lg font-semibold transition-fast group-hover:shadow-glow-primary">
          Trade Now
        </button>
      </div>
    }
  </div>
</div>
```

---

## 4. CREATE TOKEN PAGE

Simple, focused, exciting.

```html
<div class="min-h-screen flex items-center justify-center px-4 py-16">
  <div class="max-w-2xl w-full">
    <!-- Header -->
    <div class="text-center mb-12">
      <div class="text-6xl mb-4">🚀</div>
      <h1 class="text-5xl font-bold mb-4">Launch Your Token</h1>
      <p class="text-xl text-gray-400">
        Fair launch in 1 minute • No code required
      </p>
    </div>

    <!-- Form Card -->
    <div class="bg-layer-2 border border-white/5 rounded-3xl p-8">
      <form [formGroup]="tokenForm" (ngSubmit)="createToken()">
        
        <!-- Token Image Upload -->
        <div class="mb-8">
          <label class="block text-sm font-semibold text-gray-300 mb-3">Token Image</label>
          <div class="relative">
            @if (!tokenForm.value.image) {
              <label 
                for="imageUpload"
                class="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-white/10 hover:border-primary-500/50 rounded-2xl cursor-pointer transition-all hover:bg-layer-3/50">
                <i class="pi pi-cloud-upload text-6xl text-gray-500 mb-4"></i>
                <span class="text-gray-400">Click to upload image</span>
                <span class="text-sm text-gray-600 mt-2">PNG, JPG up to 2MB</span>
              </label>
            } @else {
              <div class="relative group">
                <img 
                  [src]="tokenForm.value.image" 
                  class="w-full aspect-square rounded-2xl object-cover"
                />
                <button 
                  type="button"
                  (click)="removeImage()"
                  class="absolute top-4 right-4 w-10 h-10 bg-danger/80 hover:bg-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <i class="pi pi-times text-white"></i>
                </button>
              </div>
            }
            <input 
              id="imageUpload" 
              type="file" 
              accept="image/*"
              (change)="onImageSelect($event)"
              class="hidden">
          </div>
        </div>

        <!-- Token Name -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Token Name</label>
          <input 
            formControlName="name"
            type="text"
            placeholder="My Awesome Token"
            class="w-full bg-layer-3 border border-white/10 focus:border-primary-500 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary-500/20 transition-fast">
          @if (tokenForm.get('name')?.invalid && tokenForm.get('name')?.touched) {
            <span class="text-sm text-danger mt-1">Name is required</span>
          }
        </div>

        <!-- Token Symbol -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Symbol</label>
          <input 
            formControlName="symbol"
            type="text"
            placeholder="AWESOME"
            class="w-full bg-layer-3 border border-white/10 focus:border-primary-500 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 uppercase focus:ring-2 focus:ring-primary-500/20 transition-fast"
            maxlength="10">
          @if (tokenForm.get('symbol')?.invalid && tokenForm.get('symbol')?.touched) {
            <span class="text-sm text-danger mt-1">Symbol is required</span>
          }
        </div>

        <!-- Description -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-300 mb-2">Description</label>
          <textarea 
            formControlName="description"
            placeholder="Tell the world about your token..."
            rows="4"
            class="w-full bg-layer-3 border border-white/10 focus:border-primary-500 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary-500/20 transition-fast resize-none">
          </textarea>
        </div>

        <!-- Launch Config (Collapsible) -->
        <div class="mb-8 p-4 bg-layer-3/50 border border-white/5 rounded-xl">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-primary-400"></i>
              <span class="text-sm font-semibold">Launch Configuration</span>
            </div>
            <span class="text-xs text-gray-500">Optimized for fair launch</span>
          </div>
          <div class="text-sm text-gray-400 space-y-1">
            <div>• Market Cap: $1k → $10k (bonding curve)</div>
            <div>• Migration: Automatic at 10 SOL</div>
            <div>• Trading Fee: 1% → 0.25% (24h decay)</div>
            <div>• Your Share: 50% of all fees</div>
          </div>
        </div>

        <!-- Launch Cost -->
        <div class="mb-8 p-6 bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-xl">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Launch Cost</div>
              <div class="text-3xl font-bold font-mono">0.05 SOL</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-400 mb-1">Your Balance</div>
              <div class="text-xl font-mono">{{walletBalance | number:'1.0-4'}} SOL</div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit"
          [disabled]="tokenForm.invalid || creating"
          class="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-gray-700 disabled:to-gray-800 text-white text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300">
          @if (creating) {
            <i class="pi pi-spin pi-spinner mr-2"></i>
            Creating Token...
          } @else {
            🚀 Launch Token
          }
        </button>

        <!-- Terms -->
        <p class="text-xs text-center text-gray-500 mt-4">
          By launching, you agree to our 
          <a href="/terms" class="text-primary-400 hover:underline">Terms of Service</a>
        </p>
      </form>
    </div>

    <!-- Features Below -->
    <div class="grid grid-cols-3 gap-4 mt-8">
      <div class="text-center p-4">
        <div class="text-3xl mb-2">⚡</div>
        <div class="text-sm font-semibold mb-1">Instant Launch</div>
        <div class="text-xs text-gray-500">Live in 1 second</div>
      </div>
      <div class="text-center p-4">
        <div class="text-3xl mb-2">🛡️</div>
        <div class="text-sm font-semibold mb-1">Anti-Rug</div>
        <div class="text-xs text-gray-500">Liquidity locked</div>
      </div>
      <div class="text-center p-4">
        <div class="text-3xl mb-2">💰</div>
        <div class="text-sm font-semibold mb-1">Earn Fees</div>
        <div class="text-xs text-gray-500">50% revenue share</div>
      </div>
    </div>
  </div>
</div>
```

---

## 5. EXPLORE / DISCOVER PAGE

Grid of tokens with filters.

```html
<div class="min-h-screen">
  <!-- Header with Search -->
  <div class="sticky top-0 z-40 bg-layer-1/80 backdrop-blur-xl border-b border-white/5">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center gap-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <i class="absolute left-4 top-1/2 -translate-y-1/2 pi pi-search text-gray-500"></i>
            <input 
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange($event)"
              type="text"
              placeholder="Search tokens..."
              class="w-full bg-layer-2 border border-white/10 focus:border-primary-500 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary-500/20 transition-fast">
          </div>
        </div>

        <!-- Filters -->
        <div class="flex gap-2">
          <button 
            *ngFor="let filter of ['trending', 'new', 'graduated', 'volume']"
            class="px-4 py-2 rounded-lg font-semibold transition-fast"
            [class.bg-primary-500]="activeFilter === filter"
            [class.text-white]="activeFilter === filter"
            [class.bg-layer-2]="activeFilter !== filter"
            [class.text-gray-400]="activeFilter !== filter"
            [class.hover:bg-layer-3]="activeFilter !== filter"
            (click)="activeFilter = filter">
            {{filter | titlecase}}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Token Grid -->
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      @for (token of filteredTokens; track token.address) {
        <app-token-card [token]="token"></app-token-card>
      }
    </div>

    <!-- Load More -->
    @if (hasMore) {
      <div class="flex justify-center mt-12">
        <button 
          (click)="loadMore()"
          class="px-8 py-3 bg-layer-2 hover:bg-layer-3 border border-white/5 rounded-xl font-semibold transition-fast">
          Load More
        </button>
      </div>
    }
  </div>
</div>
```

---

## 🎬 WebSocket Animations

### Global Notification System

```html
<!-- In app.component.ts template -->
<div class="fixed top-4 right-4 z-50 space-y-2">
  @for (notification of notifications; track notification.id) {
    <div 
      class="bg-layer-2 border rounded-xl p-4 shadow-2xl max-w-sm"
      [@tradeNotification]
      [class.border-success/30]="notification.type === 'buy'"
      [class.border-danger/30]="notification.type === 'sell'">
      <div class="flex items-start gap-3">
        <div 
          class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          [class.bg-success/20]="notification.type === 'buy'"
          [class.text-success]="notification.type === 'buy'"
          [class.bg-danger/20]="notification.type === 'sell'"
          [class.text-danger]="notification.type === 'sell'">
          {{notification.type === 'buy' ? '📈' : '📉'}}
        </div>
        <div class="flex-1">
          <div class="text-sm font-semibold mb-1">
            New {{notification.type | titlecase}}!
          </div>
          <div class="text-xs text-gray-400">
            {{notification.amount}} {{notification.symbol}} for {{notification.value}} SOL
          </div>
        </div>
        <button 
          (click)="dismissNotification(notification.id)"
          class="text-gray-500 hover:text-white transition-fast">
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>
  }
</div>
```

### Price Flash Effect

```typescript
// When price updates via WebSocket
onPriceUpdate(newPrice: number) {
  const oldPrice = this.currentPrice;
  this.currentPrice = newPrice;
  
  // Trigger flash animation
  this.priceFlashClass = newPrice > oldPrice ? 'flash-green' : 'flash-red';
  
  // Remove class after animation
  setTimeout(() => {
    this.priceFlashClass = '';
  }, 500);
}
```

```css
/* In styles.css */
@keyframes flash-green {
  0% { background-color: rgba(16, 185, 129, 0); }
  50% { background-color: rgba(16, 185, 129, 0.2); }
  100% { background-color: rgba(16, 185, 129, 0); }
}

@keyframes flash-red {
  0% { background-color: rgba(239, 68, 68, 0); }
  50% { background-color: rgba(239, 68, 68, 0.2); }
  100% { background-color: rgba(239, 68, 68, 0); }
}

.flash-green {
  animation: flash-green 500ms ease-out;
}

.flash-red {
  animation: flash-red 500ms ease-out;
}
```

### Live Activity Feed Updates

```typescript
// In token-detail.component.ts
ngOnInit() {
  // Subscribe to WebSocket trade events
  this.wsService.tradeEvents$
    .pipe(
      filter(trade => trade.tokenAddress === this.tokenAddress),
      takeUntil(this.destroy$)
    )
    .subscribe(trade => {
      // Add to beginning of array with animation
      this.recentTrades.unshift(trade);
      
      // Keep only last 50 trades
      if (this.recentTrades.length > 50) {
        this.recentTrades.pop();
      }
      
      // Show toast notification for large trades
      if (trade.value > 1) {
        this.showLargeTradeNotification(trade);
      }
      
      // Update stats
      this.updateTokenStats(trade);
    });
}
```

---

## 📦 Component Library

### Reusable Token Card

```html
<!-- token-card.component.ts -->
<div 
  class="group bg-layer-2 hover:bg-layer-3 border border-white/5 hover:border-primary-500/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
  [routerLink]="['/token', token.address]">
  
  <!-- Image -->
  <div class="relative mb-4">
    <img 
      [src]="token.image" 
      class="w-full aspect-square rounded-xl object-cover ring-2 ring-white/5 group-hover:ring-primary-500/30 transition-all"
    />
    <!-- Live Indicator -->
    @if (token.hasRecentActivity) {
      <div class="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-success/20 backdrop-blur-sm border border-success/30 rounded-full">
        <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
        <span class="text-xs text-success font-semibold">LIVE</span>
      </div>
    }
  </div>

  <!-- Info -->
  <div class="mb-4">
    <h3 class="text-lg font-bold mb-1 truncate">{{token.name}}</h3>
    <span class="text-sm text-gray-400">${{token.symbol}}</span>
  </div>

  <!-- Stats -->
  <div class="space-y-2 mb-4">
    <div class="flex justify-between text-sm">
      <span class="text-gray-400">Price</span>
      <span class="font-mono font-semibold">${{token.price | number:'1.0-6'}}</span>
    </div>
    <div class="flex justify-between text-sm">
      <span class="text-gray-400">24h</span>
      <span 
        class="font-mono font-semibold"
        [class.text-success]="token.change24h > 0"
        [class.text-danger]="token.change24h < 0">
        {{token.change24h > 0 ? '+' : ''}}{{token.change24h | percent:'1.2'}}
      </span>
    </div>
  </div>

  <!-- Action -->
  <button class="w-full py-2 bg-primary-500/10 hover:bg-primary-500 border border-primary-500/30 hover:border-primary-500 rounded-lg font-semibold transition-fast">
    Trade
  </button>
</div>
```

---

## 🎨 Global Styles

### Custom Scrollbar

```css
/* Add to styles.css */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.5);
}
```

### Gradient Animation

```css
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}
```

### Blob Animation

```css
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
```

---

## 📱 Mobile Responsive

All components should be mobile-first. Key breakpoints:

```css
/* Tailwind breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large */
2xl: 1536px /* 2X large */
```

### Mobile-Specific Adjustments

```html
<!-- Example: Token Detail Mobile -->
<div class="lg:grid lg:grid-cols-12 lg:gap-6">
  <!-- On mobile: stack vertically -->
  <!-- On desktop: 3-col grid -->
  <div class="lg:col-span-3"><!-- Info --></div>
  <div class="lg:col-span-6"><!-- Chart --></div>
  <div class="lg:col-span-3"><!-- Activity --></div>
</div>
```

---

## 🚀 Performance Optimizations

### Lazy Loading

```typescript
// In app.routes.ts
export const routes: Routes = [
  {
    path: 'token/:address',
    loadComponent: () => import('./features/token-detail/token-detail.component')
      .then(m => m.TokenDetailComponent)
  },
  // ... other routes
];
```

### Virtual Scrolling for Large Lists

```typescript
// For activity feeds with 1000+ items
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

<cdk-virtual-scroll-viewport itemSize="60" class="h-96">
  <div *cdkVirtualFor="let trade of recentTrades">
    <!-- Trade item -->
  </div>
</cdk-virtual-scroll-viewport>
```

### Image Optimization

```html
<!-- Use loading="lazy" and proper sizes -->
<img 
  [src]="token.image" 
  loading="lazy"
  [srcset]="token.imageSrcset"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  class="w-full h-full object-cover"
/>
```

---

## 🎯 Implementation Priority

1. **Phase 1 (Week 1):** Token Detail Page + WebSocket integration
2. **Phase 2 (Week 2):** Dashboard/Wallet Page + Holdings table
3. **Phase 3 (Week 3):** Home Page redesign + Trending section
4. **Phase 4 (Week 4):** Create Token Page + Explore Page
5. **Phase 5 (Week 5):** Polish, animations, mobile optimization

---

## ✅ Checklist for Each Page

- [ ] Responsive (mobile, tablet, desktop)
- [ ] WebSocket live updates with animations
- [ ] Loading states (skeletons)
- [ ] Empty states (no data)
- [ ] Error states (failed loads)
- [ ] Success states (confirmations)
- [ ] Hover effects on interactive elements
- [ ] Focus states for accessibility
- [ ] Smooth transitions (300ms default)
- [ ] OpenClaw purple theme throughout
- [ ] Consistent spacing (Tailwind scale)
- [ ] Font hierarchy (display → body → small)
- [ ] Icon consistency (PrimeNG icons)
- [ ] Performance optimized (<3s load)

---

**This redesign transforms LaunchPad into a modern, engaging, pump.fun-level platform with the OpenClaw purple aesthetic and AI-powered feel. Every interaction is smooth, fast, and visually satisfying. 🚀🍆**
