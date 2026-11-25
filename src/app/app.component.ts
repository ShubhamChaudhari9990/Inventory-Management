import { Component, OnInit, inject, signal } from '@angular/core';
import { IonApp, IonButton, IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, leaf } from 'ionicons/icons';

import { registerAppIcons } from './shared/icons/register-app-icons';
import { AppLockService } from './services/app-lock.service';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, IonButton, IonIcon, TranslatePipe],
})
export class AppComponent implements OnInit {
  readonly appLockService = inject(AppLockService);
  private readonly firebaseService = inject(FirebaseService);

  readonly showSplashScreen = signal(true);
  readonly isSplashFading = signal(false);

  constructor() {
    registerAppIcons();
    addIcons({
      leaf,
      fingerPrintOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch {
      // Ignore if unsupported
    }

    // Hide native splash screen so the app's smooth splash transition kicks in
    try {
      await SplashScreen.hide();
    } catch {
      // Ignore if running in browser or plugin unavailable
    }

    // Wait for auth state to resolve with a minimal presentation delay for brand smoothness
    const minDelay = new Promise((resolve) => setTimeout(resolve, 850));
    try {
      await Promise.all([
        this.firebaseService.authStateReady(),
        minDelay,
      ]);
    } catch {
      await minDelay;
    }

    // Start graceful fade out transition
    this.isSplashFading.set(true);
    setTimeout(() => {
      this.showSplashScreen.set(false);
    }, 400);

    // Initialize biometric app lock lifecycle listener
    void this.appLockService.init();
  }

  onLockScreenLogout(): void {
    void this.appLockService.logoutFromLockScreen();
  }
}
