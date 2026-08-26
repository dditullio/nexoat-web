<template>
  <div class="container terms">
    <p class="eyebrow terms__eyebrow">Legal</p>
    <h1 class="terms__title">Términos de uso y Política de privacidad</h1>
    <!-- <p class="terms__draft-notice">
      <strong>Borrador.</strong> Este texto describe honestamente qué datos
      junta NexoAT hoy y para qué los usa, pero todavía no pasó por una revisión
      legal formal. Se va a actualizar a medida que el sitio crezca.
    </p> -->

    <div class="terms__body">
      <section class="terms__section">
        <h2>1. Qué es NexoAT</h2>
        <p>
          NexoAT es un sitio de divulgación sobre acompañamiento terapéutico y cuidado de personas.
          Publica artículos gratuitos y, para parte del contenido, exige una cuenta gratuita o de
          suscripción.
        </p>
      </section>

      <section class="terms__section">
        <h2>2. Qué datos junta tu cuenta</h2>
        <ul>
          <li><strong>Cuenta:</strong> email, nombre, y opcionalmente una foto de perfil.</li>
          <li>
            <strong>Perfil (opcional):</strong> el tipo de usuario que elegís (Acompañante
            Terapéutico, Cuidador/a, Familiar u Otro) y, si sos AT o Cuidador/a, un perfil
            profesional breve que vos completás (especialización, experiencia, una bio corta).
          </li>
          <li>
            <strong>Actividad en el sitio:</strong> qué artículos leíste (historial de lectura) y
            cuáles guardaste — visibles solo para vos, se pueden borrar en cualquier momento desde
            tu cuenta.
          </li>
        </ul>
      </section>

      <section class="terms__section">
        <h2>3. Comentarios en los artículos</h2>
        <p>
          Cualquier cuenta con sesión iniciada puede comentar en los artículos. Al publicar un
          comentario, <strong>tu nombre y tu foto de perfil se muestran junto a él</strong>, de
          forma pública — visibles para cualquier persona que visite el artículo, tenga o no cuenta.
          Nunca se muestra tu email.
        </p>
        <p>
          Los comentarios se publican de inmediato y se moderan después: podés editar o borrar los
          tuyos en cualquier momento, y reportar un comentario ajeno para que el equipo lo revise.
          Un comentario borrado deja de mostrarse, aunque conservamos el registro internamente por
          motivos de auditoría.
        </p>
      </section>

      <section class="terms__section">
        <h2>4. Para qué se usan</h2>
        <p>
          Para que la cuenta funcione (mostrarte contenido, recordar lo que guardaste), y —solo si
          elegís suscribirte— para mandarte novedades del sitio por correo. Nunca vendemos ni
          compartimos tus datos con terceros para publicidad.
        </p>
      </section>

      <section class="terms__section">
        <h2>5. Con qué proveedores trabajamos</h2>
        <ul>
          <li>
            <strong>Cloudinary:</strong> aloja las imágenes que subís (avatar) o que suben los
            artículos.
          </li>
          <li>
            <strong>Resend:</strong> envía los emails de la cuenta (bienvenida, confirmación,
            recuperación de contraseña) y el newsletter, si te suscribís.
          </li>
          <li>
            <strong>Umami (analítica propia, sin cookies):</strong> mide visitas de forma anónima y
            agregada — no arma un perfil individual de tu navegación, y por eso no usamos Google
            Analytics ni herramientas similares.
          </li>
        </ul>
      </section>

      <section class="terms__section">
        <h2>6. Tus derechos sobre tus datos</h2>
        <p>
          Podés pedir acceder, corregir o borrar tus datos, y dar de baja tu cuenta, en cualquier
          momento. Muchas de estas acciones ya las podés hacer vos mismo/a desde
          <RouterLink to="/mi-cuenta/perfil">Mi perfil</RouterLink> y
          <RouterLink to="/mi-cuenta/preferencias">Preferencias de correo</RouterLink>.
        </p>
      </section>

      <section class="terms__section">
        <h2>7. Cambios a estos términos</h2>
        <p>
          Si estos términos cambian de forma importante, te lo vamos a avisar. Seguir usando el
          sitio después de un cambio implica que lo aceptás.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.terms {
  padding-block: 48px 80px;
  max-width: 720px;
}

.terms__eyebrow {
  margin-bottom: 8px;
}

.terms__title {
  font-size: 1.9rem;
  margin-bottom: 20px;
}

.terms__draft-notice {
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--color-ink-secondary);
  background: var(--color-ochre-soft);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  margin-bottom: 36px;
}

.terms__body {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.terms__section h2 {
  font-family: var(--font-display);
  font-size: 1.15rem;
  margin-bottom: 10px;
}

.terms__section p,
.terms__section li {
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--color-ink-secondary);
}

.terms__section ul {
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.terms__section a {
  color: var(--color-primary-dark);
  text-decoration: underline;
  text-decoration-color: var(--color-line);
  text-underline-offset: 2px;
}
</style>
