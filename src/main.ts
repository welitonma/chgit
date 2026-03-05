import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('chGit API')
    .setDescription('Documentação da API chGit (NestJS + GitHub)')
    .setVersion('0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);

  const url = await app.getUrl();
  const displayUrl = url.replace(/\[::1\]|::1/g, 'localhost');
  Logger.log(`\n${displayUrl} \n${displayUrl}/docs`, 'app run');
}
void bootstrap();
