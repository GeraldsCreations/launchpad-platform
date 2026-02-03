import { Directive, ElementRef, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { MobileGestureService, LongPressEvent } from '../../core/services/mobile-gesture.service';

@Directive({
  selector: '[appLongPress]',
  standalone: true
})
export class LongPressDirective implements OnInit, OnDestroy {
  @Output() longPress = new EventEmitter<LongPressEvent>();
  
  private subscription?: Subscription;

  constructor(
    private el: ElementRef<HTMLElement>,
    private gestureService: MobileGestureService
  ) {}

  ngOnInit() {
    this.subscription = this.gestureService
      .detectLongPress(this.el.nativeElement)
      .subscribe(event => {
        this.longPress.emit(event);
        
        // Add visual feedback
        this.el.nativeElement.classList.add('long-press-active');
        setTimeout(() => {
          this.el.nativeElement.classList.remove('long-press-active');
        }, 200);
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
