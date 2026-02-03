import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ApiService, Token } from '../../core/services/api.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { TokenCardComponent } from '../../shared/components/token-card.component';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    TokenCardComponent
  ],
  template: `
    <div class="min-h-screen">
      <!-- Hero Section -->
      <div class="relative overflow-hidden bg-gradient-to-b from-primary-900/20 to-transparent">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <!-- Logo & Title -->
          <div class="mb-6">
            <h1 class="text-6xl font-bold mb-4">
              <span class="bg-gradient-to-r from-primary-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Pump Bots
              </span>
            </h1>
            <p class="text-xl text-gray-400">
              Launch tokens with AI • Powered by OpenClaw 🦞
            </p>
          </div>

          <!-- Create Token CTA -->
          <div class="mb-8">
            <a routerLink="/create" class="inline-block">
              <button class="px-8 py-4 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                <i class="pi pi-plus mr-2"></i>
                Create Token
              </button>
            </a>
          </div>

          <!-- Search Bar -->
          <div class="max-w-2xl mx-auto">
            <span class="p-input-icon-left block">
              <i class="pi pi-search"></i>
              <input 
                pInputText 
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                placeholder="Search tokens..."
                class="w-full !bg-gray-800/50 !border-gray-700 !text-white placeholder:!text-gray-500 !py-3 !px-12 !rounded-xl">
            </span>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Search Results -->
        @if (searchQuery && searchResults.length > 0) {
          <div class="mb-12">
            <h2 class="text-2xl font-bold mb-6 text-white">Search Results</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (token of searchResults; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          </div>
        } @else if (searchQuery && !searching) {
          <div class="text-center py-12 mb-12">
            <i class="pi pi-search text-6xl text-gray-600 mb-4"></i>
            <p class="text-gray-400 text-lg">No tokens found</p>
          </div>
        }

        <!-- Tab Navigation -->
        <div class="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button 
            (click)="activeTab = 'trending'"
            [class]="activeTab === 'trending' ? 
              'px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold' : 
              'px-6 py-3 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-semibold transition-all'">
            🔥 Trending
          </button>
          <button 
            (click)="activeTab = 'new'"
            [class]="activeTab === 'new' ? 
              'px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold' : 
              'px-6 py-3 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-semibold transition-all'">
            ✨ New
          </button>
          <button 
            (click)="activeTab = 'graduated'"
            [class]="activeTab === 'graduated' ? 
              'px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold' : 
              'px-6 py-3 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-semibold transition-all'">
            🎓 Graduated
          </button>
        </div>

        <!-- Token Grid -->
        @if (activeTab === 'trending') {
          @if (loadingTrending) {
            <div class="flex justify-center py-20">
              <p-progressSpinner></p-progressSpinner>
            </div>
          } @else if (trendingTokens.length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (token of trendingTokens; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          } @else {
            <div class="text-center py-20">
              <div class="text-6xl mb-4">🔥</div>
              <p class="text-gray-400 text-lg">No trending tokens yet</p>
              <p class="text-gray-500 text-sm mt-2">Be the first to launch!</p>
            </div>
          }
        }

        @if (activeTab === 'new') {
          @if (loadingNew) {
            <div class="flex justify-center py-20">
              <p-progressSpinner></p-progressSpinner>
            </div>
          } @else if (newTokens.length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (token of newTokens; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          } @else {
            <div class="text-center py-20">
              <div class="text-6xl mb-4">✨</div>
              <p class="text-gray-400 text-lg">No new tokens yet</p>
              <p class="text-gray-500 text-sm mt-2">Be the first to launch!</p>
            </div>
          }
        }

        @if (activeTab === 'graduated') {
          @if (loadingGraduated) {
            <div class="flex justify-center py-20">
              <p-progressSpinner></p-progressSpinner>
            </div>
          } @else if (graduatedTokens.length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (token of graduatedTokens; track token.address) {
                <app-token-card [token]="token"></app-token-card>
              }
            </div>
          } @else {
            <div class="text-center py-20">
              <div class="text-6xl mb-4">🎓</div>
              <p class="text-gray-400 text-lg">No graduated tokens yet</p>
              <p class="text-gray-500 text-sm mt-2">Tokens graduate when they reach bonding curve completion</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: []
})
export class HomeComponent implements OnInit, OnDestroy {
  trendingTokens: Token[] = [];
  newTokens: Token[] = [];
  graduatedTokens: Token[] = [];
  searchResults: Token[] = [];
  searchQuery: string = '';
  activeTab: 'trending' | 'new' | 'graduated' = 'trending';
  
  loadingTrending = true;
  loadingNew = true;
  loadingGraduated = true;
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
    this.apiService.getGraduatedTokens(20)
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
          this.loadNewTokens();
        },
        error: (error) => {
          console.error('WebSocket error:', error);
        }
      });
  }
}
