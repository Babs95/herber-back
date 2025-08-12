import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Vérifier si la route est marquée comme publique
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const token = request.headers.authorization;

      if (!token) {
        throw new UnauthorizedException('Token JWT manquant');
      }

      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token JWT expiré');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token JWT invalide');
      }

      throw new UnauthorizedException('Authentification échouée');
    }

    return user;
  }
}
