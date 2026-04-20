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
    path: '1',
    loadComponent: () =>
      import('./design-1/design-1').then((module) => module.Design1Component),
  },
  {
    path: '2',
    loadComponent: () =>
      import('./design-2/design-2').then((module) => module.Design2Component),
  },
  {
    path: '3',
    loadComponent: () =>
      import('./design-3/design-3').then((module) => module.Design3Component),
  },
  {
    path: '4',
    loadComponent: () =>
      import('./design-4/design-4').then((module) => module.Design4Component),
  },
  {
    path: '5',
    loadComponent: () =>
      import('./design-5/design-5').then((module) => module.Design5Component),
  },
  {
    path: '6',
    loadComponent: () =>
      import('./design-6/design-6').then((module) => module.Design6Component),
  },
  {
    path: '7',
    loadComponent: () =>
      import('./design-7/design-7').then((module) => module.Design7Component),
  },
  {
    path: '8',
    loadComponent: () =>
      import('./design-8/design-8').then((module) => module.Design8Component),
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
