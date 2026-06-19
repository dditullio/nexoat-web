import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  )

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  const config = new DocumentBuilder()
    .setTitle('NexoAT API')
    .setDescription('API del blog NexoAT — Acompañamiento Terapéutico')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`NexoAT backend escuchando en http://localhost:${port}`)
}

bootstrap()
