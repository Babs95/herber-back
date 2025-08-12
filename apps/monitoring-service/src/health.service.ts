import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma-service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async checkHealth(serviceName: string) {
    const startTime = Date.now();

    try {
      // Test de la base de données
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;

      // Métriques système
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const healthData = {
        service: serviceName,
        status: 'UP',
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: 0, // TODO: Calculer CPU usage
        uptime: Math.round(uptime),
        dbStatus: 'CONNECTED',
        dbLatency,
        timestamp: new Date(),
        details: JSON.stringify({
          memory: memoryUsage,
          nodeVersion: process.version,
          platform: process.platform,
        }),
      };

      // Sauvegarder en base
      await this.prisma.healthCheck.create({
        data: healthData,
      });

      return {
        ...healthData,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const healthData = {
        service: serviceName,
        status: 'DOWN',
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0,
        dbStatus: 'DISCONNECTED',
        dbLatency: 0,
        timestamp: new Date(),
        details: JSON.stringify({ error: error.message }),
      };

      try {
        await this.prisma.healthCheck.create({ data: healthData });
      } catch (dbError) {
        console.error('Failed to save health check:', dbError);
      }

      return {
        ...healthData,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async getServiceHealth(serviceName?: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.prisma.healthCheck.findMany({
      where: {
        service: serviceName,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getSystemOverview() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Services status
    const services = await this.prisma.healthCheck.groupBy({
      by: ['service'],
      where: { timestamp: { gte: oneDayAgo } },
      _max: { timestamp: true },
    });

    // Recent logs stats
    const logStats = await this.prisma.apiLog.groupBy({
      by: ['statusCode'],
      where: { timestamp: { gte: oneDayAgo } },
      _count: true,
    });

    return {
      services,
      logStats,
      timestamp: new Date(),
    };
  }
}
