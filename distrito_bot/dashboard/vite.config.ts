import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Distrito Bot Dashboard',
        short_name: 'Distrito Bot',
        description: 'Panel de control de Distrito Burger',
        theme_color: '#FFCC00',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/distrito/',
  build: {
    chunkSizeWarningLimit: 1000
  }
})
