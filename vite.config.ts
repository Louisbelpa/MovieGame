import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync, writeFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableSeries = env.VITE_ENABLE_SERIES === 'true'
  const siteUrl = enableSeries ? 'https://guesstoday.fr' : 'https://cineguessr.fr'
  const brandName = enableSeries ? 'GuessToday' : 'CinéGuessr'
  const siteDesc = enableSeries
    ? 'Devine le film, la série ou la personnalité mystère du jour. Un nouveau défi chaque jour.'
    : 'Devine le film mystère du jour. Un nouveau défi cinéma chaque jour.'

  return {
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'html-inject-seo',
      transformIndexHtml(html: string) {
        return html
          .replace(/%SITE_URL%/g, siteUrl)
          .replace(/%BRAND_NAME%/g, brandName)
          .replace(/%SITE_DESC%/g, siteDesc)
      },
      closeBundle() {
        const outDir = 'backend/public'
        const enableSeriesFeature = env.VITE_ENABLE_SERIES === 'true'
        const enableWiki = env.VITE_ENABLE_WIKI !== 'false'

        const routes = ['/films']
        if (enableSeriesFeature) routes.push('/series')
        if (enableWiki) routes.push('/wiki')

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>\n    <loc>${siteUrl}${r}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${r === '/films' ? '1.0' : '0.9'}</priority>\n  </url>`).join('\n')}
</urlset>\n`

        const robots = `User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`

        writeFileSync(`${outDir}/sitemap.xml`, sitemap)
        writeFileSync(`${outDir}/robots.txt`, robots)
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'backend/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  }
})
