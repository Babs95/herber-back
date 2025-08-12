import { AuthServiceService } from './auth-service.service';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { LoginDto, CreateUserDto, ChangeCredentialsDto } from '@app/common';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthServiceService) {}

  @MessagePattern('auth.login')
  async login(loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern('auth.create-user')
  async createUser(data: { createUserDto: CreateUserDto; adminId: string }) {
    return this.authService.createUser(data);
  }

  @MessagePattern('auth.setup-account')
  async setupAccount(changeCredentialsDto: ChangeCredentialsDto) {
    return this.authService.setupAccount(changeCredentialsDto);
  }

  @MessagePattern('auth.seed-admin')
  async seedAdmin() {
    return this.authService.seedDefaultAdmin();
  }
}
