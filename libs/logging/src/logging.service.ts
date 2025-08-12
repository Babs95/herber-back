import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma-service';
import * as winston from 'winston';

export interface ApiLogData {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  userRole?: string;
  userAgent?: string;
  ipAddress?: string;
  service: string;
  requestBody?: any;
  queryParams?: any;
  error?: string;
  stackTrace?: string;
}

@Injectable()
export class LoggingService {
  private logger: winston.Logger;

  constructor(private prisma: PrismaService) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    });
  }

  // Log API requests
  async logApiRequest(data: ApiLogData) {
    try {
      // Log en base de données
      await this.prisma.apiLog.create({
        data: {
          method: data.method,
          url: data.url,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          userId: data.userId,
          userRole: data.userRole,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          service: data.service,
          requestBody: data.requestBody
            ? JSON.stringify(data.requestBody)
            : null,
          queryParams: data.queryParams
            ? JSON.stringify(data.queryParams)
            : null,
          error: data.error,
          stackTrace: data.stackTrace,
        },
      });

      // Log dans Winston
      this.logger.http('API Request', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to log API request', error);
    }
  }

  // Log d'erreur avec stack trace
  async logError(error: Error, context?: string, metadata?: any) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      metadata,
      timestamp: new Date().toISOString(),
    };

    this.logger.error('Application Error', errorData);
  }

  // Log d'information
  logInfo(message: string, metadata?: any) {
    this.logger.info(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Log de warning
  logWarning(message: string, metadata?: any) {
    this.logger.warn(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Log de debug
  logDebug(message: string, metadata?: any) {
    this.logger.debug(message, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Obtenir les logs récents
  async getRecentLogs(limit: number = 100, service?: string) {
    return this.prisma.apiLog.findMany({
      where: service ? { service } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // Obtenir les statistiques
  async getLogStats(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await this.prisma.apiLog.groupBy({
      by: ['statusCode', 'service'],
      where: {
        timestamp: { gte: since },
      },
      _count: true,
      _avg: {
        responseTime: true,
      },
    });

    return stats;
  }
}
