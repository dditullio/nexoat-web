<template>
  <footer class="ftr">
    <div class="ftr__glow" aria-hidden="true"></div>

    <div class="container ftr__inner">
      <div class="ftr__grid">
        <div class="ftr__brand">
          <div class="ftr__logo">Nexo<span class="ftr__logo-mark">AT</span></div>
          <p class="ftr__tagline">
            La referencia de habla hispana en acompañamiento terapéutico y cuidado de personas.
          </p>
          <div class="ftr__social">
            <a href="#" class="ftr__soc" aria-label="X / Twitter">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </a>
            <a href="#" class="ftr__soc" aria-label="Instagram">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5.5" />
                <circle cx="12" cy="12" r="4" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke-linecap="round" />
              </svg>
            </a>
            <a href="#" class="ftr__soc" aria-label="LinkedIn">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                />
              </svg>
            </a>
          </div>
        </div>

        <div class="ftr__col">
          <h4 class="ftr__title">Temas</h4>
          <RouterLink
            v-for="cat in displayedCategories"
            :key="cat.slug"
            :to="`/categoria/${cat.slug}`"
            class="ftr__link"
          >
            {{ cat.name }}
          </RouterLink>
          <RouterLink to="/buscar" class="ftr__link ftr__link--cta">Ver todos →</RouterLink>
        </div>

        <div class="ftr__col">
          <h4 class="ftr__title">Sitio</h4>
          <RouterLink to="/" class="ftr__link">Inicio</RouterLink>
          <RouterLink to="/acerca-de" class="ftr__link">Acerca de</RouterLink>
          <RouterLink to="/buscar" class="ftr__link">Buscar</RouterLink>
          <span class="ftr__link ftr__link--off">Servicios</span>
        </div>

        <div class="ftr__col">
          <h4 class="ftr__title">Legal</h4>
          <a href="#" class="ftr__link">Política de privacidad</a>
          <a href="#" class="ftr__link">Aviso legal</a>
        </div>
      </div>

      <div class="ftr__bottom">
        <p class="ftr__copy">© {{ year }} NexoAT. Todos los derechos reservados.</p>
        <p class="ftr__note">
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
.ftr {
  position: relative;
  background: var(--color-footer-bg);
  padding: 84px 0 40px;
  overflow: hidden;
  isolation: isolate;
}

/* Luz difusa: evita que el bloque oscuro se lea como un rectángulo plano */
.ftr__glow {
  position: absolute;
  top: -180px;
  left: 50%;
  width: 620px;
  height: 420px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(157, 186, 146, 0.16), transparent 68%);
  pointer-events: none;
  z-index: -1;
}

.ftr__inner {
  position: relative;
}

.ftr__grid {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1fr 1fr;
  gap: 52px;
  margin-bottom: 56px;
}

/* Marca */
.ftr__logo {
  font-family: var(--font-display);
  font-variation-settings:
    'SOFT' 70,
    'WONK' 1;
  font-size: 1.55rem;
  font-weight: 600;
  color: #f7f2e9;
  margin-bottom: 14px;
  letter-spacing: -0.03em;
}

.ftr__logo-mark {
  color: #9dba92;
}

.ftr__tagline {
  font-size: 0.9rem;
  color: rgba(247, 242, 233, 0.46);
  line-height: 1.76;
  max-width: 27ch;
  margin-bottom: 26px;
}

.ftr__social {
  display: flex;
  gap: 9px;
}

.ftr__soc {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  background: rgba(247, 242, 233, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(247, 242, 233, 0.55);
  transition:
    background 0.25s ease,
    color 0.25s ease,
    transform 0.3s var(--ease-out-soft);
}

.ftr__soc:hover {
  background: rgba(157, 186, 146, 0.22);
  color: #f7f2e9;
  transform: translateY(-2px);
}

/* Columnas */
.ftr__col {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.ftr__title {
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 700;
  color: rgba(247, 242, 233, 0.36);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.ftr__link {
  font-size: 0.88rem;
  color: rgba(247, 242, 233, 0.58);
  font-weight: 500;
  transition:
    color 0.2s ease,
    transform 0.25s var(--ease-out-soft);
  width: fit-content;
}

.ftr__link:hover {
  color: #f7f2e9;
  transform: translateX(3px);
}

.ftr__link--cta {
  color: #9dba92;
  font-weight: 700;
}

.ftr__link--off {
  color: rgba(247, 242, 233, 0.26);
  pointer-events: none;
  font-style: italic;
}

/* Base */
.ftr__bottom {
  border-top: 1px solid rgba(247, 242, 233, 0.1);
  padding-top: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.ftr__copy {
  font-size: 0.8rem;
  color: rgba(247, 242, 233, 0.3);
}

.ftr__note {
  font-size: 0.76rem;
  color: rgba(247, 242, 233, 0.24);
  max-width: 52ch;
  text-align: right;
  line-height: 1.68;
}

/* Responsive */
@media (max-width: 1024px) {
  .ftr__grid {
    grid-template-columns: 1fr 1fr;
    gap: 36px;
  }

  .ftr__note {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .ftr__grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}
</style>
