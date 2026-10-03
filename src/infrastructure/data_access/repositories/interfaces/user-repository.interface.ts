import { User } from 'src/user/user';
import { UserDataModel } from '../schemas/user.schema';
import { ClientSession, FilterQuery, Types } from 'mongoose';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';
import { Result } from 'src/domain/result/result';

export interface IUserRepository extends IGenericDocument<User, UserDataModel> {
  createUser(
    userModel: UserDataModel,
    options?: { session?: ClientSession },
  ): Promise<Result<User>>;
  findByEmail(email: string): Promise<Result<User>>;
  getUserById(id: Types.ObjectId): Promise<Result<User>>;
  updateUser(
    filter: any,
    updateData: any,
    options?: { session?: ClientSession },
  ): Promise<Result<User>>;
  getUsers(filterQuery: FilterQuery<User>): Promise<Result<User[]>>;
}
