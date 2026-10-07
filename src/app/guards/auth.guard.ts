import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
export const adminNavigationGuard: CanActivateChildFn = async (_route, state) => {
  const api = inject(ApiService),
    router = inject(Router);
  if (!api.ready()) await api.initialize();
  const path = state.url.split(/[?#]/)[0];
  return api.user()?.role === 'admin' && path !== '/admin'
    ? router.createUrlTree(['/admin'])
    : true;
};
export const authGuard: CanActivateFn = async (_route, state) => {
  const api = inject(ApiService),
    router = inject(Router);
  if (!api.ready()) await api.initialize();
  return api.user()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
export const adminGuard: CanActivateFn = async () => {
  const api = inject(ApiService),
    router = inject(Router);
  if (!api.ready()) await api.initialize();
  return api.user()?.role === 'admin' ? true : router.createUrlTree(['/tabs/home']);
};
