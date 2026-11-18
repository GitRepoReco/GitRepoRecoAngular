import { Routes } from '@angular/router';

export const routes: Routes = [
  // Page principale : son contenu (rangées de repos, twins, quiz) reste rendu par App.
  { path: '', pathMatch: 'full', title: 'Reporeco', children: [] },
  { path: 'monitoring', title: 'Monitoring · Reporeco', loadComponent: () => import('./monitoring').then(m => m.Monitoring) },
  { path: 'dashboard', title: 'Dashboard · Reporeco', loadComponent: () => import('./dashboard').then(m => m.Dashboard) },
  { path: '**', redirectTo: '' },
];
