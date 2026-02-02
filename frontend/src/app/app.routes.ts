import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { TokenDetailComponent } from './features/token-detail/token-detail.component';
import { CreateTokenComponent } from './features/create-token/create-token.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ExploreComponent } from './features/explore/explore.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'token/:address', component: TokenDetailComponent },
  { path: 'create', component: CreateTokenComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'explore', component: ExploreComponent },
  { path: '**', redirectTo: '' }
];
