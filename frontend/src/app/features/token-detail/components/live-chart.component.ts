import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { tokenDetailAnimations } from '../token-detail.animations';
import { Subject, takeUntil } from 'rxjs';

type Timeframe = '5m' | '15m' | '1h' | '4h' | '1d';

interface ChartStats {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Component({
  selector: 'app-live-chart',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  animations: tokenDetailAnimations,
  template: `
    <div class="live-chart-container" [@cardSlideIn]>
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Price Chart</h3>
            
            <!-- Timeframe Selector -->
            <div class="flex items-center gap-2">
              @for (tf of timeframes; track tf) {
                <button
                  (click)="selectTimeframe(tf)"
                  [class.active]="selectedTimeframe === tf"
                  class="timeframe-btn px-3 py-1.5 rounded text-sm font-medium transition-all duration-200"
                  [class.bg-primary-500]="selectedTimeframe === tf"
                  [class.text-white]="selectedTimeframe === tf"
                  [class.bg-gray-800]="selectedTimeframe !== tf"
                  [class.text-gray-400]="selectedTimeframe !== tf"
                  [class.hover:bg-gray-700]="selectedTimeframe !== tf">
                  {{ tf }}
                </button>
              }
              
              <button
                (click)="toggleFullscreen()"
                class="fullscreen-btn p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors ml-2">
                <i [class]="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i>
              </button>
            </div>
          </div>
        </ng-template>

        <!-- Chart Container -->
        <div class="chart-wrapper" [class.fullscreen]="isFullscreen">
          @if (loading) {
            <div class="loading-skeleton flex items-center justify-center" 
                 style="height: 400px;">
              <div class="text-gray-400">
                <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                <div class="text-sm">Loading chart...</div>
              </div>
            </div>
          } @else {
            <div #chartContainer class="chart-container"></div>
          }
        </div>

        <!-- Chart Stats -->
        @if (chartStats && !loading) {
          <div class="chart-stats grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-800/50 rounded-lg mt-4">
            <div>
              <div class="text-xs text-gray-400">Open</div>
              <div class="text-sm font-semibold text-white">{{ formatPrice(chartStats.open) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400">High</div>
              <div class="text-sm font-semibold text-green-500">{{ formatPrice(chartStats.high) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400">Low</div>
              <div class="text-sm font-semibold text-red-500">{{ formatPrice(chartStats.low) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400">Close</div>
              <div class="text-sm font-semibold text-white">{{ formatPrice(chartStats.close) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400">Volume</div>
              <div class="text-sm font-semibold text-primary-400">{{ formatVolume(chartStats.volume) }}</div>
            </div>
          </div>
        }

        <!-- Graduation Progress -->
        @if (!graduated && graduationPrice && currentPrice > 0) {
          <div class="graduation-progress p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg mt-4 border border-purple-500/30">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-chart-line text-purple-400"></i>
                <span class="text-sm font-semibold text-white">Bonding Curve Progress</span>
              </div>
              <span class="text-xs text-gray-400">{{ getGraduationProgress() }}% to graduation</span>
            </div>
            
            <!-- Progress Bar -->
            <div class="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                class="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                [style.width.%]="getGraduationProgress()">
              </div>
            </div>
            
            <div class="flex items-center justify-between mt-2 text-xs">
              <span class="text-gray-400">
                Current: <span class="text-white font-semibold">{{ formatPrice(currentPrice) }} SOL</span>
              </span>
              <span class="text-gray-400">
                Graduate at: <span class="text-purple-400 font-semibold">{{ formatPrice(graduationPrice) }} SOL</span>
              </span>
            </div>
            
            <div class="mt-2 text-xs text-gray-500">
              <i class="pi pi-info-circle mr-1"></i>
              Token will graduate to normal DEX pools when it reaches the graduation price
            </div>
          </div>
        }

        <!-- Graduated Badge -->
        @if (graduated) {
          <div class="graduated-badge p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg mt-4 border border-green-500/30">
            <div class="flex items-center gap-2">
              <i class="pi pi-check-circle text-green-400 text-xl"></i>
              <div>
                <div class="text-sm font-semibold text-white">Token Graduated! 🎉</div>
                <div class="text-xs text-gray-400 mt-1">Now trading on normal DEX pools</div>
              </div>
            </div>
          </div>
        }

      </p-card>
    </div>
  `,
  styles: [`
    .live-chart-container {
      height: 100%;
    }

    .chart-wrapper {
      position: relative;
      min-height: 400px;
    }

    .chart-wrapper.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      background: #0a0a0f;
      padding: 1rem;
      min-height: 100vh;
    }

    .chart-container {
      width: 100%;
      height: 400px;
    }

    .fullscreen .chart-container {
      height: calc(100vh - 200px);
    }

    .timeframe-btn.active {
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
    }

    .loading-skeleton {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 25%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.05) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @media (max-width: 768px) {
      .chart-container {
        height: 300px;
      }
    }
  `]
})
export class LiveChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef;
  @Input() tokenAddress: string = '';
  @Input() currentPrice: number = 0;
  @Input() graduationPrice: number | null = null; // Price at which token graduates to normal pools
  @Input() graduated: boolean = false;

