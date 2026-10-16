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
  Query,
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
import { AccountActionTokenDTO } from './dtos/auth/account-action-token.dto';
import { AccountActionPasswordDTO } from './dtos/auth/account-action-password.dto';
import { CreateAdminDTO } from './dtos/user/create-admin.dto';
import { AdminUpdateUserDTO } from './dtos/user/admin-update-user.dto';
import { ISignUpTokens } from 'src/infrastructure/auth/interfaces/auth.interface';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import { PaginationQueryDTO } from 'src/shared/dtos/pagination-query.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiNoContentResponse,
  ApiResultResponse,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';
import {
  SignedInUserSchema,
  TokenPairSchema,
  UserSchema,
} from 'src/infrastructure/swagger/swagger.schemas';

@ApiTags('Users')
@Controller()
export class UserController {
  constructor(
    @Inject(TYPES.IAuthService) private readonly authService: AuthService,
    @Inject(TYPES.IUserService) private readonly userService: UserService,
  ) {}

  @Post('/auth/register')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Register an end-user account' })
  @ApiResultResponse(HttpStatus.CREATED, { model: UserSchema })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() request: CreateUserDTO,
  ): Promise<Result<IUserResponse>> {
    return this.userService.createEndUser(request);
  }

  @Post('/auth/email-verification/confirm')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Confirm an email address' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() request: AccountActionTokenDTO,
  ): Promise<Result<any>> {
    return this.userService.verifyEmail(request.token);
  }

  @Post('/auth/email-verification/resend')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(@Body() request: EmailDTO) {
    return this.userService.resendEmailVerification(request);
  }

  @Post('/auth/login')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Sign in and issue access and refresh tokens' })
  @ApiResultResponse(HttpStatus.OK, { model: SignedInUserSchema })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() request: LoginDTO,
  ): Promise<Result<IUserSignedInResponseDTO>> {
    return this.userService.signIn(request);
  }

  @UseGuards(AccessAuthGuard)
  @Post('/auth/logout')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Sign out and revoke account access' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async logOut(@GetCurrentUserId() userId: Types.ObjectId) {
    return this.userService.signOut(userId);
  }

  @UseGuards(RefreshAuthGuard)
  @Post('/auth/refresh')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Rotate a refresh token and issue new tokens' })
  @ApiBearerAuth('refresh-token')
  @ApiResultResponse(HttpStatus.OK, { model: TokenPairSchema })
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @GetCurrentUser() user: any,
  ): Promise<Result<ISignUpTokens>> {
    return this.userService.getAccessTokenAndUpdateRefreshToken(
      user.sub,
      user.token,
    );
  }

  @UseGuards(AccessAuthGuard)
  @Get('/users/me')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK, { model: UserSchema })
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @GetCurrentUserId() userId: Types.ObjectId,
  ): Promise<Result<IUserResponse>> {
    return this.userService.getUserById(userId);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('/users/me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK, { model: UserSchema })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetCurrentUserId() userId: Types.ObjectId,
    @Body() request: UpdateUserProfileDTO,
  ) {
    return this.userService.updateProfile(userId, request);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('/users/me/password')
  @ApiOperation({ summary: 'Change the current user password' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @GetCurrentUserId() userId: Types.ObjectId,
    @Body() request: UpdatePasswordDTO,
  ) {
    return this.userService.updatePassword(userId, request);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('/users/me/email')
  @ApiOperation({ summary: 'Request an email address change' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async requestChangeEmail(
    @GetCurrentUserId() userId: Types.ObjectId,
    @Body() request: ChangeEmailDTO,
  ) {
    return this.userService.requestToChangeEmail(userId, request);
  }

  @Post('/auth/email-change/confirm')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Confirm a requested email address change' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async verifyNewEmail(@Body() request: AccountActionTokenDTO) {
    return this.userService.verifyNewEmail(request.token);
  }

  @Post('/auth/password-reset/request')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async passwordResetRequest(@Body() request: EmailDTO) {
    return this.userService.requestToResetPassword(request);
  }

  @Post('/auth/password-reset/confirm')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Confirm a password reset' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async verifyPasswordReset(@Body() request: AccountActionPasswordDTO) {
    const { token, newPassword, confirmPassword } = request;
    return this.userService.confirmPasswordReset(token, {
      newPassword,
      confirmPassword,
    });
  }

  @Post('/auth/registration-completion/confirm')
  @ApiTags('Authentication')
  @ApiOperation({ summary: 'Complete an invited administrator registration' })
  @ApiResultResponse(HttpStatus.OK, { model: UserSchema })
  @HttpCode(HttpStatus.OK)
  async completeAdminRegistration(
    @Body() request: AccountActionPasswordDTO,
  ): Promise<Result<IUserResponse>> {
    const { token, newPassword, confirmPassword } = request;
    return this.userService.completeAdminRegistration(token, {
      newPassword,
      confirmPassword,
    });
  }

  @Post('/auth/registration-completion/resend')
  @ApiTags('Authentication')
  @ApiOperation({
    summary: 'Resend administrator registration completion email',
  })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async resendAdminRegistration(@Body() request: EmailDTO) {
    return this.userService.resendAdminRegistration(request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Delete('/users/me')
  @ApiOperation({ summary: 'Deactivate the current user account' })
  @ApiBearerAuth('access-token')
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@GetCurrentUserId() userId: Types.ObjectId) {
    return this.userService.deactivateAccount(userId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.SYSTEM_ADMINISTRATOR)
  @Post('/admin/users/business-administrators')
  @ApiTags('Administration')
  @ApiOperation({ summary: 'Create a business administrator' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.CREATED, { model: UserSchema })
  @HttpCode(HttpStatus.CREATED)
  async createCompanyAdmin(
    @Body() request: CreateAdminDTO,
  ): Promise<Result<IUserResponse>> {
    return this.userService.createCompanyAdmin(request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @Post('/admin/users/restaurant-administrators')
  @ApiTags('Administration')
  @ApiOperation({ summary: 'Create a restaurant administrator' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.CREATED, { model: UserSchema })
  @HttpCode(HttpStatus.CREATED)
  async createRestaurantAdmin(
    @Body() request: CreateAdminDTO,
  ): Promise<Result<IUserResponse>> {
    return this.userService.createRestaurantAdmin(request);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get('/admin/users')
  @ApiTags('Administration')
  @ApiOperation({ summary: 'List users for administration' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK, { model: UserSchema, array: true })
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IUserResponse[]>> {
    return this.userService.getUsers(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.SYSTEM_ADMINISTRATOR)
  @Patch('/admin/users/:userId')
  @ApiTags('Administration')
  @ApiOperation({ summary: 'Update a user role or status' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK, { model: UserSchema })
  @mongoIdParam('userId')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('userId', ParseObjectIdPipe) userId: Types.ObjectId,
    @Body() request: AdminUpdateUserDTO,
  ) {
    return this.userService.adminUpdateUser(userId, request);
  }
}
