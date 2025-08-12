import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export enum Role {
  ADMIN = 'ADMIN',
  AGENT_TERRAIN = 'AGENT_TERRAIN',
}

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;

  @IsEnum(Role)
  role: Role;
}

export class ChangeCredentialsDto {
  @IsString()
  resetToken: string;

  @IsEmail()
  newEmail: string;

  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  lastName: string;
}

export class ResetPasswordDto {
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class LogoutDto {
  @IsString()
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tokens: TokenResponse;
  requiresSetup?: boolean;
  setupToken?: string;
}
