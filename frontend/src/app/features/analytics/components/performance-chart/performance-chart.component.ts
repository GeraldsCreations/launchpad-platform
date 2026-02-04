import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
  ColorType,
  LineStyle
} from 'lightweight-charts';
import { PerformanceData } from '../../../../core/services/analytics.service';

@Component({
  selector: 'app-performance-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './performance-chart.component.html',
  styleUrls: ['./performance-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  @Input() data: PerformanceData[] = [];
  @Input() timeRange: '1D' | '1W' | '1M' | 'ALL' = '1D';
  @Input() height: number = 300;

  private chart: IChartApi | null = null;
  private areaSeries: ISeriesApi<'Area'> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    const container = this.chartContainer.nativeElement;
    const width = container.clientWidth;

    // Determine if data is positive or negative overall
    const latestValue = this.data.length > 0 ? this.data[this.data.length - 1].value : 0;
    const firstValue = this.data.length > 0 ? this.data[0].value : 0;
    const isPositive = latestValue >= firstValue;

    const lineColor = isPositive ? '#10b981' : '#ef4444'; // green or red
    const topColor = isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bottomColor = isPositive ? 'rgba(16, 185, 129, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    this.chart = createChart(container, {
      width,
      height: this.height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af'
      },
      grid: {
        vertLines: { color: 'rgba(139, 92, 246, 0.1)' },
        horzLines: { color: 'rgba(139, 92, 246, 0.1)' }
      },
      rightPriceScale: {
        borderColor: 'rgba(139, 92, 246, 0.2)',
        visible: true
      },
      timeScale: {
        borderColor: 'rgba(139, 92, 246, 0.2)',
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: {
          color: '#8b5cf6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#8b5cf6'
        },
        horzLine: {
          color: '#8b5cf6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#8b5cf6'
        }
      }
    });

    this.areaSeries = this.chart.addAreaSeries({
      topColor,
      bottomColor,
      lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01
      }
    });

    this.updateChartData();
  }

  private updateChartData(): void {
    if (!this.areaSeries || !this.data || this.data.length === 0) {
      return;
    }

    const chartData: LineData[] = this.data.map(point => ({
      time: Math.floor(point.timestamp / 1000) as UTCTimestamp,
      value: point.value
    }));

    this.areaSeries.setData(chartData);

    // Fit content
    if (this.chart) {
      this.chart.timeScale().fitContent();
    }
  }

  private setupResizeObserver(): void {
    if (!this.chartContainer) return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (this.chart) {
          this.chart.applyOptions({ width });
        }
      }
    });

    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  private destroyChart(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }

    this.areaSeries = null;
  }

  // Public method to update data externally
  updateData(data: PerformanceData[]): void {
    this.data = data;
    if (this.chart && this.areaSeries) {
      this.updateChartData();
    }
  }
}
