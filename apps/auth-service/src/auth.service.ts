import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/prisma-service';
import {
  EmailService,
  LoginDto,
  CreateUserDto,
  ChangeCredentialsDto,
  RefreshTokenDto,
  TokenResponse,
  LoginResponse,
} from '@app/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  // Seed Admin (inchangé)
  async seedDefaultAdmin() {
    try {
      const adminExists = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (adminExists) {
        return { message: 'Admin existe déjà', admin: adminExists.email };
      }

      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_ADMIN_PASSWORD,
        10,
      );
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const admin = await this.prisma.user.create({
        data: {
          email: process.env.DEFAULT_ADMIN_EMAIL,
          username: 'admin',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'System',
          role: 'ADMIN',
          mustChangePassword: true,
          mustChangeEmail: true,
          isFirstLogin: true,
          resetToken,
          resetTokenExpiry,
        },
      });

      await this.emailService.sendWelcomeEmail(
        admin.email,
        resetToken,
        'ADMIN',
      );

      console.log('🔑 Admin par défaut créé. Email envoyé pour configuration.');
      return {
        message: 'Admin créé avec succès',
        email: admin.email,
        setupToken: resetToken,
      };
    } catch (error) {
      console.error('Erreur création admin:', error);
      throw new Error("Erreur lors de la création de l'admin");
    }
  }

  // 🆕 LOGIN AVEC REFRESH TOKENS
  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Vérifier si changement obligatoire
    if (user.mustChangePassword || user.mustChangeEmail || user.isFirstLogin) {
      return {
        user: null,
        tokens: null,
        requiresSetup: true,
        setupToken: user.resetToken,
      } as any;
    }

    // Mettre à jour lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userResult = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    // Générer les tokens
    const tokens = await this.generateTokens(userResult, userAgent, ipAddress);

    return {
      user: userResult,
      tokens,
    };
  }

  // 🆕 REFRESH TOKEN
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResponse> {
    const tokenData = await this.refreshTokenService.validateRefreshToken(
      refreshTokenDto.refreshToken,
    );

    if (!tokenData) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = {
      id: tokenData.user.id,
      email: tokenData.user.email,
      username: tokenData.user.username,
      firstName: tokenData.user.firstName,
      lastName: tokenData.user.lastName,
      role: tokenData.user.role,
    };

    // Révoquer l'ancien token
    await this.refreshTokenService.revokeRefreshToken(
      refreshTokenDto.refreshToken,
    );

    // Générer de nouveaux tokens
    return this.generateTokens(user, userAgent, ipAddress);
  }

  // 🆕 LOGOUT
  async logout(refreshToken: string): Promise<{ message: string }> {
    const isRevoked =
      await this.refreshTokenService.revokeRefreshToken(refreshToken);

    if (!isRevoked) {
      throw new UnauthorizedException('Refresh token invalide ou déjà révoqué');
    }

    return { message: 'Déconnexion réussie' };
  }

  // 🆕 LOGOUT ALL DEVICES
  async logoutAllDevices(userId: string): Promise<{ message: string }> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
    return { message: 'Déconnexion de tous les appareils réussie' };
  }

  // Création d'utilisateur (inchangé)
  async createUser(data: { createUserDto: CreateUserDto; adminId: string }) {
    const { createUserDto, adminId } = data;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException("Email ou nom d'utilisateur déjà utilisé");
    }

    const tempPassword = randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        mustChangePassword: true,
        mustChangeEmail: false,
        isFirstLogin: true,
        resetToken,
        resetTokenExpiry,
        createdBy: adminId,
      },
    });

    await this.emailService.sendWelcomeEmail(user.email, resetToken, user.role);

    return {
      message: 'Utilisateur créé avec succès. Email envoyé.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // Configuration du compte (mise à jour)
  async setupAccount(
    changeCredentialsDto: ChangeCredentialsDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: changeCredentialsDto.resetToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    if (user.email !== changeCredentialsDto.newEmail) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: changeCredentialsDto.newEmail },
      });

      if (emailExists) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    const hashedPassword = await bcrypt.hash(
      changeCredentialsDto.newPassword,
      10,
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: changeCredentialsDto.newEmail,
        password: hashedPassword,
        firstName: changeCredentialsDto.firstName,
        lastName: changeCredentialsDto.lastName,
        mustChangePassword: false,
        mustChangeEmail: false,
        isFirstLogin: false,
        emailVerified: true,
        resetToken: null,
        resetTokenExpiry: null,
        lastLoginAt: new Date(),
      },
    });

    const userResult = {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
    };

    const tokens = await this.generateTokens(userResult, userAgent, ipAddress);

    return {
      message: 'Compte configuré avec succès',
      user: userResult,
      tokens,
    };
  }

  // 🆕 GÉNÉRATION DES TOKENS
  private async generateTokens(
    user: any,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResponse> {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    // Access token court (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    // Refresh token long (7 jours)
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
      userAgent,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes en secondes
      tokenType: 'Bearer',
    };
  }

  // Test email (inchangé)
  async testEmail(data: { email: string }) {
    try {
      console.log('🧪 Test envoi email...');

      await this.emailService.sendWelcomeEmail(
        data.email,
        'test-token-123',
        'ADMIN',
      );

      return {
        success: true,
        message: 'Email de test envoyé avec succès !',
        to: data.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Erreur email:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN',
      };
    }
  }
}