  timeframes: Timeframe[] = ['5m', '15m', '1h', '4h', '1d'];
  selectedTimeframe: Timeframe = '1h';
  isFullscreen: boolean = false;
  loading: boolean = true;
  chartStats: ChartStats | null = null;

  private chart: IChartApi | null = null;
  private candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
  private graduationLine: ISeriesApi<'Line'> | null = null;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Component initialized
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.loadChartData();
  }

  ngOnDestroy(): void {
    this.destroyChart();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    const container = this.chartContainer.nativeElement;
    
    this.chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1a1a25' },
        horzLines: { color: '#1a1a25' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: '#2b2b43',
      },
      timeScale: {
        borderColor: '#2b2b43',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Add graduation line if token hasn't graduated yet
    if (!this.graduated && this.graduationPrice && this.graduationPrice > 0) {
      this.graduationLine = this.chart.addLineSeries({
        color: '#a855f7',
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        priceLineVisible: true,
        lastValueVisible: true,
        title: 'Graduation Price',
      });
    }

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private loadChartData(): void {
    this.loading = true;

    // Simulate loading chart data (replace with real API call)
    setTimeout(() => {
      const data = this.generateMockData();
      
      if (this.candlestickSeries && data.length > 0) {
        this.candlestickSeries.setData(data);
        
        // Add graduation line if applicable
        if (this.graduationLine && this.graduationPrice && data.length > 0) {
          const graduationData: LineData[] = data.map(candle => ({
            time: candle.time,
            value: this.graduationPrice!,
          }));
          this.graduationLine.setData(graduationData);
        }
        
        this.chart?.timeScale().fitContent();
        
        // Calculate stats from latest candle
        const latestCandle = data[data.length - 1];
        this.chartStats = {
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
          volume: Math.random() * 10000, // Mock volume
        };
      }
      
      this.loading = false;
    }, 1000);
  }

  private generateMockData(): CandlestickData[] {
    // Generate mock candlestick data (replace with real data)
    const data: CandlestickData[] = [];
    let basePrice = 0.00001234;
    const now = Math.floor(Date.now() / 1000);
    const interval = this.getIntervalSeconds(this.selectedTimeframe);
    
    for (let i = 100; i >= 0; i--) {
      const time = (now - (i * interval)) as any;
      const open = basePrice + (Math.random() - 0.5) * basePrice * 0.1;
      const close = open + (Math.random() - 0.5) * open * 0.15;
      const high = Math.max(open, close) * (1 + Math.random() * 0.05);
      const low = Math.min(open, close) * (1 - Math.random() * 0.05);
      
      data.push({ time, open, high, low, close });
      basePrice = close;
    }
    
    return data;
  }

  private getIntervalSeconds(timeframe: Timeframe): number {
    const intervals: Record<Timeframe, number> = {
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };
    return intervals[timeframe];
  }

  updatePrice(newPrice: number): void {
    if (!this.candlestickSeries) return;

    // Update the latest candle with new price
    const time = Math.floor(Date.now() / 1000) as any;
    
    // In a real implementation, you'd update the existing candle
    // For now, we'll add a new data point
    this.candlestickSeries.update({
      time,
      open: newPrice * 0.999,
      high: newPrice * 1.002,
      low: newPrice * 0.998,
      close: newPrice,
    });
  }

  selectTimeframe(timeframe: Timeframe): void {
    this.selectedTimeframe = timeframe;
    this.loadChartData();
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    // Resize chart after fullscreen toggle
    setTimeout(() => {
      this.handleResize();
    }, 100);
  }

  private handleResize(): void {
    if (!this.chart || !this.chartContainer) return;
    
    const container = this.chartContainer.nativeElement;
    const height = this.isFullscreen ? window.innerHeight - 200 : 400;
    
    this.chart.applyOptions({
      width: container.clientWidth,
      height: height,
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  formatPrice(price: number | string | null | undefined): string {
    if (price === null || price === undefined) return '0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return '0.00';
    if (numPrice < 0.0001) return numPrice.toFixed(8);
    if (numPrice < 1) return numPrice.toFixed(6);
    return numPrice.toFixed(4);
  }

  formatVolume(volume: number | string | null | undefined): string {
    if (volume === null || volume === undefined) return '0.00';
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (isNaN(numVolume) || numVolume === 0) return '0.00';
    if (numVolume >= 1000000) {
      return `${(numVolume / 1000000).toFixed(2)}M`;
    } else if (numVolume >= 1000) {
      return `${(numVolume / 1000).toFixed(2)}K`;
    }
    return numVolume.toFixed(2);
  }

  getGraduationProgress(): number {
    if (!this.graduationPrice || this.graduationPrice === 0 || this.currentPrice === 0) {
      return 0;
    }
    const progress = (this.currentPrice / this.graduationPrice) * 100;
    return Math.min(Math.round(progress), 100);
  }
}
