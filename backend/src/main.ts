// Debe ser lo primero que corre (antes de cualquier otro import): carga
// `.env` en process.env de forma síncrona para que los @Module
// condicionales (ej. OAuth en AuthModule) puedan leer esas variables al
// evaluarse, antes de que ConfigModule.forRoot() exista.
import { loadEnv } from './common/load-env'
loadEnv()

import fastifyCookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { MAX_IMAGE_SIZE_BYTES } from './media/media.service'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

  await app.register(fastifyCookie)
  // Portadas de artículo (MediaController) — límite acá corta la subida a
  // mitad de archivo si se pasa, MediaController solo confirma el corte.
  await app.register(fastifyMultipart, { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } })

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    // El refresh token viaja como cookie httpOnly: el cliente necesita
    // 'credentials: include' y el servidor necesita reflejar el origin
    // (no '*') más esta flag para que el navegador la acepte.
    credentials: true,
    // @fastify/cors no incluye DELETE en su default — sin esto, cualquier
    // DELETE (ej. borrar un artículo) falla en el preflight con
    // "Method DELETE is not allowed by Access-Control-Allow-Methods".
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Por default el navegador solo deja leer un puñado de headers "seguros" de la respuesta vía
    // fetch(), aunque la petición haya sido same-origin lógicamente — Content-Disposition no está
    // en esa lista. Sin esto, downloadMyGift() (gifts.api.ts) no podía leer el nombre de archivo
    // real que arma el backend y tenía que reconstruirlo del lado del cliente con datos que se
    // desincronizaban del título actual del ebook (ver docs/features/welcome-ebook-gift.md, Fase 3).
    exposedHeaders: ['Content-Disposition'],
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  )

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  const config = new DocumentBuilder()
    .setTitle('NexoAT API')
    .setDescription('API del blog NexoAT — Acompañamiento Terapéutico')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`NexoAT backend escuchando en http://localhost:${port}`)
}

bootstrap()
