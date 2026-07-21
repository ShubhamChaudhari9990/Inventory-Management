import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'language-selection',
    loadComponent: () =>
      import('./language-selection/language-selection.page').then(
        (m) => m.LanguageSelectionPage,
      ),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'language-selection',
    pathMatch: 'full',
  },
];
