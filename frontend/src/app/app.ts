import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { ToastModule } from 'primeng/toast';
import { MenuItem } from 'primeng/api';
import { WalletButtonComponent } from './shared/components/wallet-button.component';
import { SearchBarComponent } from './shared/components/search-bar/search-bar.component';

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
    SearchBarComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  menuItems: MenuItem[] = [
    {
      label: 'Home',
      icon: 'pi pi-home',
      routerLink: '/'
    },
    {
      label: 'Explore',
      icon: 'pi pi-compass',
      routerLink: '/explore'
    },
    {
      label: 'Create',
      icon: 'pi pi-plus-circle',
      routerLink: '/create'
    },
    {
      label: 'Dashboard',
      icon: 'pi pi-chart-line',
      routerLink: '/dashboard'
    }
  ];
}
