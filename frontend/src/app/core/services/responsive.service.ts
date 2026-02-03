import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ViewportState {
  width: number;
  height: number;
  size: ViewportSize;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private readonly viewportSubject = new BehaviorSubject<ViewportState>(
    this.getViewportState()
  );
  
  public viewport$ = this.viewportSubject.asObservable();

  constructor() {
    this.initResizeListener();
  }

  private initResizeListener() {
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(150),
        map(() => this.getViewportState()),
        distinctUntilChanged((prev, curr) => 
          prev.width === curr.width && 
          prev.height === curr.height
        )
      )
      .subscribe(state => {
        this.viewportSubject.next(state);
      });
  }

  private getViewportState(): ViewportState {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = this.getViewportSize(width);
    const orientation = width > height ? 'landscape' : 'portrait';
    
    return {
      width,
      height,
      size,
      orientation,
      isMobile: size === 'mobile',
      isTablet: size === 'tablet',
      isDesktop: size === 'desktop',
      isTouchDevice: this.checkTouchDevice()
    };
  }

  private getViewportSize(width: number): ViewportSize {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private checkTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }

  public getCurrentState(): ViewportState {
    return this.viewportSubject.value;
  }

  public isMobile(): boolean {
    return this.getCurrentState().isMobile;
  }

  public isTablet(): boolean {
    return this.getCurrentState().isTablet;
  }

  public isDesktop(): boolean {
    return this.getCurrentState().isDesktop;
  }

  public isTouchDevice(): boolean {
    return this.getCurrentState().isTouchDevice;
  }

  public getOrientation(): Orientation {
    return this.getCurrentState().orientation;
  }

  /**
   * Returns true if viewport is mobile or tablet
   */
  public isMobileOrTablet(): boolean {
    const state = this.getCurrentState();
    return state.isMobile || state.isTablet;
  }

  /**
   * Returns true if in landscape mode
   */
  public isLandscape(): boolean {
    return this.getOrientation() === 'landscape';
  }

  /**
   * Returns true if in portrait mode
   */
  public isPortrait(): boolean {
    return this.getOrientation() === 'portrait';
  }

  /**
   * Get breakpoint-specific value
   */
  public getBreakpointValue<T>(values: {
    mobile?: T;
    tablet?: T;
    desktop: T;
  }): T {
    const state = this.getCurrentState();
    
    if (state.isMobile && values.mobile !== undefined) {
      return values.mobile;
    }
    
    if (state.isTablet && values.tablet !== undefined) {
      return values.tablet;
    }
    
    return values.desktop;
  }
}
