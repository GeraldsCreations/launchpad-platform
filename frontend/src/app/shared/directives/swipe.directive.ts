import { Directive, ElementRef, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { MobileGestureService, SwipeEvent } from '../../core/services/mobile-gesture.service';

@Directive({
  selector: '[appSwipe]',
  standalone: true
})
export class SwipeDirective implements OnInit, OnDestroy {
  @Output() swipeLeft = new EventEmitter<SwipeEvent>();
  @Output() swipeRight = new EventEmitter<SwipeEvent>();
  @Output() swipeUp = new EventEmitter<SwipeEvent>();
  @Output() swipeDown = new EventEmitter<SwipeEvent>();
  @Output() swipe = new EventEmitter<SwipeEvent>();

  private subscription?: Subscription;

  constructor(
    private el: ElementRef<HTMLElement>,
    private gestureService: MobileGestureService
  ) {}

  ngOnInit() {
    this.subscription = this.gestureService
      .detectSwipe(this.el.nativeElement)
      .subscribe(event => {
        this.swipe.emit(event);
        
        switch (event.direction) {
          case 'left':
            this.swipeLeft.emit(event);
            break;
          case 'right':
            this.swipeRight.emit(event);
            break;
          case 'up':
            this.swipeUp.emit(event);
            break;
          case 'down':
            this.swipeDown.emit(event);
            break;
        }
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
