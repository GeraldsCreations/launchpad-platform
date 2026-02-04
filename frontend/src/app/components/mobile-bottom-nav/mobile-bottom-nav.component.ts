import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MobileGestureService } from '../../core/services/mobile-gesture.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="mobile-bottom-nav" *ngIf="isMobile">
      <a 
        routerLink="/"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: true}"
        class="nav-item">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="label">Home</span>
      </a>
      
      <a 
        routerLink="/explore"
        routerLinkActive="active"
        class="nav-item">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span class="label">Explore</span>
      </a>
      
      <a 
        routerLink="/create"
        routerLinkActive="active"
        class="nav-item create-button">
        <div class="create-icon-wrapper">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span class="label">Create</span>
      </a>
      
      <a 
        routerLink="/watchlist"
        routerLinkActive="active"
        class="nav-item">
        <div class="icon-wrapper">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span class="badge" *ngIf="watchlistCount > 0">{{ watchlistCount }}</span>
        </div>
        <span class="label">Watchlist</span>
      </a>
      
      <a 
        routerLink="/analytics"
        routerLinkActive="active"
        class="nav-item">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span class="label">Analytics</span>
      </a>
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 70px;
      background: linear-gradient(to top, #1a1b1f 0%, rgba(26, 27, 31, 0.98) 100%);
      border-top: 1px solid rgba(139, 92, 246, 0.2);
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 0 8px 8px 8px;
      z-index: 1000;
      backdrop-filter: blur(12px);
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
    }

    /* Hide on desktop */
    @media (min-width: 768px) {
      .mobile-bottom-nav {
        display: none;
      }
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 12px;
      text-decoration: none;
      color: #9ca3af;
      transition: all 0.2s ease;
      border-radius: 12px;
      min-width: 60px;
      position: relative;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item:active {
      transform: scale(0.95);
    }

    .nav-item .icon {
      width: 24px;
      height: 24px;
      transition: all 0.2s ease;
    }

    .nav-item .label {
      font-size: 11px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .nav-item.active {
      color: #a78bfa;
    }

    .nav-item.active .icon {
      transform: translateY(-2px);
    }

    .nav-item.active .label {
      font-weight: 600;
    }

    /* Special styling for create button */
    .nav-item.create-button {
      position: relative;
      top: -8px;
    }

    .create-icon-wrapper {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      transition: all 0.2s ease;
    }

    .nav-item.create-button:active .create-icon-wrapper {
      transform: scale(0.95);
    }

    .nav-item.create-button .icon {
      width: 28px;
      height: 28px;
      color: white;
    }

    .nav-item.create-button.active .create-icon-wrapper {
      background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.6);
    }

    /* Watchlist badge */
    .icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .badge {
      position: absolute;
      top: -6px;
      right: -8px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    /* Add padding to body when bottom nav is visible */
    @media (max-width: 767px) {
      :host {
        display: block;
      }
    }
  `]
})
export class MobileBottomNavComponent implements OnInit, OnDestroy {
  isMobile = false;
  watchlistCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private gestureService: MobileGestureService,
    private watchlistService: WatchlistService
  ) {
    this.isMobile = this.gestureService.isMobile();
    
    // Update on resize
    window.addEventListener('resize', () => {
      this.isMobile = this.gestureService.isMobile();
    });
  }

  ngOnInit(): void {
    // Subscribe to watchlist changes
    this.watchlistService.watchlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(watchlist => {
        this.watchlistCount = watchlist.length;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
