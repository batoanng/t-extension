import 'reflect-metadata';

import multipart from '@fastify/multipart';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { ApplicationModule } from './modules/app.module';
import { CommonModule, LogInterceptor } from './modules/common';
import { config } from './types/config';

const API_DEFAULT_PORT = 3000;
const API_DEFAULT_VERSION = 1;
const SWAGGER_PREFIX = '/docs';
const SWAGGER_TITLE = "nest API";
const SWAGGER_DESCRIPTION = "REST API for nest.\n\nAuthentication modes:\n- Local JWT access tokens for authenticated REST endpoints.\n- Refresh tokens are exchanged through /auth/refresh and invalidated client-side through /auth/logout.\n- Dedicated health bearer token for /health.\n\nMultipart upload endpoints expect a `file` field in `multipart/form-data`.";

let appPromise: Promise<NestFastifyApplication> | undefined;

function createSwagger(app: INestApplication): void {
  const apiVersion = String(config.API_VERSION || API_DEFAULT_VERSION);
  const apiBasePath = `/api/v${apiVersion}`;
  const options = new DocumentBuilder()
    .setTitle(SWAGGER_TITLE)
    .setDescription(SWAGGER_DESCRIPTION)
    .setVersion(apiVersion)
    .setOpenAPIVersion('3.0.0')
    .addServer(apiBasePath, 'Versioned REST API base path')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token for authenticated REST endpoints.',
      },
      'jwt',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'token',
        description: 'Health check bearer token.',
      },
      'health-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(SWAGGER_PREFIX, app, document);
}

export async function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  const origins = (config.CORS_ORIGIN ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);

  adapter.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-OpenAI-Api-Key',
      'x-openai-api-key',
      'Stripe-Signature',
      'stripe-signature',
      'X-Request-Id',
    ],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    ApplicationModule,
    adapter,
    {
      rawBody: true,
    },
  );

  app.setGlobalPrefix(`api/v${config.API_VERSION || API_DEFAULT_VERSION}`);

  if (config.SWAGGER_ENABLE) {
    createSwagger(app);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const logInterceptor = app.select(CommonModule).get(LogInterceptor);
  app.useGlobalInterceptors(logInterceptor);

  await app.register(multipart as never, {
    limits: {
      fileSize: 1024 * 1024 * 1024,
      fields: 20,
      headerPairs: 2000,
    },
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

async function getApp(): Promise<NestFastifyApplication> {
  if (!appPromise) {
    appPromise = createApp().catch((error: unknown) => {
      appPromise = undefined;
      throw error;
    });
  }

  return appPromise;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const app = await getApp();
  const fastify = app.getHttpAdapter().getInstance();

  fastify.server.emit('request', request, response);
}

async function bootstrap(): Promise<void> {
  const app = await getApp();
  const port = Number(config.API_PORT || API_DEFAULT_PORT);
  await app.listen(port, '0.0.0.0');

  console.info(`Server is running on port ${port}`);
}

if (!process.env.VERCEL) {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
