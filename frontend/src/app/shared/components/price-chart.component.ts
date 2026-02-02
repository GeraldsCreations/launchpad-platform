import { Component, Input, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <div #chartContainer class="chart"></div>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      height: 400px;
      position: relative;
    }

    .chart {
      width: 100%;
      height: 100%;
    }
  `]
})
export class PriceChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
  @Input() tokenAddress!: string;

  private chart: IChartApi | null = null;
  private series: ISeriesApi<'Candlestick'> | null = null;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initChart();
    this.loadChartData();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.remove();
    }
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    this.chart = createChart(this.chartContainer.nativeElement, {
      width: this.chartContainer.nativeElement.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      timeScale: {
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
    });

    this.series = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  private loadChartData(): void {
    if (!this.series) return;

    // Mock data - In production, fetch from API
    const mockData: CandlestickData<Time>[] = this.generateMockData();
    this.series.setData(mockData);
    this.chart?.timeScale().fitContent();
  }

  private generateMockData(): CandlestickData<Time>[] {
    const data: CandlestickData<Time>[] = [];
    const now = Math.floor(Date.now() / 1000);
    let basePrice = 0.0001;

    for (let i = 100; i >= 0; i--) {
      const time = (now - i * 3600) as Time;
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);

      data.push({
        time,
        open,
        high,
        low,
        close,
      });

      basePrice = close;
    }

    return data;
  }

  private handleResize = (): void => {
    if (this.chart && this.chartContainer) {
      this.chart.applyOptions({
        width: this.chartContainer.nativeElement.clientWidth,
      });
    }
  };

  public updatePrice(price: number): void {
    // Update chart with real-time price
    if (this.series) {
      const lastBar = {
        time: Math.floor(Date.now() / 1000) as Time,
        open: price * 0.99,
        high: price * 1.01,
        low: price * 0.98,
        close: price,
      };
      this.series.update(lastBar);
    }
  }
}
