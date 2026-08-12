# Copias de seguridad de la base de datos

**Estado:** implementado.

## Contexto

El contenido del sitio (artículos, categorías, usuarios, auditoría, suscriptores) vive únicamente en PostgreSQL. Hasta ahora la única forma de respaldarlo o de mover datos entre entornos era `pg_dump`/`psql` a mano, lo que:

- exige acceso al servidor y a las credenciales de la DB,
- produce un dump atado a la versión del motor y al esquema físico, poco práctico para revisar o editar,
- no deja ningún rastro de quién respaldó qué ni por qué.

Se necesita algo que el super-admin pueda disparar desde el panel, que produzca un archivo portable y legible, y que sirva además como mecanismo de **intercambio de datos entre la DB de desarrollo y la de producción** (ej. cargar en local el contenido real para probar un cambio de diseño, o subir a producción los artículos redactados en local).

## Alcance

- Respaldo **manual** (no hay programación automática por ahora).
- Genera un `.zip` guardado en una carpeta del propio backend.
- Listado de respaldos existentes en el panel, con descarga.
- Restauración desde un respaldo de la lista **o** desde un `.zip` subido.
- Confirmación explícita del usuario antes de respaldar y antes de restaurar.
- Solo `SUPER_ADMIN`.

**Fuera de alcance (deliberado):**

- Borrar respaldos desde el panel. No fue pedido y es una acción destructiva más; la carpeta se limpia a mano por ahora. Candidato natural para una segunda iteración, junto con una retención automática (ej. conservar los últimos N).
- Respaldo/restauración de las imágenes de Cloudinary. El zip guarda las **URLs** de las portadas, no los binarios: las imágenes viven en una cuenta de Cloudinary compartida entre entornos, así que una DB de desarrollo restaurada desde producción sigue mostrando las mismas fotos sin copiar nada.
- Programación automática (cron) y envío del zip a un storage externo.

## Decisiones técnicas

### 1. JSONL por tabla dentro de un zip, no `pg_dump`

El zip contiene una línea JSON por fila (`.jsonl`), un archivo por tabla, más un `metadata.json`. Frente a un dump SQL:

- es **legible y diffeable** — se puede abrir el zip y mirar/editar un artículo puntual;
- **no depende de la versión de PostgreSQL** ni del esquema físico: se restaura vía Prisma Client, que valida tipos y respeta el esquema actual de la app;
- JSONL en vez de un único JSON gigante para que un archivo grande se pueda procesar línea a línea y para que un diff muestre solo las filas que cambiaron.

El costo es que **no es un respaldo de infraestructura**: no incluye índices, secuencias, migraciones ni tablas fuera del esquema de Prisma. Es un respaldo _de contenido_. Ante un desastre total del servidor sigue siendo `pg_dump` la herramienta correcta; esto cubre el caso real del proyecto (mover y proteger el contenido).

### 2. Contenido del zip

```
nexoat-backup-20260811-153000.zip
├── metadata.json
└── data/
    ├── categories.jsonl
    ├── tags.jsonl
    ├── users.jsonl
    ├── articles.jsonl
    ├── article_categories.jsonl
    ├── article_tags.jsonl
    ├── oauth_accounts.jsonl
    ├── audit_logs.jsonl
    └── newsletter_subscribers.jsonl
```

`metadata.json`:

```json
{
  "formatVersion": 1,
  "createdAt": "2026-08-11T18:30:00.000Z",
  "kind": "manual",
  "comment": "antes de importar los artículos de agosto",
  "createdBy": { "id": "…", "email": "…", "name": "…" },
  "source": { "environment": "development", "database": "nexoat_dev" },
  "counts": { "categories": 10, "articles": 2, "users": 1, "…": 0 }
}
```

- `formatVersion` permite rechazar de entrada un zip de un formato futuro incompatible.
- `kind` distingue `manual` de `pre-restore` (ver punto 5).
- `source.database` es **solo el nombre de la base**, extraído de `DATABASE_URL` — nunca host, usuario ni contraseña. Sirve para darse cuenta de que se está por restaurar un respaldo de producción sobre desarrollo, o al revés.
- `counts` permite mostrar en la UI qué trae el archivo sin abrirlo entero.

### 3. Qué tablas entran y cuáles no

El orden del registro (`backup.tables.ts`) es el orden de **inserción**; la eliminación va en orden inverso. Eso resuelve las claves foráneas sin desactivar restricciones.

