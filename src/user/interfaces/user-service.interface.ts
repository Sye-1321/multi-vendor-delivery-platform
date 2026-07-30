import { Types } from 'mongoose';
import {
  IUserSignedInResponseDTO,
  IUserResponse,
} from './user-response.interface';
import { User } from '../user';
import { CreateUserDTO } from '../dtos/user/create-user.dto';
import { Result } from 'src/domain/result/result';
import { CreateAdminDTO } from '../dtos/user/create-admin.dto';
import { LoginDTO } from '../dtos/auth/login.dto';
import { UpdateUserProfileDTO } from '../dtos/user/update-profile.dto';
import { UpdatePasswordDTO } from '../dtos/auth/update-password.dto';
import { ChangeEmailDTO } from '../dtos/auth/change-email.dto';
import { EmailDTO } from '../dtos/shared/email.dto';
import { ResetPasswordDTO } from '../dtos/auth/reset-password.dto';
import { AdminUpdateUserDTO } from '../dtos/user/admin-update-user.dto';
import { Role } from 'src/application/constants/constants';
import { ISignUpTokens } from 'src/infrastructure/auth/interfaces/auth.interface';

export interface IUserService {
  createEndUser(props: CreateUserDTO): Promise<Result<IUserResponse>>;
  createCompanyAdmin(props: CreateAdminDTO): Promise<Result<IUserResponse>>;
  createRestaurantAdmin(props: CreateAdminDTO): Promise<Result<IUserResponse>>;
  verifyEmail(token: string): Promise<Result<IUserResponse>>;
  signIn(props: LoginDTO): Promise<Result<IUserSignedInResponseDTO>>;
  signOut(userId: Types.ObjectId): Promise<Result<void>>;
  getAccessTokenAndUpdateRefreshToken(
    userId: Types.ObjectId,
    refreshToken: string,
  ): Promise<Result<ISignUpTokens>>;
  getUserById(userId: Types.ObjectId): Promise<Result<IUserResponse>>;
  updateProfile(
    userId: Types.ObjectId,
    props: UpdateUserProfileDTO,
  ): Promise<Result<IUserResponse>>;
  updatePassword(
    userId: Types.ObjectId,
    props: UpdatePasswordDTO,
  ): Promise<Result<IUserResponse>>;
  requestToChangeEmail(
    userId: Types.ObjectId,
    props: ChangeEmailDTO,
  ): Promise<Result<void>>;
  deactivateAccount(userId: Types.ObjectId): Promise<Result<void>>;
  verifyNewEmail(token: string): Promise<Result<void>>;
  requestToResetPassword(props: EmailDTO): Promise<Result<void>>;
  confirmPasswordReset(
    token: string,
    props: ResetPasswordDTO,
  ): Promise<Result<void>>;
  getUsers(): Promise<Result<IUserResponse[]>>;
  adminUpdateUser(
    userId: Types.ObjectId,
    props: AdminUpdateUserDTO,
  ): Promise<Result<IUserResponse>>;
  suspendUser(userId: Types.ObjectId): Promise<Result<void>>;
  getContextUser(): Promise<User>;
  createAdmin(props: CreateAdminDTO, role: Role): Promise<User>;
}
