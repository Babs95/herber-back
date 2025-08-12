import { Controller, Get, Delete, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles, Role, CurrentUser } from '@app/common';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  @Roles(Role.ADMIN) // Seuls les admins peuvent lister les utilisateurs
  @Get()
  async getAllUsers(@CurrentUser() admin: any) {
    return this.authService.send('users.get-all', { adminId: admin.id });
  }

  @Get('me') // Utilisateur peut voir son propre profil
  async getMyProfile(@CurrentUser() user: any) {
    return {
      user: user,
      message: 'Votre profil',
    };
  }

  @Roles(Role.ADMIN) // Seuls les admins peuvent voir un utilisateur spécifique
  @Get(':id')
  async getUser(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.authService.send('users.get-by-id', {
      userId: id,
      adminId: admin.id,
    });
  }

  @Roles(Role.ADMIN) // Seuls les admins peuvent désactiver
  @Delete(':id')
  async deactivateUser(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.authService.send('users.deactivate', {
      userId: id,
      adminId: admin.id,
    });
  }
}
