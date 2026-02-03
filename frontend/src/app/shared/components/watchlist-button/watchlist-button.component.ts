import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * WatchlistButtonComponent - Star/Unstar button for adding tokens to watchlist
 * 
 * Features:
 * - Animated star icon (empty ↔ filled)
 * - Toast notifications
 * - Mobile-friendly 44px tap target
 * - Real-time sync with watchlist service
 */
@Component({
  selector: 'app-watchlist-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './watchlist-button.component.html',
  styleUrls: ['./watchlist-button.component.scss'],
  animations: [
    // Star scale animation
    trigger('starAnimation', [
      state('inactive', style({
        transform: 'scale(1)',
      })),
      state('active', style({
        transform: 'scale(1)',
      })),
      transition('inactive => active', [
        animate('200ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({
          transform: 'scale(1.3)',
        })),
        animate('150ms ease-out', style({
          transform: 'scale(1)',
        }))
      ]),
      transition('active => inactive', [
        animate('150ms ease-in', style({
          transform: 'scale(0.8)',
        })),
        animate('150ms ease-out', style({
          transform: 'scale(1)',
        }))
      ])
    ])
  ]
})
export class WatchlistButtonComponent implements OnInit, OnDestroy {
  @Input() tokenAddress: string = '';
  @Input() tokenSymbol: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showLabel: boolean = false;

  isInWatchlist: boolean = false;
  animationState: 'active' | 'inactive' = 'inactive';

  private destroy$ = new Subject<void>();

  constructor(
    private watchlistService: WatchlistService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Initial check
    this.checkWatchlistStatus();

    // Subscribe to watchlist changes
    this.watchlistService.watchlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkWatchlistStatus();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle watchlist status
   */
  toggleWatchlist(event: Event): void {
    event.stopPropagation(); // Prevent card click when button is inside a card

    const result = this.watchlistService.toggleWatchlist(this.tokenAddress);

    // Update animation state
    this.animationState = result.isInWatchlist ? 'active' : 'inactive';

    // Show notification
    if (result.success) {
      if (result.isInWatchlist) {
        this.notificationService.success(
          '⭐ Added to Watchlist',
          this.tokenSymbol ? `${this.tokenSymbol} saved to your watchlist` : result.message,
          3000
        );
      } else {
        this.notificationService.info(
          'Removed from Watchlist',
          this.tokenSymbol ? `${this.tokenSymbol} removed from your watchlist` : result.message,
          3000
        );
      }
    } else {
      this.notificationService.warning(
        'Watchlist Action Failed',
        result.message,
        4000
      );
    }
  }

  /**
   * Check if token is in watchlist
   */
  private checkWatchlistStatus(): void {
    this.isInWatchlist = this.watchlistService.isInWatchlist(this.tokenAddress);
  }

  /**
   * Get button size classes
   */
  get sizeClasses(): string {
    switch (this.size) {
      case 'small':
        return 'w-8 h-8 text-base';
      case 'large':
        return 'w-14 h-14 text-2xl';
      case 'medium':
      default:
        return 'w-11 h-11 text-xl';
    }
  }

  /**
   * Get icon size for SVG
   */
  get iconSize(): number {
    switch (this.size) {
      case 'small':
        return 16;
      case 'large':
        return 28;
      case 'medium':
      default:
        return 20;
    }
  }
}
