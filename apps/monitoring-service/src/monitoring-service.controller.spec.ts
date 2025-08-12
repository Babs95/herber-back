import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring-service.controller';
import { HealthService } from './health.service';
import { LoggingService } from '@app/logging';
import { PrismaService } from '@app/prisma-service';

describe('MonitoringController', () => {
  let monitoringController: MonitoringController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkHealth: jest.fn(),
            getSystemOverview: jest.fn(),
            getServiceHealth: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            getRecentLogs: jest.fn(),
            getLogStats: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            apiLog: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    monitoringController = app.get<MonitoringController>(MonitoringController);
  });

  describe('controller', () => {
    it('should be defined', () => {
      expect(monitoringController).toBeDefined();
    });
  });
});
