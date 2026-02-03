import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { ToastModule } from 'primeng/toast';
import { MenuItem } from 'primeng/api';
import { WalletButtonComponent } from './shared/components/wallet-button.component';
import { SearchBarComponent } from './shared/components/search-bar/search-bar.component';
import { MobileBottomNavComponent } from './components/mobile-bottom-nav/mobile-bottom-nav.component';
import { PwaInstallPromptComponent } from './components/pwa-install-prompt/pwa-install-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MenubarModule,
    ToastModule,
    WalletButtonComponent,
    SearchBarComponent,
    MobileBottomNavComponent,
    PwaInstallPromptComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Navigation links now in app.html template
}
