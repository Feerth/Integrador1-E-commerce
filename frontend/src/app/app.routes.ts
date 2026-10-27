import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'trip', pathMatch: 'full' },
    {
        path: 'auth',
        loadComponent: () => import('./modules/auth/layout-auth/layout-auth').then(m => m.LayoutAuth),
        children: [
            { path: '', redirectTo: 'login', pathMatch: 'full' },
            { path: 'login', loadComponent: () => import('./modules/auth/pages/login/login').then(m => m.Login) },
            { path: 'register', loadComponent: () => import('./modules/auth/pages/register/register').then(m => m.Register) },
        ]
    },
    {
        path: 'trip',
        loadComponent: () => import('./modules/trip-management/layout-trip/layout-trip').then(m => m.LayoutTrip),
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', loadComponent: () => import('./modules/trip-management/pages/home/home').then(m => m.Home) },
            { path: 'flights', loadComponent: () => import('./modules/trip-management/pages/flights/flights').then(m => m.Flights) },
            { path: 'my-trips', canActivate: [authGuard], loadComponent: () => import('./modules/trip-management/pages/my-trips/my-trips').then(m => m.MyTrips) },
            { path: 'check-in', canActivate: [authGuard], loadComponent: () => import('./modules/trip-management/pages/check-in/check-in').then(m => m.CheckIn) },
            { path: 'baggage-tracking', loadComponent: () => import('./modules/trip-management/pages/baggage-tracking/baggage-tracking').then(m => m.BaggageTracking) },
            { path: 'help', loadComponent: () => import('./modules/trip-management/pages/help/help').then(m => m.Help) },
        ]
    },
    { path: '**', redirectTo: 'trip' },
];
