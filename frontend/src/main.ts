import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

// Analítica (Umami self-hosted, ver docs/features/analytics-umami.md).
// Solo se inyecta si el build trae ambas vars — en dev local quedan vacías,
// así que no se trackea tráfico de desarrollo.
const umamiSrc = import.meta.env.VITE_UMAMI_SRC
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
if (umamiSrc && umamiWebsiteId) {
  const script = document.createElement('script')
  script.defer = true
  script.src = umamiSrc
  script.dataset.websiteId = umamiWebsiteId
  document.head.appendChild(script)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
