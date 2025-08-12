import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggingService } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    private loggingService: LoggingService,
    private serviceName: string,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, body, query, headers, ip } = request;
    const user = request.user; // Si authentifié

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;

        // Log de succès
        this.loggingService.logApiRequest({
          method,
          url,
          statusCode: response.statusCode,
          responseTime,
          userId: user?.id,
          userRole: user?.role,
          userAgent: headers['user-agent'],
          ipAddress: ip,
          service: this.serviceName,
          requestBody: this.sanitizeBody(body),
          queryParams: query,
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        // Log d'erreur
        this.loggingService.logApiRequest({
          method,
          url,
          statusCode: error.status || 500,
          responseTime,
          userId: user?.id,
          userRole: user?.role,
          userAgent: headers['user-agent'],
          ipAddress: ip,
          service: this.serviceName,
          requestBody: this.sanitizeBody(body),
          queryParams: query,
          error: error.message,
          stackTrace: error.stack,
        });

        throw error;
      }),
    );
  }

  private sanitizeBody(body: any) {
    if (!body) return null;

    // Supprimer les mots de passe des logs
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.newPassword) sanitized.newPassword = '[REDACTED]';
    if (sanitized.confirmPassword) sanitized.confirmPassword = '[REDACTED]';

    return sanitized;
  }
}
