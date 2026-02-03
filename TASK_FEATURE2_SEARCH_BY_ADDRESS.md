# Task: Feature 2 - Search by Address

**Status:** ASSIGNED TO DEVELOPER  
**Priority:** HIGH  
**Estimated Time:** 20-30 minutes  
**Agent:** dev-feature-2-search  
**Created:** 2026-02-03 01:47 UTC  

---

## 🎯 Mission

Build a **Global Search by Address** feature that allows users to instantly navigate to any token's detail page by pasting its Solana contract address.

**Why this matters:**
- Power users copy/paste token addresses constantly
- Instant navigation = better UX
- Differentiator from competitors
- Enables quick token lookup without browsing

---

## 📋 Requirements

### What to Build (3 Components)

1. **Search Bar Component** (10 minutes)
   - Global search input (top navigation bar)
   - Placeholder: "Search by token address..."
   - Debounced input (300ms)
   - Solana address validation (44 chars, base58)
   - Clear button when input has value
   - Mobile: Full-width on small screens

2. **Search Service** (5 minutes)
   - Validate Solana address format
   - Navigate to token detail page on valid address
   - Store recent searches in localStorage (max 5)
   - Emit validation errors

3. **Recent Searches Dropdown** (10 minutes)
   - Show last 5 searched addresses
   - Click to navigate
   - Clear all button
   - Fade-in animation
   - Hide when empty

4. **Integration** (5 minutes)
   - Add search bar to main navigation
   - Wire up routing
   - Test on desktop + mobile

---

## 📁 Files to Create/Modify

### New Files to Create:
```
frontend/src/app/shared/components/search-bar/
├── search-bar.component.ts        (NEW - main component)
├── search-bar.component.html      (NEW)
├── search-bar.component.scss      (NEW)
└── search-bar.component.spec.ts   (NEW - optional)

frontend/src/app/core/services/
└── search.service.ts              (NEW - address validation + history)
```

### Existing Files to Modify:
```
frontend/src/app/layout/
└── navigation.component.html      (ADD search bar)

frontend/src/app/app.routes.ts     (ensure /token/:address route exists)
```

---

## ✅ Acceptance Criteria

