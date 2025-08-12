import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: parseInt(process.env.AUTH_SERVICE_PORT) || 3001,
      },
    },
  );

  await app.listen();
  console.log(
    `🔐 Auth Service démarré sur le port ${process.env.AUTH_SERVICE_PORT || 3001}`,
  );
}
bootstrap();
