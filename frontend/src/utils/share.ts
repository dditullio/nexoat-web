export interface ShareTarget {
  id: 'whatsapp' | 'facebook' | 'twitter' | 'telegram' | 'email'
  label: string
  buildUrl: (opts: { url: string; title: string }) => string
}

// "Share intents" públicos de cada red — no requieren SDK ni credenciales,
// son URLs que abren directo el diálogo de compartir con el link precargado.
// Instagram no tiene un intent equivalente (ver ArticleView.vue: se cubre
// con la Web Share API nativa en mobile, no con un link como estos).
export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    buildUrl: ({ url, title }) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    buildUrl: ({ url }) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    buildUrl: ({ url, title }) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    buildUrl: ({ url, title }) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: 'email',
    label: 'Email',
    buildUrl: ({ url, title }) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
]
