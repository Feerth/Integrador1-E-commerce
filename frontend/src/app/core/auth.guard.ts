import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.logged() ? true : inject(Router).createUrlTree(['/auth/login'], { queryParams: { redirect: state.url } });
};
