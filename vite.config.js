import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // Inline API proxy for development (mimics Vercel serverless function)
    {
      name: 'api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          try {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              const { messages, apiKey } = JSON.parse(body);
              if (!apiKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'API key diperlukan' }));
                return;
              }
              const apiRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: 'deepseek-ai/deepseek-v4-pro',
                  messages,
                  temperature: 0.7,
                  top_p: 0.95,
                  max_tokens: 4096,
                  extra_body: { chat_template_kwargs: { thinking: false } },
                }),
              });
              const data = await apiRes.json();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = apiRes.ok ? 200 : apiRes.status;
              res.end(JSON.stringify(data));
            });
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      },
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'APK Planner',
        short_name: 'APK Planner',
        description: 'Aplikasi Perencanaan Harian Personal',
        theme_color: '#6C3CE1',
        background_color: '#F8F7FC',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true
  }
});
