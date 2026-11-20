import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.cracksense.app',
  appName: 'CrackSense AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Allow connecting to local LAN / development AI backend
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
  },
};

export default config;
