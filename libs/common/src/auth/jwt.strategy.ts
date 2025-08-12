import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@app/prisma-service';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Vérifier que l'utilisateur existe toujours et est actif
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        isFirstLogin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur invalide ou inactif');
    }

    // Si l'utilisateur doit encore configurer son compte
    if (user.mustChangePassword || user.isFirstLogin) {
      throw new UnauthorizedException(
        "Compte non configuré. Configurez votre compte d'abord.",
      );
    }

    return user;
  }
}
