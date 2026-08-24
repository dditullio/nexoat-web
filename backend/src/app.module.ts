import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ArticlesModule } from './articles/articles.module'
import { AuditModule } from './audit/audit.module'
import { NewsletterModule } from './newsletter/newsletter.module'
import { MailModule } from './mail/mail.module'
import { MediaModule } from './media/media.module'
import { BackupModule } from './backup/backup.module'
import { SettingsModule } from './settings/settings.module'
import { ProfileModule } from './profile/profile.module'
import { ReaderLibraryModule } from './reader-library/reader-library.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Límite global razonable; endpoints sensibles (login/register) agregan
    // su propio @Throttle más estricto encima de este.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ArticlesModule,
    AuditModule,
    NewsletterModule,
    MediaModule,
    BackupModule,
    SettingsModule,
    ProfileModule,
    ReaderLibraryModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
