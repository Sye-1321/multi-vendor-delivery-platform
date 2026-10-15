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
      if (!tokens?.accessToken) {
        throw new Error('Access token is required for a signed-in response');
      }
      userResponse = {
        ...userResponse,
        tokenExpiresIn: this.getAccessTokenLifetime(tokens.accessToken),
      };
    }
    return userResponse;
  }

  private static getAccessTokenLifetime(accessToken: string): number {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
    ) as { exp: number; iat: number };

    if (
      !Number.isFinite(payload.iat) ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= payload.iat
    ) {
      throw new Error('Access token has invalid expiration claims');
    }

    return (payload.exp - payload.iat) * 1000;
  }

  static usersResponse(users: User[]): IUserResponseDTO[] {
    const usersResponse: IUserResponseDTO[] = [];
    for (const user of users) {
      usersResponse.push(this.createUserResponse(user));
    }
    return usersResponse;
  }
}
