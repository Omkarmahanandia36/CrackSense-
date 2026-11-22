import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.cracksense.app',
  appName: 'CrackSense AI',
  webDir: 'dist',
  server: {
    // Set to 'http' to avoid mixed-content blocking when accessing plain HTTP backend on LAN
    androidScheme: 'http',
    cleartext: true, // Allow connecting to local LAN / development AI backend
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#06141B',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
