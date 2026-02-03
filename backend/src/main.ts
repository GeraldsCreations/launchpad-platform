import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Log environment info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [Bootstrap] Environment check:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  DATABASE_HOST:', process.env.DATABASE_HOST || 'NOT SET');
    console.log('  DATABASE_PORT:', process.env.DATABASE_PORT || 'NOT SET');
    console.log('  DATABASE_NAME:', process.env.DATABASE_NAME || 'NOT SET');
    console.log('  DATABASE_USER:', process.env.DATABASE_USER || 'NOT SET');
    console.log('  DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '***' + process.env.DATABASE_PASSWORD.slice(-4) : 'NOT SET');
    console.log('  DATABASE_SSL:', process.env.DATABASE_SSL || 'NOT SET');
    console.log('  SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL || 'NOT SET');
  }

  // Configure Winston logger
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context }) => {
            return `${timestamp} [${context}] ${level}: ${message}`;
          }),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger });

  // Security middleware (configure helmet to allow CORS in development)
  app.use(helmet.default({
    contentSecurityPolicy: false, // Disable CSP to allow cross-origin requests in development
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  
  // Body size limits (DDoS protection)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  const apiPrefix = process.env.API_PREFIX || 'v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('LaunchPad API')
    .setDescription('Token launch platform API for Solana')
    .setVersion('1.0')
    .addTag('tokens', 'Token operations')
    .addTag('trading', 'Trading operations')
    .addTag('analytics', 'Analytics and statistics')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 LaunchPad API running on http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
