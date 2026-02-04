import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { TokenDetailComponent } from './features/token-detail/token-detail.component';
import { CreateTokenComponent } from './features/create-token/create-token.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ExploreComponent } from './features/explore/explore.component';
import { WatchlistPage } from './features/watchlist/watchlist.page';
import { AnalyticsPage } from './features/analytics/analytics.page';
import { PortfolioPage } from './features/portfolio/portfolio.page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'token/:address', component: TokenDetailComponent },
  { path: 'create', component: CreateTokenComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'explore', component: ExploreComponent },
  { path: 'watchlist', component: WatchlistPage },
  { path: 'analytics', component: AnalyticsPage },
  { path: 'portfolio', component: PortfolioPage },
  { path: '**', redirectTo: '' }
];
