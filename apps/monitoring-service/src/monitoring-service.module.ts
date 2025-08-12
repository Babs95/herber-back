import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringController } from './monitoring.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '@app/prisma-service';
import { LoggingModule } from '@app/logging';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LoggingModule,
  ],
  controllers: [MonitoringController],
  providers: [HealthService],
})
export class MonitoringServiceModule {}
