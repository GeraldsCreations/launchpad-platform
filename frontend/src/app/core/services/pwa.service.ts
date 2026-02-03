import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any;
  private readonly installPromptSubject = new BehaviorSubject<boolean>(false);
  public installPrompt$ = this.installPromptSubject.asObservable();

  private readonly isInstalledSubject = new BehaviorSubject<boolean>(false);
  public isInstalled$ = this.isInstalledSubject.asObservable();

  constructor() {
    this.init();
  }

  private init() {
    // Check if already installed
    if (this.isRunningStandalone()) {
      this.isInstalledSubject.next(true);
    }

    // Listen for install prompt
    fromEvent(window, 'beforeinstallprompt').subscribe((event: any) => {
      event.preventDefault();
      this.promptEvent = event;
      this.installPromptSubject.next(true);
    });

    // Listen for successful installation
    fromEvent(window, 'appinstalled').subscribe(() => {
      this.isInstalledSubject.next(true);
      this.installPromptSubject.next(false);
      console.log('PWA installed successfully');
    });

    // Register service worker
    this.registerServiceWorker();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });

        console.log('Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available');
                // Optionally notify user about update
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  public async showInstallPrompt(): Promise<boolean> {
    if (!this.promptEvent) {
      return false;
    }

    try {
      this.promptEvent.prompt();
      const result = await this.promptEvent.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('User accepted install prompt');
        return true;
      } else {
        console.log('User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    } finally {
      this.promptEvent = null;
      this.installPromptSubject.next(false);
    }
  }

  public isRunningStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  public async checkForUpdates() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  }

  public async unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('Service Worker unregistered');
      }
    }
  }

  public async clearCache() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  public getInstallInstructions(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'Tap the Share button and then "Add to Home Screen"';
    } else if (/android/.test(userAgent)) {
      return 'Tap the menu button and then "Add to Home Screen" or "Install App"';
    } else {
      return 'Click the install button in your browser\'s address bar';
    }
  }

  public canInstall(): boolean {
    return this.promptEvent !== null || !this.isRunningStandalone();
  }
}
