import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubController } from './github/github.controller';
import { GithubService } from './github/github.service';
import { GithubAppAuthService } from './github/app-auth/github-app-auth.service';
import { ChamadoIntegrationService } from './chamado/chamado-integration.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, GithubController],
  providers: [
    AppService,
    GithubService,
    GithubAppAuthService,
    ChamadoIntegrationService,
  ],
})
export class AppModule {}
