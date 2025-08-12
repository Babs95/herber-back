import { Controller, Get, Query, Param } from '@nestjs/common';
import { HealthService } from './health.service';
import { LoggingService } from '@app/logging';
import { PrismaService } from '@app/prisma-service';

@Controller()
export class MonitoringController {
  constructor(
    private healthService: HealthService,
    private loggingService: LoggingService,
    private prisma: PrismaService,
  ) {}

  // Health check de ce service
  @Get('health')
  async health() {
    return this.healthService.checkHealth('monitoring-service');
  }

  // Vue d'ensemble du système
  @Get('dashboard')
  async getDashboard() {
    const [overview, recentLogs, logStats] = await Promise.all([
      this.healthService.getSystemOverview(),
      this.loggingService.getRecentLogs(50),
      this.loggingService.getLogStats(24),
    ]);

    return {
      overview,
      recentLogs,
      logStats,
      timestamp: new Date(),
    };
  }

  // Logs d'un service spécifique
  @Get('logs/:service')
  async getServiceLogs(
    @Param('service') service: string,
    @Query('limit') limit?: string,
  ) {
    return this.loggingService.getRecentLogs(
      limit ? parseInt(limit) : 100,
      service,
    );
  }

  // Health d'un service spécifique
  @Get('health/:service')
  async getServiceHealth(
    @Param('service') service: string,
    @Query('hours') hours?: string,
  ) {
    return this.healthService.getServiceHealth(
      service,
      hours ? parseInt(hours) : 24,
    );
  }

  // Statistiques détaillées
  @Get('stats')
  async getStats(@Query('period') period?: string) {
    const hours = period === 'week' ? 168 : period === 'day' ? 24 : 1;

    const [logStats, healthStats] = await Promise.all([
      this.loggingService.getLogStats(hours),
      this.healthService.getServiceHealth(undefined, hours),
    ]);

    return {
      period,
      logStats,
      healthStats,
      timestamp: new Date(),
    };
  }

  // Recherche dans les logs
  @Get('search')
  async searchLogs(
    @Query('q') query: string,
    @Query('service') service?: string,
    @Query('status') status?: string,
  ) {
    const where: any = {};

    if (service) where.service = service;
    if (status) where.statusCode = parseInt(status);
    if (query) {
      where.OR = [
        { url: { contains: query, mode: 'insensitive' } },
        { error: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.apiLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
