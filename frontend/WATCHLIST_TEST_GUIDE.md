# Watchlist Feature - Manual Testing Guide

## ✅ Pre-Test Checklist

1. **Dev Server Running**: `ng serve --port 4200`
2. **Backend Running** (if testing with real data): Backend should be available
3. **Browser**: Open http://localhost:4200

---

## 🧪 Test Cases

### Test 1: Navigation Integration
**Steps:**
1. Open http://localhost:4200
2. Look at the main navigation menu
3. Verify "Watchlist" link is present with star icon

**Expected Result:**
- ✅ "Watchlist" menu item visible
- ✅ Icon is `pi-star`
- ✅ Link points to `/watchlist`

---

### Test 2: Empty State
**Steps:**
1. Clear localStorage: `localStorage.clear()` in console
2. Navigate to http://localhost:4200/watchlist
3. Observe the page

**Expected Result:**
- ✅ Empty state shows large star emoji (⭐)
- ✅ Message: "Your Watchlist is Empty"
- ✅ "Explore Tokens" button present
- ✅ Glassmorphism styling applied (blurred glass effect)

**Screenshot:** `watchlist-empty.png`

---

### Test 3: Add Token to Watchlist
**Steps:**
1. Navigate to home page (/)
2. Click on any token card to view detail page
3. Locate star button in token header (next to name/symbol)
4. Click the star button

**Expected Result:**
- ✅ Star button animates (scale up then down)
- ✅ Star changes from empty to filled
- ✅ Toast notification appears: "⭐ Added to Watchlist"
- ✅ Glow effect appears around filled star

**Screenshot:** `token-detail-with-star.png`

---

### Test 4: Watchlist Page with Tokens
**Steps:**
1. With token(s) in watchlist, navigate to /watchlist
2. Observe the grid layout

**Expected Result:**
- ✅ Tokens displayed in grid (300px min width cards)
- ✅ Each card shows:
  - Token image
  - Name and symbol
  - Current price
  - Market cap
  - 24h volume
  - Star button (top right)
  - Address (truncated, clickable to copy)
- ✅ Sort dropdown visible (Recently Added, Price Change, Name)
- ✅ Card count displayed: "X tokens saved"

**Screenshot:** `watchlist-with-tokens.png`

---

### Test 5: Remove from Watchlist
**Steps:**
1. On watchlist page, click star button on any token card
2. Observe the change

**Expected Result:**
- ✅ Token card remains visible momentarily
- ✅ Toast notification: "Removed from Watchlist"
- ✅ Card disappears from grid
- ✅ Token count updates

---

### Test 6: localStorage Persistence
**Steps:**
1. Add 2-3 tokens to watchlist
2. Refresh the browser (F5)
3. Navigate to /watchlist

**Expected Result:**
- ✅ All tokens still present
- ✅ Same order maintained
- ✅ Check console: `JSON.parse(localStorage.getItem('launchpad_watchlist'))`

---

### Test 7: Click Token Card Navigation
**Steps:**
1. On watchlist page, click anywhere on a token card
2. Observe navigation

**Expected Result:**
- ✅ Navigates to `/token/:address` detail page
- ✅ Star button in header shows filled state
- ✅ Can navigate back to watchlist

---

### Test 8: Sort Functionality
**Steps:**
1. On watchlist page with 3+ tokens
2. Use sort dropdown to select each option:
   - Recently Added
   - Price Change
   - Name

**Expected Result:**
- ✅ Recently Added: Maintains order tokens were added
- ✅ Price Change: Sorts by 24h change (highest first)
- ✅ Name: Alphabetical order (A-Z)

---

### Test 9: Mobile Responsive (375px)
**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone SE (375px width)
4. Navigate to /watchlist

**Expected Result:**
- ✅ Single column grid layout
- ✅ Star buttons 44x44px minimum (accessible tap target)
- ✅ Cards stack vertically
- ✅ Sort dropdown fits width
- ✅ No horizontal overflow

**Screenshot:** `watchlist-mobile.png`

---

### Test 10: Watchlist Limit (50 tokens)
**Steps:**
1. Open console
2. Run script to add 49 tokens:
```javascript
const watchlist = Array.from({length: 49}, (_, i) => 
  '1'.repeat(32) + i.toString().padStart(12, '0')
);
localStorage.setItem('launchpad_watchlist', JSON.stringify(watchlist));
location.reload();
```
3. Navigate to /watchlist
4. Try to add one more token (50th)
5. Try to add 51st token

**Expected Result:**
- ✅ 49 tokens load successfully
- ✅ Can add 50th token
- ✅ Cannot add 51st token - warning toast appears
- ✅ Message: "Watchlist limit reached (50 tokens max)"

