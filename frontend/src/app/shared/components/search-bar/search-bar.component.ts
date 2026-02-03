import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * SearchBarComponent - Global search bar for token addresses
 * - Validates Solana addresses
 * - Shows recent searches
 * - Navigates to token detail page
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  // UI state
  searchQuery = signal('');
  showDropdown = signal(false);
  recentSearches = signal<string[]>([]);
  errorMessage = signal('');

  // Debounced search subject (for future autocomplete)
  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private searchService: SearchService
  ) {
    // Load recent searches on init
    this.loadRecentSearches();

    // Setup debounced search (currently unused, but ready for autocomplete)
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(query => {
      // Future: Could add autocomplete/suggestions here
    });
  }

  /**
   * Handle search submission (Enter key or click)
   */
  onSearch(): void {
    const query = this.searchQuery().trim();
    
    // Validate input
    if (!query) {
      this.errorMessage.set('Please enter a token address');
      return;
    }

    if (!this.searchService.validateAddress(query)) {
      this.errorMessage.set('Invalid Solana address (must be 32-44 characters, base58)');
      return;
    }

    // Valid address - navigate!
    this.errorMessage.set('');
    this.searchService.saveRecentSearch(query);
    this.navigateToToken(query);
  }

  /**
   * Handle input focus - show recent searches
   */
  onFocus(): void {
    this.loadRecentSearches();
    if (this.recentSearches().length > 0) {
      this.showDropdown.set(true);
    }
  }

  /**
   * Handle input blur - hide dropdown (with delay for clicks)
   */
  onBlur(): void {
    // Delay to allow clicking on dropdown items
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  /**
   * Select a recent search from dropdown
   */
  selectRecent(address: string): void {
    this.navigateToToken(address);
  }

  /**
   * Clear all recent searches
   */
  clearAll(): void {
    this.searchService.clearRecentSearches();
    this.recentSearches.set([]);
    this.showDropdown.set(false);
  }

  /**
   * Clear the input field
   */
  clearInput(): void {
    this.searchQuery.set('');
    this.errorMessage.set('');
  }

  /**
   * Navigate to token detail page
   */
  private navigateToToken(address: string): void {
    this.router.navigate(['/token', address]);
    this.searchQuery.set('');
    this.showDropdown.set(false);
  }

  /**
   * Load recent searches from service
   */
  private loadRecentSearches(): void {
    this.recentSearches.set(this.searchService.getRecentSearches());
  }

  /**
   * Truncate address for display (show first 8 and last 6 chars)
   */
  truncateAddress(address: string): string {
    if (address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }
}
