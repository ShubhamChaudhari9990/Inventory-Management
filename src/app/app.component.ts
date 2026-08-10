import { Component } from '@angular/core';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { registerAppIcons } from './shared/icons/register-app-icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    registerAppIcons();
    this.markNativePlatform();
    void this.configureNativeChrome();
  }

  /**
   * Android insets are applied in MainActivity (status bar + nav + cutout).
   * iOS/web still rely on CSS safe-area padding on ion-app.
   */
  private markNativePlatform(): void {
    if (Capacitor.getPlatform() === 'android') {
      document.documentElement.classList.add('native-android');
    }
  }

  private async configureNativeChrome(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // LIGHT = black status/nav icons on white system bars (Capacitor naming).
      await SystemBars.setStyle({ style: SystemBarsStyle.Light });
    } catch {
      // Optional on older runtimes.
    }

    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch {
      // Ignore on platforms where these APIs are unavailable.
    }
  }
}
