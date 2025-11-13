import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubController } from './github/github.controller';
import { GithubService } from './github/github.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, GithubController],
  providers: [AppService, GithubService],
})
export class AppModule {}
