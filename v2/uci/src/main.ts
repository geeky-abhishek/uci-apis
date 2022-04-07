import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from './global-services/prisma.service';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  DocumentBuilder,
  FastifySwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  /** Fastify Application */
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const configService = app.get<ConfigService>(ConfigService);
  const brokers = [configService.get('KAFKA_HOST_DEV')];

  const microservice = app.connectMicroservice({
    transport: Transport.KAFKA,
    name: 'SUNBIRD_TELEMETRY',
    options: {
      client: {
        brokers: brokers,
      },
      consumer: {
        groupId: 'uci-api',
      },
    },
  });

  /** Register Prismaservice LifeCycle hooks */
  const prismaService: PrismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  /** Global prefix: Will result in appending of keyword 'admin' at the start of all the request */
  app.setGlobalPrefix('admin');

  /** Enable global versioning of all the API's, default version will be v1 */
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });
  app.useGlobalPipes(new ValidationPipe());

  /** OpenApi spec Document builder for Swagger Api Explorer  */
  const config = new DocumentBuilder()
    .setTitle('UCI')
    .setDescription('UCI API description')
    .setVersion('1.0')
    .build();
  const customOptions: FastifySwaggerCustomOptions = {
    uiConfig: {
      docExpansion: null,
    },
  };
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, customOptions);

  //await app.startAllMicroservices();
  await app.listen(3001, '0.0.0.0');
  console.log(`App Listening to ${3001}`);
}
bootstrap();