---

### Test 11: Star Button Animation
**Steps:**
1. Navigate to any token detail page
2. Click star button slowly, observe animation
3. Click again to remove

**Expected Result:**
- ✅ On add: Star scales up to 1.3x then back to 1x (smooth)
- ✅ On remove: Star scales down to 0.8x then back to 1x
- ✅ Animation duration ~350ms total
- ✅ 60fps smooth animation (no jank)

---

### Test 12: Live Price Updates (If Backend Running)
**Steps:**
1. Add token to watchlist
2. Keep watchlist page open
3. Wait for WebSocket price updates

**Expected Result:**
- ✅ Price updates in real-time
- ✅ Market cap updates
- ✅ Volume updates
- ✅ Price change % updates and re-sorts if sorting by price change

---

### Test 13: Copy Address
**Steps:**
1. On watchlist page
2. Click the truncated address at bottom of token card
3. Check clipboard

**Expected Result:**
- ✅ Click event doesn't trigger card navigation
- ✅ Full address copied to clipboard
- ✅ Visual feedback (optional)

---

## 🎨 Visual/Design Checks

### Glassmorphism Effect
- [ ] `background: rgba(255, 255, 255, 0.05)`
- [ ] `backdrop-filter: blur(16px)`
- [ ] Subtle border: `rgba(255, 255, 255, 0.1)`

### Purple Theme
- [ ] Primary color: `#8b5cf6`
- [ ] Accent highlights on hover
- [ ] Star button purple glow when active

### Animations
- [ ] Card hover: translateY(-8px) with shadow
- [ ] Stagger animation on grid load
- [ ] Star button scale animation
- [ ] Smooth transitions (200-300ms)

---

## 🚀 Performance Checks

1. **Initial Load**
   - [ ] Watchlist page loads < 2 seconds
   - [ ] No console errors
   - [ ] No layout shift (CLS)

2. **Large Watchlists**
   - [ ] 50 tokens render smoothly
   - [ ] Scroll performance 60fps
   - [ ] No memory leaks after navigation

3. **Network**
   - [ ] Token data fetches in parallel (forkJoin)
   - [ ] Failed requests don't break the page
   - [ ] Loading spinner shows during fetch

---

## ✅ Final Acceptance Criteria

Before committing, ensure:
- [ ] All 13 test cases pass
- [ ] 3+ screenshots captured
- [ ] No console errors
- [ ] Production build succeeds: `ng build --configuration production`
- [ ] Mobile responsive (375px, 768px, 1920px)
- [ ] Glassmorphism theme matches existing pages
- [ ] Star button appears on token detail page
- [ ] Navigation link present in main menu
- [ ] localStorage persistence works across refreshes

---

## 📸 Required Screenshots

1. **watchlist-empty.png** - Empty state
2. **watchlist-with-tokens.png** - Grid with 3-5 tokens
3. **watchlist-mobile.png** - Mobile view (375px)
4. **token-detail-with-star.png** - Token page with star button
5. **sort-dropdown.png** - Sort options visible

---

## 🐛 Common Issues & Solutions

**Issue:** Star button not visible
- Check import in `token-header.component.ts`
- Verify `WatchlistButtonComponent` in imports array

**Issue:** localStorage not persisting
- Check browser privacy settings
- Verify key: `launchpad_watchlist`
- Check for JSON.parse errors in console

**Issue:** Watchlist page shows "no route"
- Verify route added to `app.routes.ts`
- Check import of `WatchlistPage`

**Issue:** Animations laggy
- Check for `will-change: transform`
- Verify GPU acceleration enabled
- Remove complex box-shadows during animation

---

## 📝 Test Results Template

```
Date: ______
Tester: ______

✅ Test 1: Navigation Integration - PASS/FAIL
✅ Test 2: Empty State - PASS/FAIL
✅ Test 3: Add Token - PASS/FAIL
✅ Test 4: Watchlist Display - PASS/FAIL
✅ Test 5: Remove Token - PASS/FAIL
✅ Test 6: Persistence - PASS/FAIL
✅ Test 7: Navigation - PASS/FAIL
✅ Test 8: Sorting - PASS/FAIL
✅ Test 9: Mobile - PASS/FAIL
✅ Test 10: Limit - PASS/FAIL
✅ Test 11: Animation - PASS/FAIL
✅ Test 12: Live Updates - PASS/FAIL
✅ Test 13: Copy Address - PASS/FAIL

OVERALL: ___/13 PASSED

Screenshots: [ ] Uploaded
Production Build: [ ] Success
Ready to Commit: [ ] YES / [ ] NO
```
