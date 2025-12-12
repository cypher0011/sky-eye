import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/', // Ensure correct base path for Netlify
    build: {
        outDir: 'dist',
        sourcemap: false, // Disable sourcemaps for faster builds
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
                    'map-vendor': ['leaflet', 'react-leaflet', 'mapbox-gl']
                }
            }
        }
    }
})
