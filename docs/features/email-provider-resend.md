# Proveedor de email: Resend (transaccional + newsletter)

**Estado:** fases 1 y 2 implementadas y verificadas. Fases 3-4 pendientes.

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

### Fase 1 — `MailService` real + primer email transaccional ✅ implementado

- `backend/src/mail/mail.service.ts`: reemplaza el no-op por el SDK `resend`, config vía `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (nuevas en `.env`/`.env.example`). Sin `RESEND_API_KEY`, sigue cayendo al no-op original — no rompe el dev local de quien no tiene cuenta propia.
- Mantiene la misma firma pública (`send(to, subject, body)`, `body` = HTML) — ningún consumidor futuro necesita saber que cambió el proveedor por debajo. `send` nunca lanza: un fallo se loguea como error y sigue.
- Primer uso real: email de bienvenida al registrarse (`AuthService.register`, y también al crear cuenta nueva por OAuth en `validateOAuthLogin`) — plantilla en `mail/templates/welcome.template.ts`. Envío fire-and-forget: un fallo de Resend nunca bloquea el alta de la cuenta.
- Tests: `mail/mail.service.spec.ts` (SDK mockeado — no-op sin API key, envío real con key, nunca lanza ni con error del SDK ni con la promesa rechazada) y casos nuevos en `auth/auth.service.spec.ts`.
- **Verificado en vivo** con la cuenta real de Resend, en dos etapas:
  1. Antes de verificar el dominio: registrar una cuenta con un email ajeno a la cuenta de Resend logueó el error esperado de Resend ("solo se puede mandar a tu propio email sin dominio verificado") sin romper el registro; registrar con `hola.nexoat@gmail.com` (la casilla dueña de la cuenta Resend) entregó el email de bienvenida real.
  2. **Dominio `nexoat.com` verificado en Resend (2026-08-24)** — el DNS del dominio vive en DonWeb (no Hostinger, pese a que el VPS sí lo es), se cargaron a mano los 4 registros que pidió Resend (DKIM `resend._domainkey`, MX + TXT SPF en `send`, TXT DMARC en `_dmarc`). `RESEND_FROM_EMAIL` pasa a `NexoAT <notificaciones@nexoat.com>`. Confirmado registrando con un email ajeno a la cuenta de Resend (`gmail.com`, no `hola.nexoat@gmail.com`) → entregado sin error, ya no hay restricción de destinatario.
- Se evaluó explícitamente el "Tracking subdomain" que ofrece Resend (reescribe links + pixel de apertura para medir aperturas/clics) y **se dejó sin configurar a propósito** — mismo criterio que llevó a elegir Umami self-hosted sobre Google Analytics: no tiene sentido trackear aperturas de email en un sitio sobre acompañamiento terapéutico y salud mental. Se puede sumar más adelante con consentimiento explícito si hace falta medir aperturas del newsletter puntualmente.

### Fase 2 — Verificación de cuenta y reset de contraseña ✅ implementado

Detalle completo (decisiones, schema, verificación) en su propio documento: [`email-verification-and-password-reset.md`](email-verification-and-password-reset.md).

### Fase 3 — Sincronizar `NewsletterSubscriber` con la audiencia de Resend

**Estado:** planificado, pendiente de implementar.

Chequeado en vivo contra la API real de Resend antes de planificar esto (con la key "Full access"):

- `GET /audiences` ya devuelve una audiencia **"General"** (`id: ab6c24e9-9b4e-4a4f-aa93-9be06782bacc`), creada automáticamente por Resend al configurar la cuenta — se reusa esa, no hace falta crear una nueva. Se guarda su id en `RESEND_AUDIENCE_ID` (`.env`), no hardcodeado.
- `GET /audiences/:id/contacts`, y por extensión `POST`/`PATCH`/`DELETE` de contactos, existen y funcionan — confirmado.
- `GET /broadcasts` también existe y responde — Resend **sí tiene API para crear/enviar campañas** (a diferencia de Hostinger Reach, que se descartó justamente por no tenerla). Aun así, la decisión de esta fase es **no automatizar el envío del newsletter en sí** — ver más abajo, es una decisión de alcance, no una limitación técnica.

#### Hallazgo importante: hoy no existe ningún endpoint de baja

`NewsletterController` solo tiene `POST /newsletter/subscribe` — no hay `unsubscribe` en ningún lado, ni público ni admin, pese a que `NewsletterSubscriber.isActive`/`unsubscribedAt` ya existen en el schema para soportarlo. Se agrega en esta fase porque:

1. Sincronizar con Resend implica marcar el contacto como `unsubscribed` allá también — necesita un lugar en el código que dispare esa baja.
2. La Fase 4 ("Preferencias de correo") va a necesitar togglear apagado, no solo prender.

#### Cambios de schema

```prisma
model NewsletterSubscriber {
  // ...campos existentes...
  resendContactId String? // id del contacto en la audiencia de Resend — permite actualizar/dar de baja sin re-buscar por email
}
```

#### Backend

| Archivo                                                                                              | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `newsletter/newsletter.service.ts`                                                                   | `subscribe` gana un paso más: después del upsert local, llama a Resend (`contacts.create` si no hay `resendContactId` guardado, `contacts.update` si ya existe — reactiva `unsubscribed: false`) y persiste el id devuelto. Nuevo método `unsubscribe(email)`: marca `isActive: false`, `unsubscribedAt: now()` localmente, y `contacts.update({ unsubscribed: true })` en Resend. Ambas llamadas a Resend son **fire-and-forget con catch+log** (mismo patrón que `AuthService.sendWelcomeEmail`) — un hipo de Resend nunca debe romper un alta/baja local. |
| `newsletter/dto/unsubscribe.dto.ts` (nuevo)                                                          | `{ email }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `newsletter/newsletter.controller.ts`                                                                | `POST /newsletter/unsubscribe` — público, mismo `@Throttle` que `subscribe`. Responde `{ ok: true }` siempre (mismo criterio anti-enumeración que `forgot-password`).                                                                                                                                                                                                                                                                                                                                                                                        |
| `backend/scripts/backfill-resend-contacts.ts` (nuevo, mismo patrón que `backfill-article-tracks.ts`) | Recorre los `NewsletterSubscriber` que ya existen en la DB (dados de alta antes de esta fase, sin `resendContactId`) y los sincroniza una sola vez contra la audiencia de Resend. Corre a mano (`pnpm --filter @nexoat/backend backfill:resend-contacts`), no en cada deploy.                                                                                                                                                                                                                                                                                |

