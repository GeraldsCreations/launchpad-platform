import { 
  Directive, 
  ElementRef, 
  EventEmitter, 
  OnInit, 
  OnDestroy, 
  Output,
  Renderer2 
} from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Output() refresh = new EventEmitter<void>();

  private startY = 0;
  private currentY = 0;
  private pulling = false;
  private refreshing = false;
  private readonly PULL_THRESHOLD = 80; // px to trigger refresh
  private readonly MAX_PULL = 120; // maximum pull distance

  private refreshIndicator?: HTMLElement;
  private touchStartListener?: () => void;
  private touchMoveListener?: () => void;
  private touchEndListener?: () => void;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.createRefreshIndicator();
    this.attachListeners();
  }

  ngOnDestroy() {
    this.detachListeners();
    if (this.refreshIndicator && this.refreshIndicator.parentNode) {
      this.refreshIndicator.parentNode.removeChild(this.refreshIndicator);
    }
  }

  private createRefreshIndicator() {
    this.refreshIndicator = this.renderer.createElement('div');
    this.renderer.addClass(this.refreshIndicator, 'pull-to-refresh-indicator');
    this.renderer.setStyle(this.refreshIndicator, 'position', 'absolute');
    this.renderer.setStyle(this.refreshIndicator, 'top', '-60px');
    this.renderer.setStyle(this.refreshIndicator, 'left', '50%');
    this.renderer.setStyle(this.refreshIndicator, 'transform', 'translateX(-50%)');
    this.renderer.setStyle(this.refreshIndicator, 'width', '40px');
    this.renderer.setStyle(this.refreshIndicator, 'height', '40px');
    this.renderer.setStyle(this.refreshIndicator, 'display', 'flex');
    this.renderer.setStyle(this.refreshIndicator, 'align-items', 'center');
    this.renderer.setStyle(this.refreshIndicator, 'justify-content', 'center');
    this.renderer.setStyle(this.refreshIndicator, 'transition', 'opacity 0.2s');
    this.renderer.setStyle(this.refreshIndicator, 'opacity', '0');
    this.refreshIndicator.innerHTML = `
      <svg class="animate-spin h-6 w-6 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    `;

    // Insert at the beginning of the element
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    this.renderer.insertBefore(
      this.el.nativeElement,
      this.refreshIndicator,
      this.el.nativeElement.firstChild
    );
  }

  private attachListeners() {
    this.touchStartListener = this.renderer.listen(
      this.el.nativeElement,
      'touchstart',
      (e: TouchEvent) => this.onTouchStart(e)
    );

    this.touchMoveListener = this.renderer.listen(
      this.el.nativeElement,
      'touchmove',
      (e: TouchEvent) => this.onTouchMove(e)
    );

    this.touchEndListener = this.renderer.listen(
      this.el.nativeElement,
      'touchend',
      () => this.onTouchEnd()
    );
  }

  private detachListeners() {
    this.touchStartListener?.();
    this.touchMoveListener?.();
    this.touchEndListener?.();
  }

  private onTouchStart(e: TouchEvent) {
    // Only trigger if at the top of the scroll container
    if (this.el.nativeElement.scrollTop === 0 && !this.refreshing) {
      this.startY = e.touches[0].clientY;
      this.pulling = true;
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.pulling || this.refreshing) return;

    this.currentY = e.touches[0].clientY;
    const pullDistance = Math.min(this.currentY - this.startY, this.MAX_PULL);

    if (pullDistance > 0) {
      e.preventDefault();
      
      // Update indicator position and opacity
      const opacity = Math.min(pullDistance / this.PULL_THRESHOLD, 1);
      if (this.refreshIndicator) {
        this.renderer.setStyle(this.refreshIndicator, 'opacity', opacity.toString());
        this.renderer.setStyle(
          this.refreshIndicator,
          'top',
          `${-60 + pullDistance / 2}px`
        );
      }
    }
  }

  private onTouchEnd() {
    if (!this.pulling || this.refreshing) return;

    const pullDistance = this.currentY - this.startY;

    if (pullDistance >= this.PULL_THRESHOLD) {
      this.triggerRefresh();
    } else {
      this.resetPull();
    }

    this.pulling = false;
  }

  private triggerRefresh() {
    this.refreshing = true;
    
    if (this.refreshIndicator) {
      this.renderer.setStyle(this.refreshIndicator, 'opacity', '1');
      this.renderer.setStyle(this.refreshIndicator, 'top', '10px');
    }

    this.refresh.emit();

    // Auto-reset after 2 seconds if not manually reset
    setTimeout(() => {
      if (this.refreshing) {
        this.completeRefresh();
      }
    }, 2000);
  }

  private resetPull() {
    if (this.refreshIndicator) {
      this.renderer.setStyle(this.refreshIndicator, 'opacity', '0');
      this.renderer.setStyle(this.refreshIndicator, 'top', '-60px');
    }
  }

  public completeRefresh() {
    this.refreshing = false;
    this.resetPull();
  }
}
