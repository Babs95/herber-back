import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private rolesGuard: RolesGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // D'abord vérifier l'authentification JWT
    const jwtResult = await this.jwtAuthGuard.canActivate(context);

    if (!jwtResult) {
      return false;
    }

    // Puis vérifier les rôles
    return this.rolesGuard.canActivate(context);
  }
}