**Se incluyen:** `categories`, `tags`, `users`, `articles`, `article_categories`, `article_tags`, `oauth_accounts`, `audit_logs`, `newsletter_subscribers`.

**Se excluye `refresh_tokens`.** Son estado de sesión efímero, no contenido: mover sesiones activas entre dos entornos no tiene ningún sentido y sería un riesgo gratuito. Como `RefreshToken.userId` tiene `onDelete: Cascade`, al borrar los usuarios durante una restauración todos los refresh tokens se van solos — es decir, **toda restauración cierra las sesiones abiertas**, incluida la de quien la ejecuta si su usuario no está en el respaldo. La UI lo advierte.

**`users.passwordHash` sí se incluye.** Sin él, los usuarios restaurados no podrían iniciar sesión y el intercambio dev↔prod sería inútil. Es un hash bcrypt, no la contraseña, pero implica que **el zip es material sensible**: contiene emails y hashes de contraseña de todas las cuentas. De ahí que la carpeta esté en `.gitignore`, que la descarga exija sesión de `SUPER_ADMIN`, y que el archivo descargado deba tratarse como un secreto.

### 4. Serialización y rehidratación

- Las fechas se guardan como ISO 8601. Al restaurar se reconstruyen como `Date` usando la lista explícita de campos de fecha de cada tabla (`dateFields` en el registro), **no** con una detección genérica por expresión regular — un `content` de artículo podría contener algo con forma de fecha y no queremos adivinar.
- Al insertar se **omiten las claves cuyo valor es `null`**, en vez de pasarlas explícitamente. Esto evita el caso especial de Prisma con campos `Json` nulables (`AuditLog.metadata`, que exige `Prisma.DbNull` en vez de `null`) y es seguro acá porque en el esquema no hay ningún campo nulable con `@default` — omitir una clave nula produce exactamente el mismo `null`.
- La inserción usa `createMany` conservando los `id` originales (cuids), para que las tablas puente sigan apuntando a las filas correctas.

### 5. Semántica de la restauración: reemplazo total, en una transacción, con red de seguridad

Restaurar **no** fusiona: borra todas las filas de las tablas del respaldo (en orden inverso) e inserta las del zip, todo dentro de una única transacción interactiva de Prisma. O queda todo el estado del respaldo, o no cambia nada.

- La transacción se abre con `timeout: 120_000` — el default de Prisma es 5 s, insuficiente para un borrado + inserción completos.
- Antes de tocar nada se genera automáticamente un respaldo `kind: "pre-restore"` del estado actual. Si la restauración resultó ser un error, el estado previo está en la lista, a un clic. Su nombre lleva el sufijo `-previo-restauracion`.
- El zip se **valida entero antes** de abrir la transacción: `metadata.json` presente y parseable, `formatVersion` soportado, todos los archivos de datos presentes, y todas las líneas parseables como objetos JSON. Un zip corrupto o ajeno falla sin haber borrado nada.
- La entrada de auditoría se registra **después** de que la transacción cierra (si se registrara antes, la propia restauración la borraría). Como el actor puede no existir en la DB restaurada, se comprueba su existencia: si desapareció, el registro queda con `actorId: null` y el email del actor en `metadata`, en vez de fallar por clave foránea.

### 6. Almacenamiento y nombres de archivo

- Carpeta: `backend/storage/backups/`, configurable con `BACKUP_DIR`. Está en `.gitignore` (contiene datos personales) y se crea sola si no existe.
- Nombre: `nexoat-backup-YYYYMMDD-HHmmss.zip` (más `-previo-restauracion` en los automáticos). Fecha en el nombre para que el archivo descargado sea identificable fuera del panel.
- El listado lee el `metadata.json` de **dentro** de cada zip en lugar de mantener un índice o un archivo sidecar: una sola fuente de verdad, y un zip subido a mano a la carpeta aparece igual en la lista. Con decenas de archivos el costo es despreciable; si algún día fueran cientos, se agrega un índice cacheado.
- El nombre que llega por parámetro se valida contra `/^[A-Za-z0-9._-]+\.zip$/` **y** se verifica que la ruta resuelta caiga dentro de la carpeta de respaldos, para cerrar cualquier salto de directorio (`../../.env`).

### 7. `jszip` como dependencia nueva

