import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heyhey.app',
  appName: 'HeyHey',
  webDir: 'dist',
  server: {
    // During development, use the Vite dev server
    // Comment out for production builds
    // url: 'http://localhost:5173',
    // cleartext: true,
  },
};

export default config;
