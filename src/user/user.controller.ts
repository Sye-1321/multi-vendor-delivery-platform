import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { GetCurrentUserId } from '../infrastructure/decorators/get-user-id.decorator';
import { GetCurrentUser } from '../infrastructure/decorators/get-user.decorator';
import { TYPES } from '../application/constants/types';
import { Result } from '../domain/result/result';
import { AccessAuthGuard } from '../infrastructure/guards/access-auth.guard';
import { RefreshAuthGuard } from '../infrastructure/guards/refresh-auth.guard';
import { RoleGuard } from '../infrastructure/guards/role-guard';
import { UserService } from './user.service';
import {
  IUserResponse,
  IUserSignedInResponseDTO,
} from './interfaces/user-response.interface';
import { AuthService } from 'src/infrastructure/auth/auth.service';
import { Role } from 'src/application/constants/constants';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
import { CreateUserDTO } from './dtos/user/create-user.dto';
import { LoginDTO } from './dtos/auth/login.dto';
import { UpdateUserProfileDTO } from './dtos/user/update-profile.dto';
import { UpdatePasswordDTO } from './dtos/auth/update-password.dto';
import { ChangeEmailDTO } from './dtos/auth/change-email.dto';
import { EmailDTO } from './dtos/shared/email.dto';
import { ResetPasswordDTO } from './dtos/auth/reset-password.dto';
import { CreateAdminDTO } from './dtos/user/create-admin.dto';
import { AdminUpdateUserDTO } from './dtos/user/admin-update-user.dto';

@Controller()
export class UserController {
  constructor(
    @Inject(TYPES.IAuthService) private readonly authService: AuthService,
    @Inject(TYPES.IUserService) private readonly userService: UserService,
  ) {}

  @Post('/auth/register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() request: CreateUserDTO,
  ): Promise<Result<IUserResponse>> {
    return this.userService.createEndUser(request);
  }

  @Get('/auth/email-verification/:token')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Param('token') token: string): Promise<Result<any>> {
    return this.userService.verifyEmail(token);
  }

  @Post('/auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() request: LoginDTO,
  ): Promise<Result<IUserSignedInResponseDTO>> {
    return this.userService.signIn(request);
  }

  @UseGuards(AccessAuthGuard)
  @Post('/auth/logout')
  @HttpCode(HttpStatus.OK)
  async logOut(@GetCurrentUserId() userId: Types.ObjectId) {
    return this.userService.signOut(userId);
  }

  @UseGuards(RefreshAuthGuard)
  @Post('/auth/token/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @GetCurrentUser() user: any,
  ): Promise<Result<{ accessToken: string }>> {
    return this.userService.getAccessTokenAndUpdateRefreshToken(
      user.sub,
      user.token,
    );
  }

  @UseGuards(AccessAuthGuard)
  @Get('/users/me')
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @GetCurrentUserId() userId: Types.ObjectId,
  ): Promise<Result<IUserResponse>> {
    return this.userService.getUserById(userId);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('/users/me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetCurrentUserId() userId: Types.ObjectId,
    @Body() request: UpdateUserProfileDTO,
  ) {
    return this.userService.updateProfile(userId, request);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('/users/me/password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @GetCurrentUserId() userId: Types.ObjectId,
    @Body() request: UpdatePasswordDTO,
  ) {
    return this.userService.updatePassword(userId, request);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('/users/me/email')
  @HttpCode(HttpStatus.OK)
  async requestChangeEmail(
    @GetCurrentUserId() userId: Types.ObjectId,
    @Body() request: ChangeEmailDTO,
  ) {
    return this.userService.requestToChangeEmail(userId, request);
  }

  @Get('/users/new-email-verification/:token')
  @HttpCode(HttpStatus.OK)
  async verifyNewEmail(@Param('token') token: string) {
    return this.userService.verifyNewEmail(token);
  }

  @Post('/auth/password-reset/request')
  @HttpCode(HttpStatus.OK)
  async passwordResetRequest(@Body() request: EmailDTO) {
    return this.userService.requestToResetPassword(request);
  }

  @Post('/auth/password-reset/confirm/:token')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordReset(
    @Param('token') token: string,
    @Body() request: ResetPasswordDTO,
  ) {
    return this.userService.confirmPasswordReset(token, request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Delete('/users/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@GetCurrentUserId() userId: Types.ObjectId) {
    return this.userService.deactivateAccount(userId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.SYSTEM_ADMINISTRATOR)
  @Post('/admin/users/company')
  @HttpCode(HttpStatus.CREATED)
  async createCompanyAdmin(
    @Body() request: CreateAdminDTO,
  ): Promise<Result<IUserResponse>> {
    return this.userService.createCompanyAdmin(request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @Post('/admin/users/restaurant')
  @HttpCode(HttpStatus.CREATED)
  async createRestaurantAdmin(
    @Body() request: CreateAdminDTO,
  ): Promise<Result<IUserResponse>> {
    return this.userService.createRestaurantAdmin(request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get('/admin/users')
  @HttpCode(HttpStatus.OK)
  async getAllUsers(): Promise<Result<IUserResponse[]>> {
    return this.userService.getUsers();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.SYSTEM_ADMINISTRATOR)
  @Patch('/admin/users/:id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') userId: Types.ObjectId,
    @Body() request: AdminUpdateUserDTO,
  ) {
    return this.userService.adminUpdateUser(userId, request);
  }
}
