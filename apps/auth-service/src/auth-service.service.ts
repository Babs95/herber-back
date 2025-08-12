import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaServiceService } from '@app/prisma-service';
import {
  EmailService,
  LoginDto,
  CreateUserDto,
  ChangeCredentialsDto,
} from '@app/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthServiceService {
  constructor(
    private prisma: PrismaServiceService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // Seed Admin par défaut
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
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

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

      // Envoyer email de configuration
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

  // Login
  async login(loginDto: LoginDto) {
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
        requiresSetup: true,
        message: 'Vous devez configurer votre compte',
        setupToken: user.resetToken,
      };
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

    return {
      user: userResult,
      token: this.generateToken(userResult),
    };
  }

  // Création d'utilisateur (Admin seulement)
  async createUser(data: { createUserDto: CreateUserDto; adminId: string }) {
    const { createUserDto, adminId } = data;

    // TODO: Vérifier que l'admin existe (quand on aura l'auth JWT)
    console.log(`Admin ${adminId} crée un utilisateur`);

    // Vérifier unicité
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

    // Générer mot de passe temporaire et token
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

    // Envoyer email de bienvenue
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

  // Configuration du compte
  async setupAccount(changeCredentialsDto: ChangeCredentialsDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: changeCredentialsDto.resetToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // Vérifier unicité du nouvel email (si changé)
    if (user.email !== changeCredentialsDto.newEmail) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: changeCredentialsDto.newEmail },
      });

      if (emailExists) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    // Hash du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(
      changeCredentialsDto.newPassword,
      10,
    );

    // Mettre à jour l'utilisateur
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

    return {
      message: 'Compte configuré avec succès',
      user: userResult,
      token: this.generateToken(userResult),
    };
  }

  // Générer token JWT
  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
