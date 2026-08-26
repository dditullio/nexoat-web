/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // Base para URLs absolutas de SEO (canonical, og:url, og:image) — opcional
  // (cae a localhost en dev), ver docs/features/seo.md.
  readonly VITE_SITE_URL?: string
  // Analítica (Umami self-hosted) — opcionales, ver docs/features/analytics-umami.md
  readonly VITE_UMAMI_SRC?: string
  readonly VITE_UMAMI_WEBSITE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
