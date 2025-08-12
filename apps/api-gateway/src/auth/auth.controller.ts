import {
  Controller,
  Post,
  Body,
  Inject,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import {
  LoginDto,
  CreateUserDto,
  ChangeCredentialsDto,
  RefreshTokenDto,
  Public,
  Roles,
  UserRole,
  CurrentUser,
  RolesGuard,
  JwtAuthGuard,
} from '@app/common';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  @Public()
  @Get('test')
  async test() {
    return {
      message: 'API Gateway fonctionne !',
      timestamp: new Date().toISOString(),
      service: 'auth',
    };
  }

  @Public()
  @Get('test-email/:email')
  async testEmailWithParam(@Param('email') email: string) {
    return this.authService.send('auth.test-email', { email });
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.send('auth.login', {
      loginDto,
      userAgent,
      ipAddress,
    });
  }

  @Public()
  @Post('refresh')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.send('auth.refresh', {
      refreshTokenDto,
      userAgent,
      ipAddress,
    });
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.send('auth.logout', {
      refreshToken: body.refreshToken,
    });
  }

  @Post('logout-all')
  async logoutAllDevices(@CurrentUser() user: any) {
    return this.authService.send('auth.logout-all', {
      userId: user.id,
    });
  }

  @Public()
  @Post('setup-account')
  async setupAccount(
    @Body() changeCredentialsDto: ChangeCredentialsDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.send('auth.setup-account', {
      changeCredentialsDto,
      userAgent,
      ipAddress,
    });
  }

  @Public()
  @Post('seed-admin')
  async seedAdmin() {
    return this.authService.send('auth.seed-admin', {});
  }

  // Routes protégées existantes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('create-user')
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.authService.send('auth.create-user', {
      createUserDto,
      adminId: user.id,
    });
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return {
      message: 'Profil utilisateur',
      user: user,
      timestamp: new Date().toISOString(),
    };
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-only')
  async adminOnly(@CurrentUser() user: any) {
    return {
      message: 'Route réservée aux administrateurs',
      admin: user,
      timestamp: new Date().toISOString(),
    };
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT_TERRAIN)
  @Get('agent-only')
  async agentOnly(@CurrentUser() user: any) {
    return {
      message: 'Route réservée aux agents de terrain',
      agent: user,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  async health() {
    return {
      status: 'UP',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
