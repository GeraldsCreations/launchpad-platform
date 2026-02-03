import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * WatchlistService - Manages user's watchlist of favorite tokens
 * 
 * Features:
 * - localStorage persistence
 * - Observable pattern for real-time UI updates
 * - Max 50 tokens limit
 * - Recently added order tracking
 */
@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private readonly STORAGE_KEY = 'launchpad_watchlist';
  private readonly MAX_TOKENS = 50;

  // BehaviorSubject to emit watchlist changes
  private watchlistSubject = new BehaviorSubject<string[]>(this.loadFromStorage());
  
  // Public observable for components to subscribe to
  public watchlist$ = this.watchlistSubject.asObservable();

  constructor() {
    // Initialize from localStorage
    this.watchlistSubject.next(this.loadFromStorage());
  }

  /**
   * Get current watchlist addresses
   */
  getWatchlist(): string[] {
    return this.watchlistSubject.getValue();
  }

  /**
   * Check if an address is in the watchlist
   */
  isInWatchlist(address: string): boolean {
    return this.watchlistSubject.getValue().includes(address);
  }

  /**
   * Add an address to the watchlist
   * @returns true if added, false if already exists or limit reached
   */
  addToWatchlist(address: string): { success: boolean; message: string } {
    const currentWatchlist = this.watchlistSubject.getValue();

    // Check if already exists
    if (currentWatchlist.includes(address)) {
      return { success: false, message: 'Token already in watchlist' };
    }

    // Check limit
    if (currentWatchlist.length >= this.MAX_TOKENS) {
      return { 
        success: false, 
        message: `Watchlist limit reached (${this.MAX_TOKENS} tokens max)` 
      };
    }

    // Add to beginning (most recent first)
    const updatedWatchlist = [address, ...currentWatchlist];
    this.saveToStorage(updatedWatchlist);
    this.watchlistSubject.next(updatedWatchlist);

    return { success: true, message: 'Added to watchlist' };
  }

  /**
   * Remove an address from the watchlist
   * @returns true if removed, false if not found
   */
  removeFromWatchlist(address: string): { success: boolean; message: string } {
    const currentWatchlist = this.watchlistSubject.getValue();
    
    if (!currentWatchlist.includes(address)) {
      return { success: false, message: 'Token not in watchlist' };
    }

    const updatedWatchlist = currentWatchlist.filter(addr => addr !== address);
    this.saveToStorage(updatedWatchlist);
    this.watchlistSubject.next(updatedWatchlist);

    return { success: true, message: 'Removed from watchlist' };
  }

  /**
   * Toggle watchlist status (add if not present, remove if present)
   */
  toggleWatchlist(address: string): { success: boolean; message: string; isInWatchlist: boolean } {
    const isCurrentlyInWatchlist = this.isInWatchlist(address);
    
    if (isCurrentlyInWatchlist) {
      const result = this.removeFromWatchlist(address);
      return { ...result, isInWatchlist: false };
    } else {
      const result = this.addToWatchlist(address);
      return { ...result, isInWatchlist: true };
    }
  }

  /**
   * Clear entire watchlist
   */
  clearWatchlist(): void {
    this.saveToStorage([]);
    this.watchlistSubject.next([]);
  }

  /**
   * Get watchlist count
   */
  getCount(): number {
    return this.watchlistSubject.getValue().length;
  }

  /**
   * Get count as observable
   */
  getCount$(): Observable<number> {
    return new Observable(observer => {
      const subscription = this.watchlist$.subscribe(watchlist => {
        observer.next(watchlist.length);
      });
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Load watchlist from localStorage
   */
  private loadFromStorage(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Validate all entries are strings
          return parsed.filter(item => typeof item === 'string');
        }
      }
    } catch (error) {
      console.error('Failed to load watchlist from localStorage:', error);
    }
    return [];
  }

  /**
   * Save watchlist to localStorage
   */
  private saveToStorage(watchlist: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(watchlist));
    } catch (error) {
      console.error('Failed to save watchlist to localStorage:', error);
    }
  }
}
