import { Routes } from '@angular/router';
import { authGuard, adminGuard, adminNavigationGuard } from '../guards/auth.guard';
const pages: Routes = [
  {
    path: 'search',
    title: 'Search people and games | GORA',
    loadComponent: () => import('../pages/search/search.page').then((m) => m.SearchPage),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'GORA — Find your game. Find your people.',
    loadComponent: () => import('../pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'tabs/home',
    loadComponent: () => import('../pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'tabs/discover',
    loadComponent: () => import('../pages/discover/discover.page').then((m) => m.DiscoverPage),
  },
  {
    path: 'people',
    loadComponent: () => import('../pages/people/people.page').then((m) => m.PeoplePage),
  },
  {
    path: 'tabs/schedule',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/schedule/schedule.page').then((m) => m.SchedulePage),
  },
  {
    path: 'tabs/messages',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/messages/messages.page').then((m) => m.MessagesPage),
  },
  {
    path: 'tabs/profile',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'user/:id',
    loadComponent: () => import('../pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'event/:id',
    loadComponent: () => import('../pages/event/event.page').then((m) => m.EventPage),
  },
  {
    path: 'create-event',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/event/event-form.page').then((m) => m.EventFormPage),
  },
  {
    path: 'edit-event/:id',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/event/event-form.page').then((m) => m.EventFormPage),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../pages/notifications/notifications.page').then((m) => m.NotificationsPage),
  },
  {
    path: 'communities',
    loadComponent: () =>
      import('../pages/communities/communities.page').then((m) => m.CommunitiesPage),
  },
  {
    path: 'community/:id',
    loadComponent: () =>
      import('../pages/communities/communities.page').then((m) => m.CommunitiesPage),
  },
  {
    path: 'sports/:id',
    loadComponent: () => import('../pages/discover/discover.page').then((m) => m.DiscoverPage),
  },
  { path: 'login', loadComponent: () => import('../pages/auth/auth.page').then((m) => m.AuthPage) },
  {
    path: 'register',
    loadComponent: () => import('../pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('../pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('../pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('../pages/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: '**',
    loadComponent: () => import('../pages/not-found.page').then((m) => m.NotFoundPage),
  },
];
export const routes: Routes = [
  { path: '', canActivateChild: [adminNavigationGuard], children: pages },
];
