import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ApiService, Token } from '../../core/services/api.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { TokenCardComponent } from '../../shared/components/token-card.component';
import { TokenStatsComponent, PlatformStats } from '../../shared/components/token-stats.component';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    TabViewModule, 
    ProgressSpinnerModule, 
    TokenCardComponent,
    TokenStatsComponent,
    InputTextModule,
    ButtonModule
  ],
  template: `
    <div class="home-container max-w-7xl mx-auto px-4 py-8">
      <!-- Hero Section -->
      <div class="mb-8 text-center">
        <h1 class="text-5xl font-bold mb-3 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
          🚀 Meteora LaunchPad
        </h1>
        <p class="text-xl text-gray-400 mb-6">Discover and trade the latest tokens on Solana</p>
        
        <!-- Search Bar -->
        <div class="max-w-2xl mx-auto mb-6">
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search"></i>
            <input 
              pInputText 
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Search tokens by name or symbol..."
              class="w-full"
              styleClass="w-full">
          </span>
        </div>

        <!-- Quick Actions -->
        <div class="flex gap-4 justify-center mb-8">
          <p-button 
            label="Create Token"
            icon="pi pi-plus"
            routerLink="/create"
            styleClass="p-button-success">
          </p-button>
          <p-button 
            label="View Portfolio"
            icon="pi pi-chart-bar"
            routerLink="/dashboard"
            styleClass="p-button-outlined">
          </p-button>
        </div>
      </div>

      <!-- Platform Stats -->
      <app-token-stats 
        [stats]="platformStats" 
        [loading]="loadingStats">
      </app-token-stats>

      <!-- Search Results -->
      @if (searchQuery && searchResults.length > 0) {
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Search Results</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (token of searchResults; track token.address) {
              <app-token-card [token]="token"></app-token-card>
            }
          </div>
        </div>
      } @else if (searchQuery && !searching) {
        <div class="text-center py-8 mb-8">
          <i class="pi pi-search text-4xl text-gray-500 mb-4"></i>
          <p class="text-gray-400">No tokens found matching "{{ searchQuery }}"</p>
        </div>
      }

      <!-- Tabs -->

      <p-tabView>
        <!-- Trending Tab -->
        <p-tabPanel header="🔥 Trending">
          @if (loadingTrending) {
            <div class="flex justify-center py-12">
              <p-progressSpinner></p-progressSpinner>
            </div>
          } @else if (trendingTokens.length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              @for (token of trendingTokens; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          } @else {
            <div class="text-center py-12 text-gray-400">
              <i class="pi pi-inbox text-4xl mb-4"></i>
              <p>No trending tokens yet</p>
            </div>
          }
        </p-tabPanel>

        <!-- New Tokens Tab -->
        <p-tabPanel header="✨ New">
          @if (loadingNew) {
            <div class="flex justify-center py-12">
              <p-progressSpinner></p-progressSpinner>
            </div>
          } @else if (newTokens.length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              @for (token of newTokens; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          } @else {
            <div class="text-center py-12 text-gray-400">
              <i class="pi pi-inbox text-4xl mb-4"></i>
              <p>No new tokens yet</p>
            </div>
          }
        </p-tabPanel>

        <!-- Graduated Tab -->
        <p-tabPanel header="🎓 Graduated">
          @if (loadingGraduated) {
            <div class="flex justify-center py-12">
              <p-progressSpinner></p-progressSpinner>
            </div>
          } @else if (graduatedTokens.length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              @for (token of graduatedTokens; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          } @else {
            <div class="text-center py-12 text-gray-400">
              <i class="pi pi-inbox text-4xl mb-4"></i>
              <p>No graduated tokens yet</p>
            </div>
          }
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: calc(100vh - 80px);
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  trendingTokens: Token[] = [];
  newTokens: Token[] = [];
  graduatedTokens: Token[] = [];
  searchResults: Token[] = [];
  platformStats: PlatformStats | null = null;
  searchQuery: string = '';
  
  loadingTrending = true;
  loadingNew = true;
  loadingGraduated = true;
  loadingStats = true;
  searching = false;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private apiService: ApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadTrendingTokens();
    this.loadNewTokens();
    this.loadGraduatedTokens();
    this.loadPlatformStats();
    this.subscribeToNewTokens();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query && query.length > 1) {
        this.performSearch(query);
      } else {
        this.searchResults = [];
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    this.searching = true;
    this.apiService.searchTokens(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.searchResults = tokens;
          this.searching = false;
        },
        error: (error) => {
          console.error('Search failed:', error);
          this.searching = false;
        }
      });
  }

  private loadPlatformStats(): void {
    // Mock stats for now - replace with actual API call
    setTimeout(() => {
      this.platformStats = {
        total_tokens: 1247,
        total_volume_24h: 8534,
        total_trades_24h: 3891,
        total_graduated: 42,
        active_traders_24h: 523
      };
      this.loadingStats = false;
    }, 500);
  }

  private loadTrendingTokens(): void {
    this.apiService.getTrendingTokens(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.trendingTokens = tokens;
          this.loadingTrending = false;
        },
        error: (error) => {
          console.error('Failed to load trending tokens:', error);
          this.loadingTrending = false;
        }
      });
  }

  private loadNewTokens(): void {
    this.apiService.getNewTokens(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.newTokens = tokens;
          this.loadingNew = false;
        },
        error: (error) => {
          console.error('Failed to load new tokens:', error);
          this.loadingNew = false;
        }
      });
  }

  private loadGraduatedTokens(): void {
    this.apiService.filterTokens({ graduated: true, sortBy: 'graduated_at', order: 'desc', limit: 20 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.graduatedTokens = tokens;
          this.loadingGraduated = false;
        },
        error: (error) => {
          console.error('Failed to load graduated tokens:', error);
          this.loadingGraduated = false;
        }
      });
  }

  private subscribeToNewTokens(): void {
    this.wsService.subscribeToNewTokens()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          console.log('New token created:', event);
          // Reload new tokens list
          this.loadNewTokens();
        },
        error: (error) => {
          console.error('WebSocket error:', error);
        }
      });
  }
}
