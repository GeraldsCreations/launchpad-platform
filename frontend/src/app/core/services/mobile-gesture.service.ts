import { Injectable, NgZone } from '@angular/core';
import { fromEvent, Subject, Observable, merge } from 'rxjs';
import { map, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  deltaX: number;
  deltaY: number;
  velocity: number;
}

export interface PinchEvent {
  scale: number;
  center: { x: number; y: number };
}

export interface LongPressEvent {
  x: number;
  y: number;
  target: EventTarget | null;
}

@Injectable({
  providedIn: 'root'
})
export class MobileGestureService {
  private swipeSubject = new Subject<SwipeEvent>();
  private pinchSubject = new Subject<PinchEvent>();
  private longPressSubject = new Subject<LongPressEvent>();
  
  // Configurable thresholds
  private readonly SWIPE_THRESHOLD = 50; // minimum distance in px
  private readonly SWIPE_VELOCITY_THRESHOLD = 0.3; // minimum velocity
  private readonly LONG_PRESS_DURATION = 500; // ms
  private readonly PINCH_THRESHOLD = 0.1; // minimum scale change

  constructor(private ngZone: NgZone) {}

  /**
   * Set up swipe detection on an element
   */
  detectSwipe(element: HTMLElement): Observable<SwipeEvent> {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const touchStart$ = fromEvent<TouchEvent>(element, 'touchstart', { passive: true });
    const touchEnd$ = fromEvent<TouchEvent>(element, 'touchend', { passive: true });

    return this.ngZone.runOutsideAngular(() => {
      return merge(
        touchStart$.pipe(
          map(e => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            return null;
          }),
          filter(v => v !== null)
        ),
        touchEnd$.pipe(
          map(e => {
            const touch = e.changedTouches[0];
            const endX = touch.clientX;
            const endY = touch.clientY;
            const endTime = Date.now();

            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const duration = endTime - startTime;
            const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / duration;

            // Determine direction based on larger delta
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX < this.SWIPE_THRESHOLD && absY < this.SWIPE_THRESHOLD) {
              return null;
            }

            if (velocity < this.SWIPE_VELOCITY_THRESHOLD) {
              return null;
            }

            let direction: 'left' | 'right' | 'up' | 'down';
            if (absX > absY) {
              direction = deltaX > 0 ? 'right' : 'left';
            } else {
              direction = deltaY > 0 ? 'down' : 'up';
            }

            return { direction, deltaX, deltaY, velocity };
          }),
          filter((event): event is SwipeEvent => event !== null)
        )
      );
    });
  }

  /**
   * Set up pinch-to-zoom detection on an element
   */
  detectPinch(element: HTMLElement): Observable<PinchEvent> {
    let initialDistance = 0;
    let initialScale = 1;

    const touchStart$ = fromEvent<TouchEvent>(element, 'touchstart', { passive: true });
    const touchMove$ = fromEvent<TouchEvent>(element, 'touchmove', { passive: false });

    return this.ngZone.runOutsideAngular(() => {
      return merge(
        touchStart$.pipe(
          map(e => {
            if (e.touches.length === 2) {
              initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            }
            return null;
          }),
          filter(v => v !== null)
        ),
        touchMove$.pipe(
          filter(e => e.touches.length === 2),
          map(e => {
            const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
            const scale = currentDistance / initialDistance;
            
            if (Math.abs(scale - initialScale) < this.PINCH_THRESHOLD) {
              return null;
            }

            initialScale = scale;

            const center = {
              x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
              y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };

            return { scale, center };
          }),
          filter((event): event is PinchEvent => event !== null)
        )
      );
    });
  }

  /**
   * Set up long-press detection on an element
   */
  detectLongPress(element: HTMLElement): Observable<LongPressEvent> {
    let pressTimer: any;
    let startX = 0;
    let startY = 0;
    let target: EventTarget | null = null;

    const touchStart$ = fromEvent<TouchEvent>(element, 'touchstart', { passive: true });
    const touchEnd$ = fromEvent<TouchEvent>(element, 'touchend', { passive: true });
    const touchMove$ = fromEvent<TouchEvent>(element, 'touchmove', { passive: true });

    return this.ngZone.runOutsideAngular(() => {
      return new Observable<LongPressEvent>(observer => {
        const startSubscription = touchStart$.subscribe(e => {
          const touch = e.touches[0];
          startX = touch.clientX;
          startY = touch.clientY;
          target = e.target;

          clearTimeout(pressTimer);
          pressTimer = setTimeout(() => {
            this.ngZone.run(() => {
              observer.next({ x: startX, y: startY, target });
            });
          }, this.LONG_PRESS_DURATION);
        });

        const endSubscription = touchEnd$.subscribe(() => {
          clearTimeout(pressTimer);
        });

        const moveSubscription = touchMove$.subscribe(e => {
          const touch = e.touches[0];
          const deltaX = Math.abs(touch.clientX - startX);
          const deltaY = Math.abs(touch.clientY - startY);

          // Cancel long press if user moves finger too much
          if (deltaX > 10 || deltaY > 10) {
            clearTimeout(pressTimer);
          }
        });

        return () => {
          clearTimeout(pressTimer);
          startSubscription.unsubscribe();
          endSubscription.unsubscribe();
          moveSubscription.unsubscribe();
        };
      });
    });
  }

  /**
   * Calculate distance between two touch points
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }

  /**
   * Check if device supports touch
   */
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get viewport size category
   */
  getViewportSize(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
}
