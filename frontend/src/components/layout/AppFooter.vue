<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <!-- Brand -->
        <div class="footer__brand">
          <div class="footer__logo">Nexo<span class="footer__logo-accent">AT</span></div>
          <p class="footer__tagline">
            La referencia de habla hispana en acompañamiento terapéutico y cuidado de personas.
          </p>
          <div class="footer__social">
            <a href="#" class="footer__social-btn" title="X / Twitter" aria-label="X Twitter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </a>
            <a href="#" class="footer__social-btn" title="Instagram" aria-label="Instagram">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href="#" class="footer__social-btn" title="LinkedIn" aria-label="LinkedIn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                />
              </svg>
            </a>
          </div>
        </div>

        <!-- Categorías -->
        <div class="footer__col">
          <h4 class="footer__col-title">Categorías</h4>
          <RouterLink
            v-for="cat in displayedCategories"
            :key="cat.slug"
            :to="`/categoria/${cat.slug}`"
            class="footer__link"
          >
            {{ cat.name }}
          </RouterLink>
          <RouterLink
            to="/categoria/acompanamiento-terapeutico"
            class="footer__link footer__link--cta"
            >Ver todas →</RouterLink
          >
        </div>

        <!-- Páginas -->
        <div class="footer__col">
          <h4 class="footer__col-title">Páginas</h4>
          <RouterLink to="/" class="footer__link">Inicio</RouterLink>
          <RouterLink to="/acerca-de" class="footer__link">Acerca de</RouterLink>
          <span class="footer__link footer__link--disabled">Servicios</span>
          <span class="footer__link footer__link--disabled">Recursos</span>
          <span class="footer__link footer__link--disabled">Contacto</span>
        </div>

        <!-- Legal -->
        <div class="footer__col">
          <h4 class="footer__col-title">Legal</h4>
          <a href="#" class="footer__link">Política de Privacidad</a>
          <a href="#" class="footer__link">Aviso Legal</a>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="footer__bottom">
        <p class="footer__copy">© {{ year }} NexoAT. Todos los derechos reservados.</p>
        <p class="footer__disclaimer">
          Los contenidos de este sitio tienen fines informativos y no reemplazan la consulta con un
          profesional de salud.
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBlogStore } from '@/stores/blog'

const store = useBlogStore()
const year = new Date().getFullYear()
const displayedCategories = computed(() => store.categories.slice(0, 5))
</script>

<style scoped>
.footer {
  background: #111728;
  padding: 64px 0 40px;
}

.footer__grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  margin-bottom: 52px;
}

/* Brand */
.footer__logo {
  font-family: var(--font-serif);
  font-size: 23px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
  letter-spacing: -0.02em;
}
.footer__logo-accent {
  color: var(--color-primary-light);
}

.footer__tagline {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.74;
  max-width: 250px;
  margin-bottom: 28px;
}

.footer__social {
  display: flex;
  gap: 10px;
}

.footer__social-btn {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
}
.footer__social-btn:hover {
  background: rgba(255, 255, 255, 0.13);
  color: #fff;
}

/* Columns */
.footer__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer__col-title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.footer__link {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.52);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}
.footer__link:hover {
  color: #fff;
}
.footer__link--cta {
  color: var(--color-primary-light);
  font-weight: 600;
}
.footer__link--cta:hover {
  color: #fff;
}
.footer__link--disabled {
  color: rgba(255, 255, 255, 0.28);
  pointer-events: none;
  font-style: italic;
}

/* Bottom */
.footer__bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.footer__copy {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.28);
}

.footer__disclaimer {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.22);
  max-width: 500px;
  text-align: right;
  line-height: 1.65;
}

/* Responsive */
@media (max-width: 1024px) {
  .footer__grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .footer__disclaimer {
    text-align: left;
  }
}
@media (max-width: 640px) {
  .footer__grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
</style>
