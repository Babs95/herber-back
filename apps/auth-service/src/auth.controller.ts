import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  LoginDto,
  CreateUserDto,
  ChangeCredentialsDto,
  RefreshTokenDto,
} from '@app/common';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.login')
  async login(data: {
    loginDto: LoginDto;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.authService.login(
      data.loginDto,
      data.userAgent,
      data.ipAddress,
    );
  }

  @MessagePattern('auth.refresh')
  async refreshToken(data: {
    refreshTokenDto: RefreshTokenDto;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.authService.refreshToken(
      data.refreshTokenDto,
      data.userAgent,
      data.ipAddress,
    );
  }

  @MessagePattern('auth.logout')
  async logout(data: { refreshToken: string }) {
    return this.authService.logout(data.refreshToken);
  }

  @MessagePattern('auth.logout-all')
  async logoutAllDevices(data: { userId: string }) {
    return this.authService.logoutAllDevices(data.userId);
  }

  @MessagePattern('auth.create-user')
  async createUser(data: { createUserDto: CreateUserDto; adminId: string }) {
    return this.authService.createUser(data);
  }

  @MessagePattern('auth.setup-account')
  async setupAccount(data: {
    changeCredentialsDto: ChangeCredentialsDto;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.authService.setupAccount(
      data.changeCredentialsDto,
      data.userAgent,
      data.ipAddress,
    );
  }

  @MessagePattern('auth.seed-admin')
  async seedAdmin() {
    return this.authService.seedDefaultAdmin();
  }

  @MessagePattern('auth.test-email')
  async testEmail(data: { email: string }) {
    return this.authService.testEmail(data);
  }
}
