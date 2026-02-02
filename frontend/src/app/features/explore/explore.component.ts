import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ApiService, Token } from '../../core/services/api.service';
import { TokenCardComponent } from '../../shared/components/token-card.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    DropdownModule,
    TokenCardComponent,
    ProgressSpinnerModule
  ],
  template: `
    <div class="explore-container max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold mb-8">🔍 Explore Tokens</h1>

      <div class="bg-gray-900 rounded-lg p-6 mb-6">
        <div class="flex gap-4 flex-wrap">
          <div class="flex-1 min-w-[300px]">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <input 
                pInputText
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
                placeholder="Search tokens..."
                class="w-full">
            </span>
          </div>
          
          <p-dropdown 
            [(ngModel)]="sortBy"
            [options]="sortOptions"
            (ngModelChange)="onFilterChange()"
            placeholder="Sort By"
            styleClass="min-w-[150px]">
          </p-dropdown>

          <p-button 
            icon="pi pi-refresh"
            (onClick)="loadTokens()"
            [loading]="loading"
            styleClass="p-button-outlined">
          </p-button>
        </div>
      </div>

      @if (loading) {
        <div class="flex justify-center py-12">
          <p-progressSpinner></p-progressSpinner>
        </div>
      } @else if (tokens.length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (token of tokens; track token.address) {
            <app-token-card [token]="token"></app-token-card>
          }
        </div>
      } @else {
        <div class="text-center py-12 text-gray-400">
          <i class="pi pi-inbox text-4xl mb-4"></i>
          <p>No tokens found</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .explore-container {
      min-height: calc(100vh - 80px);
    }
  `]
})
export class ExploreComponent implements OnInit {
  searchQuery = '';
  sortBy = 'market_cap';
  sortOptions = [
    { label: 'Market Cap', value: 'market_cap' },
    { label: 'Volume', value: 'volume_24h' },
    { label: 'Holders', value: 'holder_count' },
    { label: 'Created Date', value: 'created_at' }
  ];

  tokens: Token[] = [];
  loading = true;
  private searchTimeout: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadTokens();
  }

  loadTokens(): void {
    this.loading = true;
    
    if (this.searchQuery) {
      this.apiService.searchTokens(this.searchQuery).subscribe({
        next: (tokens: Token[]) => {
          this.tokens = tokens;
          this.loading = false;
        },
        error: () => this.loading = false
      });
    } else {
      // Use trending or new tokens based on sort option
      const apiCall = this.sortBy === 'created_at' 
        ? this.apiService.getNewTokens(50)
        : this.apiService.getTrendingTokens(50);
      
      apiCall.subscribe({
        next: (tokens: Token[]) => {
          this.tokens = tokens;
          this.loading = false;
        },
        error: () => this.loading = false
      });
    }
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadTokens(), 500);
  }

  onFilterChange(): void {
    this.loadTokens();
  }
}
