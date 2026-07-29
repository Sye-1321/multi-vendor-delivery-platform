import { AuthService } from '../infrastructure/auth/auth.service';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UserRepository } from '../infrastructure/data_access/repositories/user.repository';
import { saltRounds, Role } from '../application/constants/constants';
import { TYPES } from '../application/constants/types';
import { Audit } from '../domain/audit/audit';
import { Result } from '../domain/result/result';
import {
  ISignUpTokens,
  IUserPayload,
} from '../infrastructure/auth/interfaces/auth.interface';
import { throwApplicationError } from '../infrastructure/utilities/exception-instance';
import { User } from './user';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from './constants/constants';
import {
  IUserResponse,
  IUserSignedInResponseDTO,
} from './interfaces/user-response.interface';
import { IEmailService } from 'src/infrastructure/email/interfaces/email-service.interface';
import { UserParser } from './user.parser';
import { UserMapper } from './user.mapper';
import { IUserService } from './interfaces/user-service.interface';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { Context } from 'src/infrastructure/context/context';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { UserFactory } from './factories/user-factory';
import { UpdateUserProfileDTO } from './dtos/user/update-profile.dto';
import { UpdatePasswordDTO } from './dtos/auth/update-password.dto';
import { ChangeEmailDTO } from './dtos/auth/change-email.dto';
import { EmailDTO } from './dtos/shared/email.dto';
import { ResetPasswordDTO } from './dtos/auth/reset-password.dto';
import { AdminUpdateUserDTO } from './dtos/user/admin-update-user.dto';
import { CreateAdminDTO } from './dtos/user/create-admin.dto';
import { CreateUserDTO } from './dtos/user/create-user.dto';
import { LoginDTO } from './dtos/auth/login.dto';

@Injectable()
export class UserService extends AuthService implements IUserService {
  constructor(
    jwtService: JwtService,
    configService: ConfigService,
    @Inject(TYPES.IEmailService) private readonly emailService: IEmailService,
    private readonly userMapper: UserMapper,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    private readonly userRepository: UserRepository,
  ) {
    super(jwtService, configService);
  }

