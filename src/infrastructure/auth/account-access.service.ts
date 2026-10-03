import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRepository } from '../data_access/repositories/user.repository';
import { UserStatus } from 'src/user/constants/constants';

@Injectable()
export class AccountAccessService {
  constructor(private readonly userRepository: UserRepository) {}

  async isActive(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      return false;
    }

    const result = await this.userRepository.getUserById(
      new Types.ObjectId(userId),
    );
    return result.isSuccess && result.getValue().status === UserStatus.ACTIVE;
  }
}
