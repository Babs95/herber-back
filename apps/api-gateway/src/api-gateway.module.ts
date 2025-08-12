import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { AuthModule, JwtAuthGuard, RolesGuard } from '@app/common';
import {
  LoggingModule,
  LoggingService,
  LoggingInterceptor,
} from '@app/logging';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    LoggingModule,
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: parseInt(process.env.AUTH_SERVICE_PORT) || 3001,
        },
      },
    ]),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (loggingService: LoggingService) =>
        new LoggingInterceptor(loggingService, 'api-gateway'),
      inject: [LoggingService],
    },
  ],
})
export class ApiGatewayModule {}
