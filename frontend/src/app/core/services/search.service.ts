import { Injectable } from '@angular/core';

/**
 * SearchService - Handles token address search functionality
 * - Validates Solana address format
 * - Manages recent search history in localStorage
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  // Solana addresses are 32-44 characters, base58 encoded (no 0, O, I, l)
  private readonly ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  private readonly STORAGE_KEY = 'launchpad_recent_searches';
  private readonly MAX_RECENT = 5;

  /**
   * Validate if a string is a valid Solana address
   * @param address - The address to validate
   * @returns true if valid, false otherwise
   */
  validateAddress(address: string): boolean {
    if (!address) return false;
    return this.ADDRESS_REGEX.test(address.trim());
  }

  /**
   * Save a search to recent history
   * - Removes duplicates
   * - Adds to front of list
   * - Limits to MAX_RECENT entries
   * @param address - The address to save
   */
  saveRecentSearch(address: string): void {
    const trimmed = address.trim();
    if (!this.validateAddress(trimmed)) return;

    const recent = this.getRecentSearches();
    
    // Remove if already exists (to move to front)
    const filtered = recent.filter(a => a !== trimmed);
    
    // Add to front and limit to max
    const updated = [trimmed, ...filtered].slice(0, this.MAX_RECENT);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }

  /**
   * Get recent searches from localStorage
   * @returns Array of recent addresses (newest first)
   */
  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load recent searches:', error);
      return [];
    }
  }

  /**
   * Clear all recent searches
   */
  clearRecentSearches(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }
}
