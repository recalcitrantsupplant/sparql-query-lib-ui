import tailwindcss from '@tailwindcss/vite' // Import the plugin

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: [
    '~/assets/css/tailwind.css',
    '@vue-flow/core/dist/style.css',
    '@vue-flow/core/dist/theme-default.css',
    '@vue-flow/controls/dist/style.css',
    '@vue-flow/minimap/dist/style.css',
  ],
  modules: ['shadcn-nuxt'],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  vite: { // Add the vite configuration
    plugins: [
      tailwindcss(),
    ],
  },
  devServer: {
    port: 3001
  },
  runtimeConfig: {
    // Public keys are exposed to the client-side
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3050' // Default value if env var not set
    }
  }
})
