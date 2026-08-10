import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'LemonWood',
  webDir: 'www',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      // LIGHT = black icons/buttons on light (white) system bars.
      style: 'LIGHT',
      hidden: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      // FIT_CENTER keeps the logo sharp; CENTER_CROP zooms/crops and looks blurry.
      androidScaleType: 'FIT_CENTER',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
