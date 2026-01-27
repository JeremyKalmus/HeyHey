import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.heyhey.app',
  appName: 'HeyHey',
  webDir: 'dist',
  server: isDev
    ? {
        url: 'http://localhost:5173',
        cleartext: true,
      }
    : {},
};

export default config;