### Functionality
- [ ] Can paste a Solana address and press Enter
- [ ] Navigates to token detail page on valid address
- [ ] Shows error toast on invalid address
- [ ] Recent searches are saved (localStorage)
- [ ] Recent searches dropdown works
- [ ] Clear all history button works
- [ ] Debounced input (doesn't fire on every keystroke)

### Validation
- [ ] Accepts valid Solana addresses (44 chars, base58)
- [ ] Rejects invalid addresses (shows error message)
- [ ] Handles empty input gracefully
- [ ] Handles copy/paste from clipboard

### Visual Design
- [ ] Matches OpenClaw purple theme
- [ ] Glassmorphism effect on search bar
- [ ] Smooth focus animation (glow effect)
- [ ] Error state styling (red border)
- [ ] Recent searches dropdown has proper shadow

### Responsive
- [ ] Works on mobile (full-width search on small screens)
- [ ] Works on tablet (medium-width search)
- [ ] Works on desktop (fixed-width search in nav)
- [ ] Touch targets large enough (44x44px)

### Performance
- [ ] Search executes instantly (<100ms)
- [ ] No lag when typing
- [ ] localStorage operations are fast
- [ ] No memory leaks

### Code Quality
- [ ] TypeScript strict mode compliant
- [ ] Component is standalone
- [ ] Proper RxJS usage (debounceTime, distinctUntilChanged)
- [ ] Error handling implemented
- [ ] Code is well-commented

### Testing
- [ ] Test with valid address (e.g., `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- [ ] Test with invalid address
- [ ] Test with empty input
- [ ] Test recent searches persistence (refresh page)
- [ ] Test on Chrome mobile emulator

### Git
- [ ] Clear commit message: "feat(search): add search by address feature"
- [ ] Pushed to repository

---

## 🎨 Design Specification

### Search Bar Appearance

```
┌─────────────────────────────────────────────────────────┐
│  🔍  Search by token address...                    [×]  │
└─────────────────────────────────────────────────────────┘
     ↓ (on focus + has recent searches)
┌─────────────────────────────────────────────────────────┐
│  Recent Searches                         [Clear All]    │
├─────────────────────────────────────────────────────────┤
│  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v          │
│  So11111111111111111111111111111111111111112          │
│  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA          │
└─────────────────────────────────────────────────────────┘
```

### Colors (from tailwind.config.js)
```scss
// Input background
background: rgba(26, 26, 37, 0.6); // bg-layer-2 with opacity
backdrop-filter: blur(12px);

// Border (default)
border: 1px solid rgba(168, 85, 247, 0.2); // primary-500 at 20%

// Border (focus)
border: 1px solid #a855f7; // primary-500
box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1); // focus ring

// Border (error)
border: 1px solid #ef4444; // red

// Text
color: #f3f4f6; // gray-100

// Placeholder
color: #6b7280; // gray-500

// Recent searches dropdown
background: #1a1a25; // bg-layer-2
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
```

---

## 🔧 Code Examples

### 1. Solana Address Validation

```typescript
// search.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
  private readonly STORAGE_KEY = 'launchpad_recent_searches';

  validateAddress(address: string): boolean {
    return this.ADDRESS_REGEX.test(address.trim());
  }

  saveRecentSearch(address: string): void {
    const recent = this.getRecentSearches();
    // Remove if exists, add to front
    const filtered = recent.filter(a => a !== address);
    const updated = [address, ...filtered].slice(0, 5); // max 5
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  getRecentSearches(): string[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  clearRecentSearches(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

### 2. Search Bar Component (TypeScript)

```typescript
// search-bar.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchService } from '../../core/services/search.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  searchQuery = signal('');
  showDropdown = signal(false);
  recentSearches = signal<string[]>([]);
  errorMessage = signal('');

  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private searchService: SearchService
  ) {
    // Load recent searches
    this.recentSearches.set(this.searchService.getRecentSearches());

    // Debounced search (optional - or just handle on Enter)
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      // Could add autocomplete here later
    });
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    
    if (!query) {
      this.errorMessage.set('Please enter a token address');
      return;
    }

    if (!this.searchService.validateAddress(query)) {
      this.errorMessage.set('Invalid Solana address format');
      return;
    }

    // Valid address - navigate!
    this.errorMessage.set('');
    this.searchService.saveRecentSearch(query);
    this.router.navigate(['/token', query]);
    this.searchQuery.set(''); // clear input
    this.showDropdown.set(false);
  }

  onFocus(): void {
    this.recentSearches.set(this.searchService.getRecentSearches());
    if (this.recentSearches().length > 0) {
      this.showDropdown.set(true);
    }
  }

  onBlur(): void {
    // Delay to allow click on dropdown
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  selectRecent(address: string): void {
    this.router.navigate(['/token', address]);
    this.showDropdown.set(false);
  }

  clearAll(): void {
    this.searchService.clearRecentSearches();
    this.recentSearches.set([]);
    this.showDropdown.set(false);
  }

  clearInput(): void {
    this.searchQuery.set('');
    this.errorMessage.set('');
  }
}
```

### 3. Search Bar HTML

```html
<!-- search-bar.component.html -->
<div class="search-container">
  <div class="search-input-wrapper" [class.error]="errorMessage()">
    <span class="search-icon">🔍</span>
    <input
      type="text"
      class="search-input"
      placeholder="Search by token address..."
      [(ngModel)]="searchQuery"
      (keyup.enter)="onSearch()"
      (focus)="onFocus()"
      (blur)="onBlur()"
      autocomplete="off"
    />
    @if (searchQuery()) {
      <button class="clear-btn" (click)="clearInput()">×</button>
    }
  </div>

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  @if (showDropdown() && recentSearches().length > 0) {
    <div class="recent-dropdown">
      <div class="dropdown-header">
        <span>Recent Searches</span>
        <button class="clear-all-btn" (click)="clearAll()">Clear All</button>
      </div>
      <div class="recent-list">
        @for (address of recentSearches(); track address) {
          <div class="recent-item" (click)="selectRecent(address)">
            {{ address }}
          </div>
        }
      </div>
    </div>
  }
</div>
```

### 4. Search Bar SCSS

```scss
// search-bar.component.scss
.search-container {
  position: relative;
  width: 100%;
  max-width: 500px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(26, 26, 37, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #a855f7;
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
  }

  &.error {
    border-color: #ef4444;
  }
}

.search-icon {
  margin-right: 0.5rem;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f3f4f6;
  font-size: 0.95rem;

  &::placeholder {
    color: #6b7280;
  }
}

.clear-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
  transition: color 0.2s ease;

  &:hover {
    color: #f3f4f6;
  }
}

.error-message {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.85rem;
  animation: slideDown 0.2s ease;
}

.recent-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: #1a1a25;
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: slideDown 0.2s ease;
  z-index: 1000;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(168, 85, 247, 0.1);
  font-size: 0.85rem;
  color: #9ca3af;
}

.clear-all-btn {
  background: none;
  border: none;
  color: #a855f7;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;

  &:hover {
    color: #c084fc;
  }
}

.recent-list {
  max-height: 200px;
  overflow-y: auto;
}

.recent-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: #d1d5db;
  border-bottom: 1px solid rgba(168, 85, 247, 0.05);
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(168, 85, 247, 0.1);
    color: #f3f4f6;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 🚀 Implementation Steps

### Step 1: Create Service (5 minutes)
1. Create `search.service.ts`
2. Implement address validation regex
3. Implement localStorage methods
4. Test in browser console

### Step 2: Create Component (10 minutes)
1. Create search-bar component files
2. Implement TypeScript logic
3. Implement HTML template
4. Implement SCSS styles

### Step 3: Integration (5 minutes)
1. Add search bar to navigation component
2. Test routing to token detail page
3. Verify localStorage persistence

### Step 4: Testing (5 minutes)
1. Test valid address: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)
2. Test invalid address: `invalid123`
3. Test recent searches
4. Test clear all
5. Test responsive on mobile

### Step 5: Commit & Push (2 minutes)
1. Git add all files
2. Commit: "feat(search): add search by address feature"
3. Push to repository

---

## 🧪 Testing Checklist

Before marking complete:

- [ ] Can search with valid Solana address
- [ ] Can search with invalid address (shows error)
- [ ] Recent searches dropdown appears on focus
- [ ] Can click recent search to navigate
- [ ] Can clear all recent searches
- [ ] Can clear input with × button
- [ ] Debounce works (doesn't fire on every keystroke)
- [ ] Responsive on mobile (full-width)
- [ ] No console errors
- [ ] localStorage persists after page refresh
- [ ] Navigates to correct token detail page

---

## 📊 Validation Examples

**Valid Addresses:**
```
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  (USDC)
So11111111111111111111111111111111111111112  (Wrapped SOL)
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA  (Token Program)
```

**Invalid Addresses:**
```
123456                           (too short)
EPjFWdd5AufqSSqeM2qN1xzybapC   (too short)
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1vXXXXX  (too long)
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt10  (contains 0)
```

---

## 🎯 Success Metrics

Feature 2 is complete when:

1. ✅ Search bar component created
2. ✅ Address validation working
3. ✅ Navigation to token detail working
4. ✅ Recent searches saved to localStorage
5. ✅ Dropdown UI working
6. ✅ Mobile responsive
7. ✅ Code committed and pushed
8. ✅ No console errors or warnings

---

## 🚨 Important Notes

- **Mobile-first:** Build for mobile, enhance for desktop
- **Production code only:** Real validation, no mocks
- **OpenClaw theme:** Purple everywhere 🍆
- **Fast execution:** Should feel instant
- **Error handling:** Clear error messages for users
- **ALL CODE MUST BE TESTED BEFORE COMMITTING** ⚠️

---

## 📞 Questions & Support

If you get stuck:
1. Check existing navigation component for integration
2. Review Solana address format documentation
3. Test with real token addresses
4. Ask for clarification (don't guess)

---

**Assigned To:** dev-feature-2-search  
**Started:** 2026-02-03 01:47 UTC  
**Target Completion:** 2026-02-03 02:15 UTC (28 minutes)  

---

## 🎉 When Complete

Report back with:
1. Link to git commit
2. Screenshot of search bar (desktop + mobile)
3. Confirmation that testing checklist is complete
4. Any challenges faced

**Let's ship this! 🚀🍆**
