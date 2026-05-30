import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true // Isse tum apne phone ke browser se laptop ka IP dal kar access kar paoge!
  }
});