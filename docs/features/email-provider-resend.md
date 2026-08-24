# Proveedor de email: Resend (transaccional + newsletter)

**Estado:** planificado, pendiente de implementar por fases.

## Contexto

`MailService` (`backend/src/mail/mail.service.ts`) es un no-op desde el primer día del sistema de auth (`auth-and-admin-dashboard.md`, línea "sin proveedor de email todavía"): loguea en vez de enviar. Hoy **no tiene ningún caller** — nada del sistema manda un email real todavía. Esto bloquea tres cosas distintas, no solo una:

1. **Verificación de cuenta** y **reset de contraseña por correo** — pospuestas explícitamente en `auth-and-admin-dashboard.md` y `reader-accounts-and-paywall.md` hasta tener proveedor.
2. **Envío masivo del newsletter** — `NewsletterSubscriber` (`newsletter/`) ya junta altas desde el formulario público y la lista de espera de `/planes`, pero no hay forma de mandarles nada; son datos sin usar.
3. **"Preferencias de correo"** en el menú de usuario (`docs/features/reader-profile.md`) — el último ítem mockeado del menú, que necesita que (1) y (2) existan primero para tener sentido.

## Decisión: Resend

Se evaluaron Hostinger Reach, Resend, Brevo, Listmonk autohospedado y Mailchimp — ver la comparación completa en la conversación de esta sesión (no repetida acá para no duplicar). Puntos que definieron la elección:

- **Se descartó Hostinger Reach** pese a ser el mismo proveedor que ya usa el sitio (VPS, dominio): se confirmó en vivo contra la cuenta real que (a) no hay ningún plan de Reach contratado (solo el VPS), y (b) la API de Reach expone gestión de contactos/tags/segmentos/DNS pero **no un endpoint para crear ni enviar una campaña** — el envío sería manual desde su dashboard, sin poder automatizar "se publicó un artículo → sale el newsletter".
- **Se descartó Listmonk autohospedado**: máximo control y sin costo por contacto, pero suma un servicio más para mantener/respaldar en el mismo VPS que ya corre Postgres + backend + frontend + Umami, y de todas formas necesita un SMTP relay aparte (ej. SES) para el transaccional — no resuelve nada gratis, solo cambia dónde vive la complejidad.
- **Resend** resuelve transaccional y newsletter con una sola integración (API chica, un solo SDK), tiene tier gratis (3.000 emails/mes) de sobra para el volumen actual del sitio, y encaja con el punto de extensión que `MailService` ya tiene preparado.

## Fases (se implementan y verifican por separado, no todo junto)

### Fase 1 — `MailService` real + primer email transaccional

- `backend/src/mail/mail.service.ts`: reemplaza el no-op por el SDK `resend`, config vía `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (nuevas en `.env.example`).
- Mantiene la misma firma pública (`send(to, subject, body)`) — ningún consumidor futuro necesita saber que cambió el proveedor por debajo.
- Primer uso real: email de bienvenida al registrarse (`AuthService.register`) — el caso más simple para probar la integración de punta a punta antes de construir flujos más sensibles (verificación, reset).
- Verifica dominio propio en Resend (`nexoat.com`, ver `project-domain-nexoat-com.md`) con los registros SPF/DKIM que pide — sin esto, Resend manda desde un dominio compartido con peor entregabilidad.

### Fase 2 — Verificación de cuenta y reset de contraseña

- Retoma exactamente lo que `auth-and-admin-dashboard.md` dejó pendiente: `User.emailVerified` ya existe en el schema, falta el flujo (token de verificación + endpoint + email + pantalla `/verificar-correo`) y el de reset (`/recuperar-contraseña`, token con expiración, mismo patrón que `RefreshToken`).
- Fuera del alcance de este documento en detalle — merece su propio doc de feature cuando se encare (el flujo de tokens/expiración tiene sus propias decisiones).

### Fase 3 — Newsletter real vía Resend Broadcasts

- `NewsletterSubscriber` sigue siendo la fuente de verdad para el admin (listado en `/nexoat-admin`, ya implementado) — no se reemplaza por la audiencia de Resend, se **sincroniza** con ella.
- Cambio de schema: `NewsletterSubscriber` suma `resendContactId String?` — al dar de alta/baja en `NewsletterService.subscribe`/`unsubscribe`, se replica en la audiencia de Resend (`contacts.create`/`contacts.remove`, guardando el id que devuelve).
- Redactar y enviar el newsletter en sí sigue siendo manual (componer y mandar el Broadcast desde el dashboard de Resend, apuntando a la audiencia sincronizada) — automatizar "nuevo artículo → newsletter automático" queda fuera de esta fase; se evalúa más adelante si hace falta.

### Fase 4 — "Preferencias de correo" (el ítem mockeado del menú)

- Ahora sí tiene sentido: pantalla `/mi-cuenta/preferencias` con un toggle "Recibir novedades por correo", que llama a `subscribe`/`unsubscribe` de `NewsletterService` usando el email de la cuenta logueada — mismo mecanismo que ya usa el formulario público, ahora expuesto también desde la cuenta.
- Un solo toggle alcanza hoy: es la única categoría de correo opcional que existe. Si en el futuro se suma otro tipo de aviso opcional (ej. "cuando se habiliten los niveles pagos"), se separa en una lista de toggles recién ahí.

## Fuera de alcance (de todo el documento)

- Automatizar el envío del newsletter al publicar un artículo (sigue siendo manual vía el dashboard de Resend).
- Cualquier campaña de email más allá del newsletter simple (drip campaigns, segmentación avanzada) — no lo pidió el proyecto.

## Plan de verificación (por fase, al implementar cada una)

- **Fase 1:** registrar una cuenta nueva → llega un email real de bienvenida a una casilla de prueba, remitente `@nexoat.com`, sin ir a spam.
- **Fase 3:** suscribirse desde el formulario público → aparece en la audiencia de Resend con el mismo email; darse de baja → desaparece/se marca unsubscribed en ambos lados.
- **Fase 4:** togglear "Recibir novedades" desde `/mi-cuenta/preferencias` → se refleja en `/nexoat-admin` (listado de `NewsletterSubscriber`) y en la audiencia de Resend.
