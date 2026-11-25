import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lemonwood.app',
  appName: 'LemonWood',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '371488536263-26obcj8uetvmq6g1e6i0519jv81i6hku.apps.googleusercontent.com',
      androidClientId: '371488536263-26obcj8uetvmq6g1e6i0519jv81i6hku.apps.googleusercontent.com',
      serverClientId: '371488536263-26obcj8uetvmq6g1e6i0519jv81i6hku.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
