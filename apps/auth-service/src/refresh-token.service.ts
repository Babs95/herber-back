import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma-service';
import { randomBytes } from 'crypto';

@Injectable()
export class RefreshTokenService {
  constructor(private prisma: PrismaService) {}

  async createRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Générer un token unique
    const token = randomBytes(64).toString('hex');

    // Expiration dans 7 jours
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Sauvegarder en base
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return token;
  }

  async validateRefreshToken(token: string) {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken) {
      return null;
    }

    // Vérifier si expiré
    if (refreshToken.expiresAt < new Date()) {
      await this.revokeRefreshToken(token);
      return null;
    }

    // Vérifier si révoqué
    if (refreshToken.isRevoked) {
      return null;
    }

    // Vérifier si l'utilisateur est actif
    if (!refreshToken.user.isActive) {
      return null;
    }

    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        token,
        isRevoked: false, // On ne révoque que les tokens actifs
      },
      data: { isRevoked: true },
    });

    // Retourne true si au moins 1 token a été révoqué
    return result.count > 0;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
      },
    });
  }
}
