import { NestFactory } from '@nestjs/core';
import { MonitoringServiceModule } from './monitoring-service.module';

async function bootstrap() {
  const app = await NestFactory.create(MonitoringServiceModule);

  app.enableCors();

  const port = process.env.MONITORING_PORT || 3003;
  await app.listen(port);

  console.log(`📊 Monitoring Service démarré sur http://localhost:${port}`);
}
bootstrap();
