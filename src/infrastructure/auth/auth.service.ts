import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { throwApplicationError } from '../utilities/exception-instance';
import { Result } from './../../domain/result/result';
import {
  IJwtPayload,
  ISignUpTokens,
  IUserPayload,
} from './interfaces/auth.interface';
import { IAuthService } from './interfaces/auth-service.interface';
import { GenericDocumentRepository } from '../database/mongoDB/generic-document.repository';
import { User } from 'src/user/user';
import { createHash, randomUUID } from 'node:crypto';
import { UserStatus } from 'src/user/constants/constants';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAuthTokens(payload: IUserPayload): Promise<ISignUpTokens> {
    const { userId, email, role } = payload;
    const jwtPayload: IJwtPayload = {
      sub: userId,
      email,
      role,
      sid: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(jwtPayload),
      this.signRefreshToken(jwtPayload),
    ]);

    return {
      refreshToken,
      accessToken,
    };
  }

  protected async signAccessToken(jwtPayload: IJwtPayload): Promise<string> {
    return this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
      ),
    });
  }

  protected async signRefreshToken(jwtPayload: IJwtPayload): Promise<string> {
    return this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
      ),
    });
  }

  hashData(prop: string, saltRound: number): Promise<string> {
    return bcrypt.hash(prop, saltRound);
  }

  protected hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
  }

  async updateRefreshToken(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
    refreshToken: string,
  ): Promise<ISignUpTokens> {
    const result: Result<any> = await model.findById(userId);

    if (result.isSuccess === false) {
      throwApplicationError(HttpStatus.FORBIDDEN, 'Access denied');
    }
    const userEntity = await result.getValue();
    const { refreshTokenHash, role, email } = userEntity;
    if (
      userEntity.status !== UserStatus.ACTIVE ||
      typeof refreshTokenHash !== 'string'
    ) {
      throwApplicationError(HttpStatus.FORBIDDEN, 'Access denied');
    }

    const presentedTokenHash = this.hashRefreshToken(refreshToken);

    if (presentedTokenHash !== refreshTokenHash) {
      throwApplicationError(HttpStatus.FORBIDDEN, 'Access denied');
    }
    const payload = { userId, email, role };
    const newTokens = await this.generateAuthTokens(payload);
    const tokenHash = this.hashRefreshToken(newTokens.refreshToken);
    const updateResult = await model.findOneAndUpdate(
      {
        _id: userEntity.id,
        refreshTokenHash: presentedTokenHash,
        status: UserStatus.ACTIVE,
      },
      { refreshTokenHash: tokenHash },
    );

    if (!updateResult.isSuccess) {
      throwApplicationError(HttpStatus.FORBIDDEN, 'Access denied');
    }

    return newTokens;
  }

  async nullifyRefreshToken(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
  ) {
    const docResult: Result<any> = await model.findById(userId);

    if (docResult) {
      await model.findOneAndUpdate(
        {
          _id: userId,
        },
        { refreshTokenHash: null },
      );
    }
  }

  async logOut(
    model: GenericDocumentRepository<any, any>,
    userId: Types.ObjectId,
  ) {
    let result: Result<any> = await model.findById(userId);

    if (result.isSuccess === false) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'User does not exist');
    }
    const user = await result.getValue();
    if (
      result &&
      user.refreshTokenHash !== undefined &&
      user.refreshTokenHash !== null
    ) {
      result = await model.findOneAndUpdate(
        {
          _id: userId,
        },
        { refreshTokenHash: null },
      );
      if (result.isSuccess === false) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Unable to update data',
        );
      }
    }
  }

  public async generateVerificationToken(user: User): Promise<string> {
    const { id, email } = user;
    const jwtPayload = { sub: id.toString(), email };

    return this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_VERIFICATION_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_VERIFICATION_TOKEN_EXPIRATION_TIME',
      ),
    });
  }

  public async verifyToken(token: string): Promise<boolean> {
    try {
      await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_VERIFICATION_TOKEN_SECRET'),
      });
      return true;
    } catch {
      return false;
    }
  }

  public async getUserInfoFromToken(
    token: string,
  ): Promise<{ userId: string; email: string }> {
    const decoded = await this.jwtService.decode(token);
    return {
      userId: decoded.sub,
      email: decoded.email,
    };
  }
}
