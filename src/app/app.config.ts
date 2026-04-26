import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideWeddingInviteDatabase } from './invite-database';

const routes = [
  {
    path: '',
    loadComponent: () =>
      import('./invite-page/invite-page').then((module) => module.InvitePageComponent),
  },
  {
    path: 'admin/:guid',
    loadComponent: () =>
      import('./admin-page/admin-page').then((module) => module.AdminPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideWeddingInviteDatabase(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
  ],
};
