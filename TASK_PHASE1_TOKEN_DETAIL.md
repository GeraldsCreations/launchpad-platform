# Task: Phase 1 - Token Detail Page Implementation

**Status:** READY TO ASSIGN  
**Priority:** CRITICAL  
**Estimated Time:** 40 hours (1 week)  
**Agent:** To be assigned  
**Created:** 2026-02-03 01:10 UTC  

---

## 🎯 Mission

Build the **Token Detail Page** - the core trading interface for LaunchPad. This is the most important page in the entire platform and must be production-ready with real-time updates, smooth animations, and mobile-first design.

---

## 📋 Requirements

### What to Build (7 Components + Integration)

1. **Token Header Component** (4 hours)
   - Fixed position header with blur backdrop
   - Live price display with flash animations
   - Buy/Sell action buttons
   - Mobile: stacked layout

2. **Token Info Card** (3 hours)
   - Sticky sidebar with token stats
   - Market cap, volume, holders
   - DBC → DLMM progress bar
   - Graduated badge
   - Links (Solscan, copy address)

3. **Live Chart Component** (6 hours)
   - TradingView-style candlestick chart
   - Timeframe selector (5m, 15m, 1h, 4h, 1d)
   - Real-time price updates
   - Fullscreen mode
   - Uses lightweight-charts library

4. **Trade Interface** (5 hours)
   - Buy/Sell tabs with smooth toggle
   - Amount input (SOL) with validation
   - Output calculator (tokens)
   - Quick amount buttons (0.1, 0.5, 1, 5 SOL)
   - Price impact calculator with warnings
   - Execute trade button with loading states

5. **Activity Feed** (6 hours)
   - Live trades scrolling list
   - Real-time updates via WebSocket
   - Fade-in animation for new trades
   - Buy/Sell color indicators
   - Truncated trader addresses
   - Time ago display ("2m ago")
   - Max 50 trades in memory

6. **WebSocket Integration** (8 hours)
   - Connect to backend WebSocket
   - Subscribe to token-specific events
   - Handle: trades, price updates, stats
   - Auto-reconnect logic
   - Error handling
   - Throttle updates (max 10/sec)

7. **Animations** (4 hours)
   - Price flash animation (green/red)
   - Trade fade-in animation
   - Toast notifications
   - Button hover effects
   - Loading skeletons
   - All animations 60fps

8. **Mobile Responsive** (4 hours)
   - 3-column → single column stack
   - Enlarged touch targets (44x44px min)
   - Bottom sheet for trade interface
   - Swipe gestures
   - Test on iPhone SE, iPad, desktop

---

## 📁 Files to Create/Modify

### New Files to Create:
```
frontend/src/app/features/token-detail/
├── token-detail.component.ts          (main container - UPDATE)
├── token-detail.component.html        (layout)
├── token-detail.component.scss        (styles)
├── token-detail.animations.ts         (NEW - animations)
├── components/
│   ├── token-header.component.ts      (NEW)
│   ├── token-info-card.component.ts   (NEW)
│   ├── live-chart.component.ts        (NEW)
│   ├── trade-interface.component.ts   (NEW)
│   └── activity-feed.component.ts     (NEW)
└── services/
    └── token-websocket.service.ts     (NEW - token-specific WS)
```

### Existing Files to Use:
- `frontend/src/app/core/services/websocket.service.ts`
- `frontend/src/app/core/services/blockchain.service.ts`
- `frontend/src/app/core/services/solana-wallet.service.ts`
- `tailwind.config.js` (OpenClaw purple theme already configured)

---

## ✅ Acceptance Criteria

### Functionality
- [ ] Can view token details for any token address
- [ ] Can execute buy/sell trades
- [ ] Live price updates work in real-time
- [ ] Chart updates without flickering
- [ ] Activity feed shows new trades instantly
- [ ] All buttons and links work
- [ ] Error handling for failed trades
- [ ] Wallet connection required for trading

### Performance
- [ ] Page loads in <3 seconds
- [ ] Animations are smooth (60fps)
- [ ] No memory leaks (check DevTools)
- [ ] WebSocket doesn't overwhelm client
- [ ] Chart renders within 1 second

### Visual Design
- [ ] Matches UI_UX_REDESIGN.md spec exactly
- [ ] OpenClaw purple theme throughout
- [ ] Glassmorphism effects on cards
- [ ] Proper shadows and glows
- [ ] Beautiful loading states

### Responsive
- [ ] Works on iPhone SE (375px width)
- [ ] Works on iPad (768px width)
- [ ] Works on desktop (1920px width)
- [ ] No horizontal scroll on mobile
- [ ] Touch targets large enough (44x44px)

### Code Quality
- [ ] TypeScript strict mode compliant
- [ ] All components are standalone
- [ ] RxJS subscriptions properly managed (takeUntil)
- [ ] Error boundaries implemented
- [ ] Code is well-commented
- [ ] No console errors or warnings

### Git
- [ ] Committed after each component (8+ commits)
- [ ] Clear commit messages
- [ ] Pushed to repository when complete