  async createEndUser(props: CreateUserDTO): Promise<Result<IUserResponse>> {
    const endUser = await this.createUser(props, Role.END_USER);
    const emailResult =
      await this.emailService.sendAccountVerificationEmail(endUser);
    if (!emailResult.isSuccess) {
      throwApplicationError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'Failed to send verification email.',
      );
    }
    return Result.ok(
      UserParser.createUserResponse(endUser),
      'Registration completed. A verification link has been sent to your email. Please verify to activate your account.',
    );
  }

  async createCompanyAdmin(
    props: CreateAdminDTO,
  ): Promise<Result<IUserResponse>> {
    const companyAdmin = await this.createAdmin(
      props,
      Role.BUSINESS_ADMINISTRATOR,
    );
    return Result.ok(UserParser.createUserResponse(companyAdmin));
  }

  async createRestaurantAdmin(
    props: CreateAdminDTO,
  ): Promise<Result<IUserResponse>> {
    const restaurantAdmin = await this.createAdmin(
      props,
      Role.RESTAURANT_ADMINISTRATOR,
    );
    return Result.ok(UserParser.createUserResponse(restaurantAdmin));
  }

  async verifyEmail(token: string): Promise<Result<IUserResponse>> {
    const { userId, email } = await this.validateTokenAndExtractUserInfo(token);
    const user = await this.getUser(userId);
    const context: Context = new Context(email);
    const activatedUser: User = await this.updateUser(
      userId,
      { status: UserStatus.ACTIVE },
      user,
      context,
    );
    return Result.ok(
      UserParser.createUserResponse(activatedUser),
      'Email verified. Your account is now active.',
    );
  }

  async signIn(props: LoginDTO): Promise<Result<IUserSignedInResponseDTO>> {
    const userResult = await this.userRepository.findByEmail(props.email);
    if (!userResult.isSuccess) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'Invalid email or password.',
      );
    }
    const user: User = userResult.getValue();
    if (user.status !== UserStatus.ACTIVE) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        'Account inactive. Please verify your email or contact support.',
      );
    }

    const comparePassWord: boolean = await bcrypt.compare(
      props.password,
      user.passwordHash,
    );
    if (!comparePassWord) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'Invalid email or password.',
      );
    }

    const { id, email, role } = user;
    const userProps: IUserPayload = { userId: id, email, role: role as string };
    const tokens = await this.generateAuthTokens(userProps);
    this.updateUserRefreshToken(user, tokens);
    return Result.ok(
      UserParser.createUserResponse(user, tokens, true),
      'Login successful.',
    );
  }

  async signOut(userId: Types.ObjectId): Promise<Result<void>> {
    await this.logOutUser(this.userRepository, userId);
    return Result.ok<void>(undefined, 'Logout successful.');
  }

  async getAccessTokenAndUpdateRefreshToken(
    userId: Types.ObjectId,
    refreshToken: string,
  ): Promise<Result<{ accessToken: string }>> {
    const tokens = await this.refreshUserToken(
      this.userRepository,
      userId,
      refreshToken,
    );
    if (!tokens || !tokens.accessToken) {
      throwApplicationError(HttpStatus.UNAUTHORIZED, 'Invalid refresh token.');
    }
    return Result.ok(
      { accessToken: tokens.accessToken },
      'Access token refreshed successfully.',
    );
  }

  async getUserById(userId: Types.ObjectId): Promise<Result<IUserResponse>> {
    const user = await this.authorizeSelfAccess(userId);
    return Result.ok(UserParser.createUserResponse(user));
  }

  async updateProfile(
    userId: Types.ObjectId,
    props: UpdateUserProfileDTO,
  ): Promise<Result<IUserResponse>> {
    const user = await this.authorizeSelfAccess(userId);
    const context: Context = this.contextService.getContext();
    const updatedUser: User = await this.updateUser(
      userId,
      props,
      user,
      context,
    );
    return Result.ok(UserParser.createUserResponse(updatedUser));
  }

  async updatePassword(
    userId: Types.ObjectId,
    props: UpdatePasswordDTO,
  ): Promise<Result<IUserResponse>> {
    const context: Context = this.contextService.getContext();
    const user = await this.authorizeSelfAccess(userId);
    const comparePassWord: boolean = await bcrypt.compare(
      props.currentPassword,
      user.passwordHash,
    );
    if (!comparePassWord) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'Current password is incorrect.',
      );
    }
    const hashedPassword = await this.hashData(props.newPassword, saltRounds);
    const updatedUser = await this.updateUser(
      userId,
      { passwordHash: hashedPassword },
      user,
      context,
    );
    return Result.ok(UserParser.createUserResponse(updatedUser));
  }

  async requestToChangeEmail(
    userId: Types.ObjectId,
    props: ChangeEmailDTO,
  ): Promise<Result<void>> {
    const user = await this.authorizeSelfAccess(userId);
    const existingUser: Result<User> = await this.userRepository.findByEmail(
      props.newEmail,
    );
    if (existingUser.isSuccess) {
      throwApplicationError(
        HttpStatus.CONFLICT,
        'Email is already in use by another account.',
      );
    }
    const comparePassWord: boolean = await bcrypt.compare(
      props.currentPassword,
      user.passwordHash,
    );
    if (!comparePassWord) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'Current password is incorrect.',
      );
    }
    user.email = props.newEmail;
    await this.emailService.sendEmailChangeConfirmationEmail(
      user,
      props.newEmail,
    );
    return Result.ok<void>(
      undefined,
      'A confirmation email has been sent to the new address. Please verify to proceed.',
    );
  }

  async deactivateAccount(userId: Types.ObjectId): Promise<Result<void>> {
    const context: Context = this.contextService.getContext();
    const user = await this.authorizeSelfAccess(userId);
    await this.updateUser(
      userId,
      { status: UserStatus.INACTIVE },
      user,
      context,
    );
    return Result.ok<void>(
      undefined,
      'Your account has been successfully deactivated.',
    );
  }

  async verifyNewEmail(token: string): Promise<Result<void>> {
    const { userId, email } = await this.validateTokenAndExtractUserInfo(token);
    const user = await this.getUser(new Types.ObjectId(userId));
    const context: Context = new Context(email);
    await this.updateUser(userId, { email: email }, user, context);
    return Result.ok<void>(undefined, 'Email address successfully updated.');
  }

  async requestToResetPassword(props: EmailDTO): Promise<Result<void>> {
    const user = await this.userRepository.findByEmail(props.email);
    if (!user.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_FOUND,
        'No active account found for the provided email.',
      );
    }
    const emailResult =
      await this.emailService.sendPasswordResetInstructionsEmail(
        user.getValue(),
      );
    if (!emailResult.isSuccess) {
      throwApplicationError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'Failed to send password reset instructions.',
      );
    }
    return Result.ok<void>(
      undefined,
      'Instructions to reset your password have been sent to your email.',
    );
  }

  async confirmPasswordReset(
    token: string,
    props: ResetPasswordDTO,
  ): Promise<Result<void>> {
    const { userId, email } = await this.validateTokenAndExtractUserInfo(token);
    const user = await this.getUser(userId);
    const context: Context = new Context(email);
    const hashedPassword = await this.hashData(props.newPassword, saltRounds);
    await this.updateUser(
      userId,
      { passwordHash: hashedPassword },
      user,
      context,
    );
    return Result.ok<void>(
      undefined,
      'Your password has been successfully updated.',
    );
  }

  async getUsers(): Promise<Result<IUserResponse[]>> {
    const users = await this.userRepository.getUsers({ role: Role.END_USER });
    if (!users.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Unable to retrieve user list.',
      );
    }
    return Result.ok(UserParser.usersResponse(users.getValue()));
  }

  async adminUpdateUser(
    userId: Types.ObjectId,
    props: AdminUpdateUserDTO,
  ): Promise<Result<IUserResponse>> {
    const context: Context = this.contextService.getContext();
    const user = await this.getUser(new Types.ObjectId(userId));
    const updatedUser: User = await this.updateUser(
      userId,
      props,
      user,
      context,
    );
    return Result.ok(UserParser.createUserResponse(updatedUser));
  }

  async suspendUser(userId: Types.ObjectId): Promise<Result<void>> {
    const context: Context = this.contextService.getContext();
    const user = await this.getUser(new Types.ObjectId(userId));
    await this.updateUser(
      userId,
      { status: UserStatus.SUSPENDED },
      user,
      context,
    );
    return Result.ok<void>(
      undefined,
      'User account has been successfully suspended.',
    );
  }

  async createAdmin(props: CreateAdminDTO, role: Role): Promise<User> {
    const admin = await this.createUser(props, role);
    const emailResult =
      await this.emailService.sendAccountVerificationEmail(admin);
    if (!emailResult.isSuccess) {
      throwApplicationError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'Unable to send account verification email. Please try again later.',
      );
    }
    return admin;
  }

  private async createUser(
    props: CreateUserDTO | CreateAdminDTO,
    role: Role,
  ): Promise<User> {
    const existingUser: Result<User> = await this.userRepository.findByEmail(
      props.email,
    );
    if (
      existingUser.isSuccess &&
      existingUser.getValue().email === props.email
    ) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        `User already exists, sign in.`,
      );
    }
    const password =
      role === Role.END_USER && 'password' in props
        ? props.password
        : 'password';
    const hashedPassword = await this.hashData(password, saltRounds);
    const user = UserFactory.createUser(props, role, hashedPassword);
    const userModel = this.userMapper.toPersistence(user);
    const userDoc = await this.userRepository.createUser(userModel);
    if (!userDoc.isSuccess) {
      throwApplicationError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'Error while creating user',
      );
    }
    return userDoc.getValue();
  }

  private async validateTokenAndExtractUserInfo(
    token: string,
  ): Promise<{ userId: Types.ObjectId; email: string }> {
    const isTokenValid = await this.verifyToken(token);
    if (!isTokenValid) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Invalid or expired token');
    }
    const userInfo = await this.getUserInfoFromToken(token);
    const { userId, email } = userInfo;
    return { userId: new Types.ObjectId(userId), email };
  }

  private async updateUser<T extends object>(
    userId: Types.ObjectId,
    props: T,
    user: User,
    context: Context,
  ): Promise<User> {
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      ...props,
    };

    this.updateUserData(data, user, context);
    const updatedUser: User = await this.updateUserById(userId, data);
    return updatedUser;
  }

  updateUserData(data: any, user: User, context: Context) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in user) {
        (user as any)[key] = value;
      }
    });

    Audit.updateContext(context.email, user);
  }

  private async updateUserById(userId: Types.ObjectId, data: any) {
    const updatedUserResult = await this.userRepository.updateUser(
      { _id: userId },
      data,
    );
    if (!updatedUserResult.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_MODIFIED,
        'User could not be updated',
      );
    }
    return updatedUserResult.getValue();
  }

  private async updateUserRefreshToken(
    user: User,
    token: ISignUpTokens,
  ): Promise<User> {
    const hash = await this.hashData(token.refreshToken, saltRounds);
    const updatedUser: User = await this.updateUserById(user.id, {
      refreshTokenHash: hash,
    });
    return updatedUser;
  }

  private async refreshUserToken(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    return await this.updateRefreshToken(model, userId, refreshToken);
  }

  private async logOutUser(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
  ): Promise<void> {
    return this.logOut(model, userId);
  }

  private async getUser(userId: Types.ObjectId): Promise<User> {
    const userResult = await this.userRepository.getUserById(userId);
    if (!userResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'User does not exist');
    }
    return userResult.getValue();
  }

  async getContextUser(): Promise<User> {
    const context: Context = this.contextService.getContext();
    const userResult = await this.userRepository.findByEmail(context.email);
    if (!userResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'User does not exist');
    }
    return userResult.getValue();
  }

  private async authorizeSelfAccess(userId: Types.ObjectId): Promise<User> {
    const context: Context = this.contextService.getContext();
    const user = await this.getUser(new Types.ObjectId(userId));
    if (context.email.toString() !== user.email.toString()) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        'You don’t have sufficient privilege',
      );
    }
    return user;
  }
}