#### Por qué el envío del newsletter sigue siendo manual (decisión, no limitación)

Aunque `POST /broadcasts` existe y funciona, redactar el contenido de un envío (elegir qué artículos destacar, escribir el copy) es trabajo editorial — no hay una fuente de verdad automática de "esto va en el newsletter de esta semana". Automatizarlo bien requeriría antes decidir una cadencia, una plantilla de curaduría, etc., que no se pidió todavía. Por ahora: se compone y manda a mano desde el dashboard de Resend, apuntando a la audiencia ya sincronizada por este código. Si más adelante se quiere automatizar (ej. "resumen semanal de artículos nuevos"), la Fase 3 ya deja la audiencia lista — solo faltaría construir el compositor.

#### Plan de verificación

1. Test de backend: `subscribe` con un contacto nuevo → llama a `contacts.create`, guarda el `resendContactId` devuelto.
2. Test de backend: `subscribe` de alguien que ya se había dado de baja → llama a `contacts.update` (no `create`), reactiva.
3. Test de backend: `unsubscribe` → marca inactivo localmente y llama a `contacts.update({ unsubscribed: true })`.
4. Test de backend: si la llamada a Resend falla, el alta/baja local igual se guarda (no rompe la respuesta al usuario).
5. Manual: suscribirse desde el formulario público (`HomeView`/`NewsletterForm`) → aparece en `GET /audiences/:id/contacts` de Resend con el mismo email.
6. Manual: `POST /newsletter/unsubscribe` → el contacto en Resend pasa a `unsubscribed: true`, sigue en la audiencia pero no recibiría un Broadcast futuro.
7. Manual: correr el script de backfill sobre los suscriptores que ya existían → todos terminan con `resendContactId` y aparecen en la audiencia de Resend.

### Fase 4 — "Preferencias de correo" (el ítem mockeado del menú)

- Ahora sí tiene sentido: pantalla `/mi-cuenta/preferencias` con un toggle "Recibir novedades por correo", que llama a `subscribe`/`unsubscribe` de `NewsletterService` usando el email de la cuenta logueada — mismo mecanismo que ya usa el formulario público, ahora expuesto también desde la cuenta.
- Un solo toggle alcanza hoy: es la única categoría de correo opcional que existe. Si en el futuro se suma otro tipo de aviso opcional (ej. "cuando se habiliten los niveles pagos"), se separa en una lista de toggles recién ahí.

## Fuera de alcance (de todo el documento)

- Automatizar el envío del newsletter al publicar un artículo (sigue siendo manual vía el dashboard de Resend, ver Fase 3).
- Cualquier campaña de email más allá del newsletter simple (drip campaigns, segmentación avanzada) — no lo pidió el proyecto.

Los pasos de verificación de cada fase están en su propia sección arriba (o en `email-verification-and-password-reset.md` para la Fase 2).