Node no trae API de zip (`zlib` hace deflate, no el contenedor). `jszip` es dependencia única, pura JS, sirve para leer y escribir, trabaja con buffers en memoria y trae sus propios tipos. Alternativas descartadas: `archiver` + `unzipper` (dos dependencias, solo escritura/lectura respectivamente) y `adm-zip` (API síncrona, historial de CVEs de path traversal al extraer a disco). Los respaldos de un blog son de pocos MB, así que trabajar enteramente en memoria es razonable.

### 8. Límite de tamaño en la subida

`@fastify/multipart` se registra globalmente en `main.ts` con el límite de imágenes (5 MB). Un zip de respaldo puede superarlo, así que la ruta de restauración por subida pasa su propio límite en `req.file({ limits: { fileSize: MAX_BACKUP_UPLOAD_BYTES } })` (50 MB) — las opciones por request pisan a las del plugin (`deepmergeAll` en el plugin, las del request van último). Así el límite de imágenes sigue intacto para el resto de la app.

## Endpoints

Todos bajo `@Roles(Role.SUPER_ADMIN)` + `JwtAuthGuard`/`RolesGuard`, con el prefijo de versión `/v1`.

| Método | Ruta                                | Qué hace                                                   |
| ------ | ----------------------------------- | ---------------------------------------------------------- |
| `GET`  | `/admin/backups`                    | Lista los respaldos (metadata + tamaño), más nuevo primero |
| `POST` | `/admin/backups`                    | Crea uno nuevo; body `{ comment?: string }`                |
| `GET`  | `/admin/backups/:filename/download` | Descarga el zip                                            |
| `POST` | `/admin/backups/:filename/restore`  | Restaura desde un respaldo de la lista                     |
| `POST` | `/admin/backups/restore-upload`     | Restaura desde un zip subido (multipart, campo `file`)     |

Acciones auditadas: `backup.create` y `backup.restore` (con `filename`, `counts` y el `source` del respaldo en `metadata`).

## Archivos

**Backend**

- `src/backup/backup.module.ts`
- `src/backup/backup.controller.ts`
- `src/backup/backup.service.ts` — crear, listar, leer, restaurar
- `src/backup/backup.tables.ts` — registro de tablas (orden, delegate de Prisma, campos de fecha)
- `src/backup/dto/create-backup.dto.ts`
- `src/backup/backup.service.spec.ts`
- `src/app.module.ts` — registra `BackupModule`
- `.gitignore` — ignora `backend/storage/`
- `.env.example` — documenta `BACKUP_DIR`

**Frontend**

- `src/views/admin/AdminBackupsView.vue`
- `src/services/admin/backups.api.ts`
- `src/services/http.ts` — se extrae `requestWithRetry()` y se agrega `httpBlob()` (la descarga necesita el header `Authorization`, así que no puede ser un `<a href>` pelado: se baja como blob y se dispara un enlace temporal)
- `src/components/admin/ConfirmDialog.vue` — `<dialog>` nativo (foco atrapado y Esc gratis), con slot para el campo de comentario
- `src/components/admin/icons/IconArchive.vue`
- `src/types/admin.ts` — `BackupSummary`, `BackupMetadata`, `RestoreResult`
- `src/router/index.ts` — ruta `respaldos`, `minRole: ['SUPER_ADMIN']`
- `src/layouts/AdminLayout.vue` y `src/views/admin/AdminDashboardView.vue` — acceso, visible solo para `SUPER_ADMIN`

## Plan de verificación

1. `pnpm test` en el backend — los tests del servicio cubren serialización/rehidratación, validación del nombre de archivo y rechazo de zips inválidos.
2. En el navegador, con sesión de super-admin en `/nexoat-admin/respaldos`:
   - crear un respaldo con comentario y verificar que aparece en la lista con los conteos correctos;
   - descargarlo y comprobar que el zip abre y trae `metadata.json` + los `.jsonl` esperados;
   - modificar datos (ej. borrar un artículo), restaurar desde la lista y confirmar que el artículo vuelve;
   - verificar que se creó el respaldo automático `pre-restore`;
   - restaurar subiendo el zip descargado y confirmar el mismo resultado;
   - comprobar en `/nexoat-admin/auditoria` las entradas `backup.create` y `backup.restore`.
3. Verificar que un usuario con rol `ADMIN` no ve el ítem en el menú y recibe 403 al llamar los endpoints.
