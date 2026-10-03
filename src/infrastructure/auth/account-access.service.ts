import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRepository } from '../data_access/repositories/user.repository';
import { UserStatus } from 'src/user/constants/constants';
import { User } from 'src/user/user';

@Injectable()
export class AccountAccessService {
  constructor(private readonly userRepository: UserRepository) {}

  async resolveActiveUser(userId: string): Promise<User | undefined> {
    if (!Types.ObjectId.isValid(userId)) {
      return undefined;
    }

    const result = await this.userRepository.getUserById(
      new Types.ObjectId(userId),
    );
    if (!result.isSuccess || result.getValue().status !== UserStatus.ACTIVE) {
      return undefined;
    }

    return result.getValue();
  }

  async isActive(userId: string): Promise<boolean> {
    return (await this.resolveActiveUser(userId)) !== undefined;
  }
}
