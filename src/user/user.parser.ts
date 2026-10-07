import { tokenExpiresIn } from '../application/constants/constants';
import { ISignUpTokens } from '../infrastructure/auth/interfaces/auth.interface';
import { AuditParser } from '../audit/audit.parser';
import { User } from './user';
import {
  IPublicUserResponse,
  IUserResponse,
  IUserSignedInResponseDTO,
} from './interfaces/user-response.interface';

export type IUserResponseDTO = IUserResponse | IUserSignedInResponseDTO;

export class UserParser {
  static createPublicUserResponse(user: User): IPublicUserResponse {
    return {
      id: user.id,
      name: user.name,
    };
  }

  static createUserResponse(
    user: User,
    tokens?: ISignUpTokens,
    signedIn = false,
  ): IUserResponseDTO {
    let userResponse: IUserResponse | IUserSignedInResponseDTO = {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role as string,
      savedAddress: user.savedAddress,
      status: user.status as string,
      tokens,
      ...AuditParser.createAuditResponse(user.audit),
    };
    if (signedIn) {
      userResponse = {
        ...userResponse,
        tokenExpiresIn,
      };
    }
    return userResponse;
  }

  static usersResponse(users: User[]): IUserResponseDTO[] {
    const usersResponse: IUserResponseDTO[] = [];
    for (const user of users) {
      usersResponse.push(this.createUserResponse(user));
    }
    return usersResponse;
  }
}