---

## 🎨 Design Tokens

Use these from `tailwind.config.js`:

```css
/* Backgrounds */
bg-layer-0     /* #0a0a0f - deepest */
bg-layer-1     /* #111118 - cards */
bg-layer-2     /* #1a1a25 - elevated */

/* OpenClaw Purple */
text-primary-400   /* #c084fc - highlights */
text-primary-500   /* #a855f7 - brand */
bg-primary-500     /* #a855f7 */

/* Eggplant Accent 🍆 */
text-accent-500    /* #7c3aed */

/* Semantic */
text-success       /* #10b981 - green */
text-danger        /* #ef4444 - red */
text-warning       /* #f59e0b - orange */
```

---

## 📚 References

1. **Implementation Guide:** `/root/.openclaw/workspace/launchpad-platform/DEVELOPER_IMPLEMENTATION_GUIDE.md`
   - Complete task breakdown
   - Code examples
   - Common issues & solutions

2. **Design Spec:** `/root/.openclaw/workspace/launchpad-platform/UI_UX_REDESIGN.md`
   - Full visual design (55,000 words)
   - Component layouts
   - Animation specs

3. **Existing Code:**
   - Check `frontend/src/app/features/token-detail/` for starter code
   - Review `frontend/src/app/shared/components/` for reusable components

---

## 🔧 Dependencies to Install

```bash
cd /root/.openclaw/workspace/launchpad-platform/frontend

# Check if these are installed, install if missing:
npm install lightweight-charts
npm install @angular/cdk
npm install @angular/animations
```

---

## 🚀 Implementation Steps

### Day 1-2: Core Components
1. Read DEVELOPER_IMPLEMENTATION_GUIDE.md completely
2. Install dependencies
3. Create component files
4. Implement Token Header
5. Implement Token Info Card
6. Commit: "feat(token-detail): add header and info card"

### Day 3-4: Trading & Charts
1. Implement Live Chart Component
2. Install and configure lightweight-charts
3. Implement Trade Interface
4. Add amount validation and price impact
5. Commit: "feat(token-detail): add chart and trade interface"

### Day 4-5: Real-time Features
1. Implement Activity Feed
2. Set up WebSocket Integration
3. Connect all components to WebSocket
4. Add animations and transitions
5. Commit: "feat(token-detail): add activity feed and WebSocket"

### Day 5: Polish & Mobile
1. Make fully responsive
2. Test on mobile devices
3. Add loading skeletons
4. Fix any bugs
5. Performance testing
6. Final commit: "feat(token-detail): Phase 1 complete, mobile responsive"

---

## 🧪 Testing Checklist

Before marking complete, test:

- [ ] Load token page: `/token/SOME_ADDRESS`
- [ ] Connect wallet
- [ ] Execute a buy trade
- [ ] Execute a sell trade
- [ ] Watch real-time price updates
- [ ] Watch trades appear in feed
- [ ] Switch chart timeframes
- [ ] Resize window (test responsive)
- [ ] Test on Chrome mobile device emulator
- [ ] Check console for errors
- [ ] Check Network tab for WebSocket connection
- [ ] Verify no memory leaks (DevTools Memory profiler)

---

## 📊 Progress Tracking

Developer should update this section daily:

### Day 1 Progress
**Completed:**
- [ ] Read implementation guide
- [ ] Installed dependencies
- [ ] Created component files
- [ ] Token Header: ___% complete
- [ ] Token Info Card: ___% complete

**Blockers:** (list any)

**Screenshots:** (attach)

---

## 🎯 Success Metrics

Phase 1 is complete when:

1. ✅ All 7 components working
2. ✅ WebSocket real-time updates functional
3. ✅ Can execute real trades on Solana
4. ✅ Page is fully responsive
5. ✅ Performance targets met (<3s load, 60fps)
6. ✅ Code is clean and committed to git
7. ✅ Demo-ready for Chadizzle

---

## 🚨 Important Notes

- **Mobile-first:** Build for mobile, enhance for desktop
- **Production code only:** No mocks, no test data
- **Commit often:** After each component
- **Real Solana integration:** Use existing blockchain.service.ts
- **OpenClaw theme:** Purple everywhere 🍆
- **Performance matters:** Users expect pump.fun-level speed

---

## 📞 Questions & Support

If you get stuck:
1. Check DEVELOPER_IMPLEMENTATION_GUIDE.md
2. Review existing components in `shared/components/`
3. Ask for clarification (don't guess)
4. Reference pump.fun and gmgn.ai for UX patterns

---

**Assigned To:** [TO BE ASSIGNED]  
**Started:** [TO BE FILLED]  
**Completed:** [TO BE FILLED]  

---

## 🎉 When Complete

Report back with:
1. Link to git commits
2. Screenshots of the page (mobile + desktop)
3. Brief demo video (optional but appreciated)
4. Any challenges faced and how you solved them

**This is the foundation of LaunchPad. Make it amazing! 🚀🍆**
