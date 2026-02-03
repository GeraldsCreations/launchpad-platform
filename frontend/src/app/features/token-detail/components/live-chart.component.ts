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
    <div class="live-chart-container">
      <!-- Chart Header -->
      <div class="chart-header">
        <h3 class="chart-title">Price Chart</h3>
        
        <!-- Timeframe Selector -->
        <div class="timeframe-selector">
          @for (tf of timeframes; track tf) {
            <button
              (click)="selectTimeframe(tf)"
              [class.active]="selectedTimeframe === tf"
              class="timeframe-btn">
              {{ tf }}
            </button>
          }
          
          <button
            (click)="toggleFullscreen()"
            class="fullscreen-btn">
            <i [class]="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i>
          </button>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="chart-wrapper" [class.fullscreen]="isFullscreen">
        <!-- Loading overlay -->
        <div class="loading-skeleton" *ngIf="loading">
          <i class="pi pi-spin pi-spinner"></i>
          <div class="loading-text">Loading chart...</div>
        </div>
        
        <!-- Chart always rendered, but hidden when loading -->
        <div #chartContainer class="chart-container" [class.hidden]="loading"></div>
      </div>
    </div>
  `,
  styles: [`
    .live-chart-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 400px;
      background: #0a0a0f;
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }

    .timeframe-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .timeframe-btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      background: #1a1a25;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .timeframe-btn:hover {
      background: #2a2a35;
      color: #ffffff;
    }

    .timeframe-btn.active {
      background: #8b5cf6;
      color: #ffffff;
    }

    .fullscreen-btn {
      padding: 8px;
      border-radius: 6px;
      border: none;
      background: #1a1a25;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 8px;
    }

    .fullscreen-btn:hover {
      background: #2a2a35;
      color: #ffffff;
    }

    .chart-wrapper {
      position: relative;
      flex: 1;
      min-height: 350px;
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
      height: 100%;
      min-height: 350px;
    }

    .chart-container.hidden {
      visibility: hidden;
      position: absolute;
    }

    .fullscreen .chart-container {
      height: calc(100vh - 120px);
    }

    .timeframe-btn.active {
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
    }

    .loading-skeleton {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 350px;
      color: rgba(255, 255, 255, 0.6);
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 25%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.05) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
      z-index: 10;
    }

    .loading-skeleton i {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .loading-text {
      font-size: 14px;
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
  private initRetryCount: number = 0;
  private readonly MAX_INIT_RETRIES: number = 10;

  ngOnInit(): void {
    // Component initialized
  }

  ngAfterViewInit(): void {
    // Delay to ensure DOM is fully rendered and container dimensions are set
    // Increased delay to allow CSS flexbox layout to complete
    setTimeout(() => {
      console.log('📊 ngAfterViewInit delay complete, initializing chart...');
      this.initChart();
      if (this.chart) {
        this.loadChartData();
      }
    }, 300);
  }

  ngOnDestroy(): void {
    this.destroyChart();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initChart(): void {
    if (!this.chartContainer) {
      console.error('❌ Chart container ViewChild not available. Check template.');
      return;
    }

    const container = this.chartContainer.nativeElement;
    
    if (!container) {
      console.error('❌ Chart container element is null');
      return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // If dimensions are still zero, retry after a bit
    if (containerWidth === 0 || containerHeight === 0) {
      this.initRetryCount++;
      
      if (this.initRetryCount <= this.MAX_INIT_RETRIES) {
        console.warn(`⚠️ Container dimensions are zero, retry ${this.initRetryCount}/${this.MAX_INIT_RETRIES} in 150ms...`, {
          containerWidth,
          containerHeight,
          parentHeight: container.parentElement?.clientHeight,
          parentWidth: container.parentElement?.clientWidth
        });
        setTimeout(() => this.initChart(), 150);
        return;
      } else {
        console.error('❌ Chart initialization failed after max retries. Container still has zero dimensions.');
        this.loading = false;
        return;
      }
    }
    
    const height = containerHeight > 0 ? containerHeight : 400;
    
    console.log('✅ Initializing chart:', {
      containerHeight,
      containerWidth,
      finalHeight: height
    });
    
    this.chart = createChart(container, {
      width: container.clientWidth,
      height: height,
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
    console.log('Loading chart data...');

    // Simulate loading chart data (replace with real API call)
    setTimeout(() => {
      const data = this.generateMockData();
      console.log('Generated mock data:', data.length, 'candles');
      
      if (this.candlestickSeries && data.length > 0) {
        this.candlestickSeries.setData(data);
        console.log('Chart data set successfully');
        
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
      } else {
        console.warn('Chart series not initialized or no data:', {
          hasSeries: !!this.candlestickSeries,
          dataLength: data.length
        });
      }
      
      this.loading = false;
      console.log('Chart loading complete, loading =', this.loading);
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
    const height = this.isFullscreen 
      ? window.innerHeight - 120 
      : container.clientHeight || 400;
    
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
