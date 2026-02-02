import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ApiService, Token } from '../../core/services/api.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { TokenCardComponent } from '../../shared/components/token-card.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TabViewModule, ProgressSpinnerModule, TokenCardComponent],
  template: `
    <div class="home-container max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2">🚀 LaunchPad</h1>
        <p class="text-xl text-gray-400">Discover and trade the latest tokens on Solana</p>
      </div>

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
  
  loadingTrending = true;
  loadingNew = true;
  loadingGraduated = true;

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadTrendingTokens();
    this.loadNewTokens();
    this.loadGraduatedTokens();
    this.subscribeToNewTokens();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
