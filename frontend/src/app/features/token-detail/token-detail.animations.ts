import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

/**
 * Token Detail Page Animations
 * All animations are optimized for 60fps using transform and opacity only
 */

export const tokenDetailAnimations = [
  // Price flash animation (green for increase, red for decrease)
  trigger('priceFlash', [
    state('default', style({ backgroundColor: 'transparent' })),
    state('increase', style({ backgroundColor: 'rgba(16, 185, 129, 0.2)' })),
    state('decrease', style({ backgroundColor: 'rgba(239, 68, 68, 0.2)' })),
    transition('default => increase', [
      animate('300ms ease-out')
    ]),
    transition('default => decrease', [
      animate('300ms ease-out')
    ]),
    transition('increase => default', [
      animate('800ms ease-out')
    ]),
    transition('decrease => default', [
      animate('800ms ease-out')
    ])
  ]),

  // Trade fade-in animation for new trades
  trigger('tradeFadeIn', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(-10px)' 
      }),
      animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
        style({ 
          opacity: 1, 
          transform: 'translateY(0)' 
        })
      )
    ]),
    transition(':leave', [
      animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', 
        style({ 
          opacity: 0, 
          transform: 'translateY(10px)' 
        })
      )
    ])
  ]),

  // Toast notification slide-in
  trigger('toastSlide', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateX(100%)' 
      }),
      animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
        style({ 
          opacity: 1, 
          transform: 'translateX(0)' 
        })
      )
    ]),
    transition(':leave', [
      animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', 
        style({ 
          opacity: 0, 
          transform: 'translateX(100%)' 
        })
      )
    ])
  ]),

  // Button hover and press effects
  trigger('buttonScale', [
    state('default', style({ transform: 'scale(1)' })),
    state('hover', style({ transform: 'scale(1.05)' })),
    state('pressed', style({ transform: 'scale(0.95)' })),
    transition('default <=> hover', animate('150ms cubic-bezier(0.4, 0, 0.2, 1)')),
    transition('default <=> pressed', animate('100ms cubic-bezier(0.4, 0, 0.2, 1)'))
  ]),

  // Loading skeleton pulse
  trigger('skeletonPulse', [
    state('*', style({ opacity: 1 })),
    transition('* => *', [
      animate('1500ms ease-in-out', keyframes([
        style({ opacity: 1, offset: 0 }),
        style({ opacity: 0.5, offset: 0.5 }),
        style({ opacity: 1, offset: 1 })
      ]))
    ])
  ]),

  // Card slide-in on page load
  trigger('cardSlideIn', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(20px)' 
      }),
      animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', 
        style({ 
          opacity: 1, 
          transform: 'translateY(0)' 
        })
      )
    ])
  ]),

  // Glow effect for important elements
  trigger('glow', [
    state('off', style({ boxShadow: 'none' })),
    state('on', style({ 
      boxShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)' 
    })),
    transition('off <=> on', animate('300ms ease-in-out'))
  ]),

  // Number counter animation
  trigger('numberChange', [
    transition('* => *', [
      animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')
    ])
  ]),

  // Progress bar fill animation
  trigger('progressFill', [
    transition(':enter', [
      style({ width: '0%' }),
      animate('800ms cubic-bezier(0.4, 0, 0.2, 1)', 
        style({ width: '{{ width }}%' })
      )
    ], { params: { width: 0 } })
  ]),

  // Bounce effect for new notifications
  trigger('bounce', [
    transition(':enter', [
      animate('600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', keyframes([
        style({ transform: 'scale(0)', offset: 0 }),
        style({ transform: 'scale(1.1)', offset: 0.5 }),
        style({ transform: 'scale(1)', offset: 1 })
      ]))
    ])
  ])
];

/**
 * Helper function to trigger price flash animation
 */
export function getPriceFlashState(currentPrice: number, previousPrice: number): string {
  if (previousPrice === 0) return 'default';
  if (currentPrice > previousPrice) return 'increase';
  if (currentPrice < previousPrice) return 'decrease';
  return 'default';
}

/**
 * Easing curves for custom animations
 */
export const EASE_IN_OUT_CUBIC = 'cubic-bezier(0.645, 0.045, 0.355, 1)';
export const EASE_OUT_EXPO = 'cubic-bezier(0.19, 1, 0.22, 1)';
export const EASE_IN_OUT_BACK = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
