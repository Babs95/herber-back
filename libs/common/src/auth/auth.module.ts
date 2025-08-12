import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { AuthGuard } from './auth.guard';
import { PrismaModule } from '@app/prisma-service';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '24h' },
    }),
    PrismaModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, AuthGuard],
  exports: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    AuthGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
